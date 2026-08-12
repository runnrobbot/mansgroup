// Supabase Edge Function — Sakurupiah Webhook / Callback
// Handles payment status callbacks from Sakurupiah
// Validates signature and updates payment record

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_KEY = Deno.env.get('SAKURUPIAH_API_KEY') ?? 'KEY-DEVzQZbGLri6QCdjXa9Sy2iiFC93k'

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-callback-signature, x-callback-event',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Get raw body for signature verification
    const rawBody = await req.text()
    const callbackData = JSON.parse(rawBody)

    // 2. Verify X-Callback-Signature
    const callbackSignature = req.headers.get('x-callback-signature') || ''
    const expectedSignature = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(API_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key =>
      crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
    ).then(buf =>
      Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    )

    if (callbackSignature !== expectedSignature) {
      console.error('[Sakurupiah Webhook] Invalid signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Verify X-Callback-Event
    const callbackEvent = req.headers.get('x-callback-event') || ''
    if (callbackEvent !== 'payment_status') {
      console.log('[Sakurupiah Webhook] Ignoring non-payment event:', callbackEvent)
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Parse callback data
    const {
      trx_id,
      merchant_ref,
      status,           // 'berhasil', 'expired', 'pending'
      status_kode,      // 1 = berhasil, 2 = expired, 0 = pending
    } = callbackData

    console.log('[Sakurupiah Webhook] Received:', { trx_id, merchant_ref, status, status_kode })

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find payment record by sakurupiah_trx_id or sakurupiah_ref
    let paymentRecord = null

    if (trx_id) {
      const { data } = await supabase
        .from('payments')
        .select('*, loans(user_id), gadai_applications(user_id)')
        .eq('sakurupiah_trx_id', trx_id)
        .single()
      paymentRecord = data
    }

    if (!paymentRecord && merchant_ref) {
      const { data } = await supabase
        .from('payments')
        .select('*, loans(user_id), gadai_applications(user_id)')
        .eq('sakurupiah_ref', merchant_ref)
        .single()
      paymentRecord = data
    }

    if (!paymentRecord) {
      // Return 200 so Sakurupiah doesn't keep retrying
      console.log('[Sakurupiah Webhook] Payment record not found, ignoring:', { trx_id, merchant_ref })
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Map Sakurupiah status to our status
    // status_kode: 1 = berhasil, 2 = expired, 0 = pending
    // status string: 'berhasil', 'expired', 'pending'
    let ourStatus = 'pending'
    const kode = String(status_kode ?? '')
    if (kode === '1' || status === 'berhasil') {
      ourStatus = 'settlement'
    } else if (kode === '2' || status === 'expired') {
      ourStatus = 'expire'
    }

    // 6. Update payment record
    await supabase
      .from('payments')
      .update({
        status: ourStatus,
        sakurupiah_status: status,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id)

    // 7. If payment successful, update loan/gadai status
    if (ourStatus === 'settlement') {
      // Update loan schedule if this is a loan payment
      if (paymentRecord.loan_id) {
        // Get the pending schedule for this loan
        const { data: schedules } = await supabase
          .from('loan_schedules')
          .select('*')
          .eq('loan_id', paymentRecord.loan_id)
          .eq('status', 'pending')
          .order('month', { ascending: true })
          .limit(1)

        if (schedules?.length > 0) {
          await supabase
            .from('loan_schedules')
            .update({
              status: 'paid',
              paid_amount: paymentRecord.amount,
              paid_at: new Date().toISOString(),
            })
            .eq('id', schedules[0].id)

          // Check if all schedules are paid
          const { data: allSchedules } = await supabase
            .from('loan_schedules')
            .select('id')
            .eq('loan_id', paymentRecord.loan_id)
            .eq('status', 'pending')

          if (!allSchedules?.length) {
            // All paid — mark loan as completed
            await supabase
              .from('loans')
              .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', paymentRecord.loan_id)
          }
        }
      }

      // Send notification to user
      const userId = paymentRecord.user_id ||
        paymentRecord.loans?.user_id ||
        paymentRecord.gadai_applications?.user_id

      if (userId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'repayment_confirmation',
            title: 'Pembayaran Berhasil!',
            message: `Pembayaran sebesar Rp ${paymentRecord.amount?.toLocaleString('id-ID')} telah kami terima. Terima kasih!`,
            is_read: false,
            created_at: new Date().toISOString(),
          })
      }
    }

    console.log('[Sakurupiah Webhook] Processed successfully:', paymentRecord.id, '→', ourStatus)

    // 8. Return success
    return new Response(JSON.stringify({ status: 'success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[Sakurupiah Webhook] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
