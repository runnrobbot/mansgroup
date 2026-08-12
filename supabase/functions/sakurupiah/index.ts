// Supabase Edge Function — Sakurupiah Payment Gateway
// Handles: create payment, check status, list channels
// API Key stored server-side, never exposed to frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SANDBOX_BASE = 'https://sakurupiah.id/api-sanbox'
const PROD_BASE = 'https://sakurupiah.id/api'

// Credential dari environment variable
const API_ID = Deno.env.get('SAKURUPIAH_API_ID') ?? 'ID-631034611518'
const API_KEY = Deno.env.get('SAKURUPIAH_API_KEY') ?? 'KEY-DEVzQZbGLri6QCdjXa9Sy2iiFC93k'

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

// Helper: forward POST request to Sakurupiah
async function sakuruPost(endpoint, body) {
  const formData = new URLSearchParams()
  for (const [key, value] of Object.entries(body)) {
    // Sakurupiah expects array params with [] suffix (produk[], qty[], harga[])
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

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client (using service role for server operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { type, data: body } = await req.json()

    switch (type) {
      // ── List Payment Channels ──────────────────────────────
      case 'list_channels': {
        const result = await sakuruPost('/list-payment.php', {
          api_id: API_ID,
          method: 'list',
        })
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ── Create Payment ───────────────────────────────────
      case 'create_payment': {
        const {
          payment_id,       // Internal payment record ID
          merchant_ref,     // Unique order reference
          method,           // Payment channel code (QRIS, BCAVA, etc.)
          amount,           // Total amount in IDR (integer)
          phone,            // Customer phone
          name,             // Customer name
          email,            // Customer email
          fee_bearer,       // 1 = merchant bears fee, 2 = customer
          return_url,       // Redirect after payment
          description,      // Payment description
        } = body

        // Generate signature
        const signature = await generateSignature(API_ID, method, merchant_ref, String(amount))

        // Sakurupiah callback — hit our own webhook edge function
        const callbackUrl = `${supabaseUrl}/functions/v1/sakurupiah-webhook`
        const returnTo = return_url || `${supabaseUrl}/dashboard/payments`

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

        // Add product details if provided
        if (description) {
          payload.produk = [description]
          payload.qty = ['1']
          payload.harga = [String(amount)]
        }

        const result = await sakuruPost('/create.php', payload)

        if (result.status !== '200') {
          return new Response(JSON.stringify({ error: result.message || 'Gagal membuat pembayaran' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        // Extract payment data from Sakurupiah response
        const paymentData = result.data?.[0] || {}

        // Update our payment record with Sakurupiah data
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

        return new Response(JSON.stringify({
          success: true,
          trx_id: paymentData.trx_id,
          merchant_ref,
          checkout_url: paymentData.checkout_url,
          qr_string: paymentData.qr,
          payment_no: paymentData.payment_no,
          expired: paymentData.expired,
          payment_status: paymentData.payment_status,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ── Check Balance ────────────────────────────────────
      case 'check_balance': {
        const result = await sakuruPost('/check_balance.php', {
          api_id: API_ID,
          method: 'balance',
        })
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown request type' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
    }
  } catch (err) {
    console.error('[Sakurupiah Edge] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
