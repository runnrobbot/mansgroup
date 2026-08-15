// Vercel API Route — Sakurupiah Payment Gateway
// Handles: create payment, check status, list channels, check balance
// API Key stored in Vercel env vars, never exposed to frontend

const SANDBOX_BASE = 'https://sakurupiah.id/api-sanbox'
const PROD_BASE = 'https://sakurupiah.id/api'

// Credential dari Vercel environment variables
const API_ID = process.env.SAKURUPIAH_API_ID
const API_KEY = process.env.SAKURUPIAH_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK_SECRET = process.env.SAKURUPIAH_WEBHOOK_SECRET

// Helper: generate HMAC-SHA256 signature
async function generateSignature(apiId, method, merchantRef, amount) {
  const data = `${apiId}${method}${merchantRef}${amount}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(API_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Helper: POST to Sakurupiah
async function sakuruPost(endpoint, body) {
  const formData = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      value.forEach(v => formData.append(`${key}[]`, String(v)))
    } else {
      formData.append(key, String(value))
    }
  }
  const response = await fetch(`${SANDBOX_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  })
  return response.json()
}

// Helper: Supabase service client (server-side)
async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, data: body } = req.body || {}

    switch (type) {
      // ── List Payment Channels ──────────────────────────────
      case 'list_channels': {
        const result = await sakuruPost('/list-payment.php', {
          api_id: API_ID,
          method: 'list',
        })
        return res.status(200).json(result)
      }

      // ── Create Payment ───────────────────────────────────
      case 'create_payment': {
        const {
          payment_id,
          merchant_ref,
          method,
          amount,
          phone,
          name,
          email,
          fee_bearer,
          return_url,
          description,
        } = body

        const signature = await generateSignature(API_ID, method, merchant_ref, String(amount))

        // Webhook URL — Vercel webhook endpoint
        const callbackUrl = `https://${req.headers.host}/api/sakurupiah/webhook`
        const returnTo = return_url || `${SUPABASE_URL}/dashboard/payments`

        const payload = {
          api_id: API_ID,
          method,
          phone: phone || '',
          amount: String(amount),
          merchant_fee: fee_bearer || '1',
          merchant_ref,
          callback_url: callbackUrl,
          return_url: returnTo,
          signature,
          name: name || '',
          email: email || '',
          expired: '24',
        }

        if (description) {
          payload.produk = [description]
          payload.qty = ['1']
          payload.harga = [String(amount)]
        }

        const result = await sakuruPost('/create.php', payload)

        if (result.status !== '200') {
          return res.status(400).json({ error: result.message || 'Gagal membuat pembayaran' })
        }

        const paymentData = result.data?.[0] || {}

        // Update payment record in Supabase
        const supabase = await getSupabase()
        await supabase
          .from('payments')
          .update({
            sakurupiah_trx_id: paymentData.trx_id || null,
            sakurupiah_ref: merchant_ref,
            sakurupiah_method: method,
            sakurupiah_checkout_url: paymentData.checkout_url || null,
            sakurupiah_qr_string: paymentData.qr || null,
            sakurupiah_payment_no: paymentData.payment_no || null,
            sakurupiah_expired: paymentData.expired || null,
            sakurupiah_status: paymentData.payment_status || 'pending',
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment_id)

        return res.status(200).json({
          success: true,
          trx_id: paymentData.trx_id,
          merchant_ref,
          checkout_url: paymentData.checkout_url,
          qr_string: paymentData.qr,
          payment_no: paymentData.payment_no,
          expired: paymentData.expired,
          payment_status: paymentData.payment_status,
        })
      }

      // ── Check Transaction Status ─────────────────────────
      case 'check_status': {
        const { trx_id } = body
        const result = await sakuruPost('/status-transaction.php', {
          api_id: API_ID,
          method: 'status',
          trx_id,
        })
        return res.status(200).json(result)
      }

      // ── Check Balance ────────────────────────────────────
      case 'check_balance': {
        const result = await sakuruPost('/check_balance.php', {
          api_id: API_ID,
          method: 'balance',
        })
        return res.status(200).json(result)
      }

      default:
        return res.status(400).json({ error: 'Unknown request type' })
    }
  } catch (err) {
    console.error('[Sakurupiah API]', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
