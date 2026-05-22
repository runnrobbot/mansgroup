// supabase/functions/midtrans-webhook/index.ts
//
// Webhook handler untuk notifikasi pembayaran dari Midtrans.
// Midtrans akan POST ke endpoint ini setiap kali status transaksi berubah.
//
// Set webhook URL di dashboard Midtrans:
//   https://<project-ref>.supabase.co/functions/v1/midtrans-webhook
//
// Deploy:
//   supabase functions deploy midtrans-webhook --no-verify-jwt
//   (no-verify-jwt karena Midtrans tidak kirim JWT)
//
// Set secrets (sama dengan midtrans-snap):
//   supabase secrets set MIDTRANS_SERVER_KEY="Mid-server-XXXXXX"
//
// Cara verify signature:
//   sha512(order_id + status_code + gross_amount + server_key)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Map Midtrans transaction_status → status di tabel payments
function mapStatus(midtransStatus: string, fraudStatus?: string): string {
  // settlement = sudah diterima dananya (final)
  // capture + fraud accept = settled untuk kartu kredit
  // pending = nunggu user bayar (VA, e-wallet)
  // deny / cancel / expire / failure = gagal
  if (midtransStatus === 'capture') {
    return fraudStatus === 'accept' ? 'settlement' : 'verification'
  }
  if (midtransStatus === 'settlement') return 'settlement'
  if (midtransStatus === 'pending') return 'verification'
  if (midtransStatus === 'deny') return 'failed'
  if (midtransStatus === 'cancel') return 'cancel'
  if (midtransStatus === 'expire') return 'expire'
  if (midtransStatus === 'failure') return 'failed'
  if (midtransStatus === 'refund' || midtransStatus === 'partial_refund') return 'refunded'
  return 'verification'
}

async function sha512(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-512', buf)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!serverKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ message: 'Server tidak terkonfigurasi dengan benar' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json()
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      transaction_id,
      payment_type,
      fraud_status,
    } = body

    // 1. Verifikasi signature — pastikan request memang dari Midtrans
    const expected = await sha512(`${order_id}${status_code}${gross_amount}${serverKey}`)
    if (expected !== signature_key) {
      console.error('Invalid signature for order:', order_id)
      return new Response(JSON.stringify({ message: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Update payment record di Supabase
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const newStatus = mapStatus(transaction_status, fraud_status)

    const { data: updated, error } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        midtrans_status: transaction_status,
        midtrans_transaction_id: transaction_id,
        midtrans_payment_type: payment_type,
        updated_at: new Date().toISOString(),
      })
      .eq('midtrans_order_id', order_id)
      .select('id, user_id, loan_id, amount')
      .single()

    if (error) {
      console.error('DB update error:', error)
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Kalau settled, optionally update loan remaining_amount + send notification
    if (['settlement'].includes(newStatus) && updated?.loan_id) {
      // Recompute remaining: total_repayment - sum(confirmed payments)
      const { data: loan } = await supabase
        .from('loans')
        .select('total_repayment, remaining_amount')
        .eq('id', updated.loan_id)
        .single()

      if (loan) {
        const { data: confirmedPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('loan_id', updated.loan_id)
          .in('status', ['settlement', 'capture', 'confirmed'])

        const totalPaid = (confirmedPayments || []).reduce(
          (s: number, p: { amount: number }) => s + (p.amount || 0),
          0,
        )
        const newRemaining = Math.max(0, (loan.total_repayment || 0) - totalPaid)

        const updates: Record<string, unknown> = { remaining_amount: newRemaining }
        if (newRemaining === 0) {
          updates.status = 'completed'
          updates.completed_at = new Date().toISOString()
        }

        await supabase.from('loans').update(updates).eq('id', updated.loan_id)
      }

      // Send notification ke user
      await supabase.from('notifications').insert({
        user_id: updated.user_id,
        type: 'payment',
        title: 'Pembayaran Berhasil',
        message: `Pembayaran sebesar Rp ${updated.amount.toLocaleString('id-ID')} telah diterima. Terima kasih!`,
      })
    }

    return new Response(JSON.stringify({ message: 'OK', status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('webhook error:', err)
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
