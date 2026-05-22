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
//
// Set secrets:
//   supabase secrets set MIDTRANS_SERVER_KEY="Mid-server-XXXXXX"
//
// ── BUG FIX HISTORY ─────────────────────────────────────────────────────────
// 1. Webhook lama `.select('id, user_id, loan_id, amount')` tidak include
//    gadai_id → gadai tidak pernah ter-sync. SEKARANG include gadai_id.
// 2. Recompute pakai effective_total_repayment (hormati approved_amount /
//    suggested_amount yang sudah di-rekalkulasi admin), bukan blind pakai
//    field total_repayment.
// 3. Idempotent — webhook bisa dipanggil berkali-kali tanpa double-count
//    karena selalu recompute dari sum(payments) terbaru.
// 4. Skip update kalau remaining sama (mengurangi realtime echo yang
//    memicu reload client tanpa perlu).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Map Midtrans transaction_status → status di tabel payments
function mapStatus(midtransStatus: string, fraudStatus?: string): string {
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

const CONFIRMED_STATUSES = ['settlement', 'capture', 'confirmed']

/**
 * Hitung effective total_repayment: hormati revisi staff (suggested_amount)
 * yang belum di-approve admin (approved_amount). Persis sama logikanya dengan
 * getEffectiveLoanNumbers di client (src/lib/utils.js) untuk konsistensi.
 *
 * Untuk loan:
 *   - Kalau total_repayment di DB sudah > 0 → pakai itu (sudah di-rekalkulasi admin)
 *   - Kalau approved_amount/suggested_amount berbeda dari amount asli dan total_repayment
 *     belum disesuaikan, hitung ulang: principal*(1+0.05*tenor)
 */
function effectiveLoanTotalRepayment(loan: Record<string, unknown>): number {
  const amount = Number(loan.amount) || 0
  const approved = loan.approved_amount != null ? Number(loan.approved_amount) : null
  const suggested = loan.suggested_amount != null ? Number(loan.suggested_amount) : null
  const effective = approved ?? suggested ?? amount
  const tenor = Number(loan.tenor) || 0
  const dbTotal = Number(loan.total_repayment) || 0

  // Kalau effective = amount asli (tidak direvisi), pakai dbTotal langsung
  if (effective === amount) return dbTotal

  // Recalc: bunga 5% per bulan flat
  const interestRate = 0.05
  const recalc = effective + effective * interestRate * tenor

  // Kalau dbTotal sudah disesuaikan ke effective (admin sudah approve & rekalkulasi),
  // dbTotal ≈ recalc. Toleransi 2 untuk pembulatan.
  if (Math.abs(dbTotal - recalc) < 2) return dbTotal

  // Pakai recalc kalau dbTotal belum disesuaikan
  return Math.ceil(recalc)
}

function effectiveGadaiTotalRepayment(gadai: Record<string, unknown>): number {
  const loanAmount = Number(gadai.loan_amount) || 0
  const approved = gadai.approved_amount != null ? Number(gadai.approved_amount) : null
  const suggested = gadai.suggested_amount != null ? Number(gadai.suggested_amount) : null
  const effective = approved ?? suggested ?? loanAmount
  const dbTotal = Number(gadai.total_repayment) || 0

  if (effective === loanAmount) return dbTotal

  // Gadai interest 10% one-time (sesuai MANSGADAI_CONFIG)
  const interestRate = 0.10
  const recalc = effective + effective * interestRate

  if (Math.abs(dbTotal - recalc) < 2) return dbTotal
  return Math.ceil(recalc)
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

    // 1. Verify signature
    const expected = await sha512(`${order_id}${status_code}${gross_amount}${serverKey}`)
    if (expected !== signature_key) {
      console.error('Invalid signature for order:', order_id)
      return new Response(JSON.stringify({ message: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const newStatus = mapStatus(transaction_status, fraud_status)

    // 2. Update payment record — IMPORTANT: include gadai_id dalam .select()
    // (bug lama: gadai_id tidak ada di select → gadai tidak pernah ter-sync)
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
      .select('id, user_id, loan_id, gadai_id, amount')
      .single()

    if (error) {
      console.error('DB update error:', error)
      return new Response(JSON.stringify({ message: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Kalau settled, recompute remaining loan/gadai. IDEMPOTEN: tidak pakai
    // delta paidAmount; selalu re-sum dari payments table.
    if (newStatus === 'settlement' && updated?.loan_id) {
      const { data: loan } = await supabase
        .from('loans')
        .select('*')
        .eq('id', updated.loan_id)
        .single()

      if (loan && loan.status !== 'completed') {
        const { data: confirmedPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('loan_id', updated.loan_id)
          .in('status', CONFIRMED_STATUSES)

        const totalPaid = (confirmedPayments || []).reduce(
          (s: number, p: { amount: number }) => s + (Number(p.amount) || 0),
          0,
        )
        const totalRepayment = effectiveLoanTotalRepayment(loan)
        const newRemaining = Math.max(0, totalRepayment - totalPaid)
        const currentRemaining = Number(loan.remaining_amount) || 0

        // Skip kalau tidak ada perubahan — hindari realtime echo
        const willUpdateRemaining = currentRemaining !== newRemaining
        const willCompleteNow = newRemaining === 0 && totalRepayment > 0

        if (willUpdateRemaining || willCompleteNow) {
          const loanUpdates: Record<string, unknown> = {
            remaining_amount: newRemaining,
            updated_at: new Date().toISOString(),
          }
          if (willCompleteNow) {
            loanUpdates.status = 'completed'
            loanUpdates.completed_at = new Date().toISOString()
          }
          await supabase.from('loans').update(loanUpdates).eq('id', updated.loan_id)
        }
      }

      // Send notification
      if (updated.user_id) {
        await supabase.from('notifications').insert({
          user_id: updated.user_id,
          type: 'payment',
          title: 'Pembayaran Berhasil',
          message: `Pembayaran sebesar Rp ${(updated.amount || 0).toLocaleString('id-ID')} telah diterima. Terima kasih!`,
          is_read: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    // 4. Gadai settled → update status kalau lunas
    if (newStatus === 'settlement' && updated?.gadai_id) {
      const { data: gadai } = await supabase
        .from('gadai_applications')
        .select('*')
        .eq('id', updated.gadai_id)
        .single()

      if (gadai && !['completed', 'forfeited', 'rejected'].includes(gadai.status)) {
        const { data: confirmedGadaiPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('gadai_id', updated.gadai_id)
          .in('status', CONFIRMED_STATUSES)

        const totalPaidGadai = (confirmedGadaiPayments || []).reduce(
          (s: number, p: { amount: number }) => s + (Number(p.amount) || 0),
          0,
        )
        const totalRepaymentGadai = effectiveGadaiTotalRepayment(gadai)
        const gadaiRemaining = Math.max(0, totalRepaymentGadai - totalPaidGadai)

        if (gadaiRemaining === 0 && totalRepaymentGadai > 0) {
          await supabase
            .from('gadai_applications')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', updated.gadai_id)
        }
      }

      // Send notifikasi
      if (updated.user_id) {
        await supabase.from('notifications').insert({
          user_id: updated.user_id,
          type: 'payment',
          title: 'Pembayaran Gadai Berhasil',
          message: `Pembayaran gadai sebesar Rp ${(updated.amount || 0).toLocaleString('id-ID')} telah diterima.`,
          is_read: false,
          created_at: new Date().toISOString(),
        })
      }
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