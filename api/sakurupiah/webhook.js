// Vercel API Route — Sakurupiah Webhook / Callback
// Handles payment status callbacks from Sakurupiah
// Validates signature and updates payment record

const API_KEY = process.env.SAKURUPIAH_API_KEY
const WEBHOOK_SECRET = process.env.SAKURUPIAH_WEBHOOK_SECRET
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-callback-signature, x-callback-event')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  try {
    // 1. Read raw body for signature verification
    const rawBody = await new Promise((resolve, reject) => {
      let data = ''
      req.on('data', chunk => { data += chunk })
      req.on('end', () => resolve(data))
      req.on('error', reject)
    })

    // 2. Parse JSON
    let callbackData
    try {
      callbackData = JSON.parse(rawBody)
    } catch {
      callbackData = {}
    }

    // 3. Verify webhook secret OR HMAC signature
    const callbackSig = req.headers['x-callback-signature'] || ''
    const callbackEvent = req.headers['x-callback-event'] || ''

    if (WEBHOOK_SECRET && callbackSig !== WEBHOOK_SECRET) {
      console.error('[Sakurupiah Webhook] Invalid secret')
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!WEBHOOK_SECRET && callbackSig && API_KEY) {
      const expectedSig = await crypto.subtle.importKey(
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
      if (callbackSig !== expectedSig) {
        console.error('[Sakurupiah Webhook] Signature mismatch')
        return res.status(403).json({ error: 'Invalid signature' })
      }
    }

    // 4. Verify event type
    if (callbackEvent && callbackEvent !== 'payment_status') {
      console.log('[Sakurupiah Webhook] Ignoring:', callbackEvent)
      return res.status(200).json({ status: 'ignored' })
    }

    // 5. Extract data
    const { trx_id, merchant_ref, status, status_kode } = callbackData
    console.log('[Sakurupiah Webhook]', { trx_id, merchant_ref, status, status_kode })

    // 6. Find payment record
    const supabase = await getSupabase()
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
      console.log('[Sakurupiah Webhook] Record not found:', { trx_id, merchant_ref })
      return res.status(200).json({ status: 'ignored' })
    }

    // 7. Map status
    let ourStatus = 'pending'
    const kode = String(status_kode ?? '')
    if (kode === '1' || status === 'berhasil') {
      ourStatus = 'settlement'
    } else if (kode === '2' || status === 'expired') {
      ourStatus = 'expire'
    }

    // 8. Update payment
    await supabase
      .from('payments')
      .update({
        status: ourStatus,
        sakurupiah_status: status,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id)

    // 9. Post-payment: update loan/gadai if successful
    if (ourStatus === 'settlement') {
      if (paymentRecord.loan_id) {
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

          const { data: remaining } = await supabase
            .from('loan_schedules')
            .select('id')
            .eq('loan_id', paymentRecord.loan_id)
            .eq('status', 'pending')

          if (!remaining?.length) {
            await supabase
              .from('loans')
              .update({ status: 'completed', updated_at: new Date().toISOString() })
              .eq('id', paymentRecord.loan_id)
          }
        }
      }

      const userId = paymentRecord.user_id ||
        paymentRecord.loans?.user_id ||
        paymentRecord.gadai_applications?.user_id

      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'repayment_confirmation',
          title: 'Pembayaran Berhasil!',
          message: `Pembayaran sebesar Rp ${paymentRecord.amount?.toLocaleString('id-ID')} telah kami terima. Terima kasih!`,
          is_read: false,
          created_at: new Date().toISOString(),
        })
      }
    }

    console.log('[Sakurupiah Webhook] Done:', paymentRecord.id, '→', ourStatus)
    return res.status(200).json({ status: 'success' })

  } catch (err) {
    console.error('[Sakurupiah Webhook] Error:', err)
    return res.status(500).json({ error: err.message || 'Internal error' })
  }
}
