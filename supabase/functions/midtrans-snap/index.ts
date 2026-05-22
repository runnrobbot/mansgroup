// supabase/functions/midtrans-snap/index.ts
//
// Generate Midtrans Snap token untuk transaksi pembayaran.
//
// Deploy:
//   supabase functions deploy midtrans-snap --no-verify-jwt=false
//
// Set secrets:
//   supabase secrets set MIDTRANS_SERVER_KEY="Mid-server-XXXXXX"
//   supabase secrets set MIDTRANS_IS_PRODUCTION="false"   (atau "true")
//
// Body request dari frontend:
// {
//   order_id: string,
//   gross_amount: number,
//   customer_details: { first_name, email, phone },
//   item_details: [{ id, price, quantity, name }],
//   custom_field1: string  (payment record id supaya webhook bisa match)
// }
//
// Response:
// { token: string, redirect_url: string }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface SnapRequest {
  order_id: string
  gross_amount: number
  customer_details?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
  item_details?: Array<{
    id: string
    price: number
    quantity: number
    name: string
  }>
  custom_field1?: string
  custom_field2?: string
  custom_field3?: string
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY')
    if (!serverKey) {
      return new Response(
        JSON.stringify({ message: 'MIDTRANS_SERVER_KEY belum dikonfigurasi di server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
    const snapEndpoint = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const body = (await req.json()) as SnapRequest

    // Validasi minimal
    if (!body.order_id || !body.gross_amount || body.gross_amount <= 0) {
      return new Response(
        JSON.stringify({ message: 'order_id dan gross_amount wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Sanitize item_details — Midtrans tolak nominal tidak match
    const itemDetails = (body.item_details ?? []).map((it) => ({
      id: String(it.id).slice(0, 50),
      price: Math.round(it.price),
      quantity: it.quantity || 1,
      name: String(it.name).slice(0, 50), // Midtrans max 50 chars
    }))

    // Total item harus sama dengan gross_amount, kalau tidak Midtrans error
    const itemsTotal = itemDetails.reduce((s, it) => s + it.price * it.quantity, 0)
    const useItems = itemsTotal === Math.round(body.gross_amount) ? itemDetails : undefined

    const payload = {
      transaction_details: {
        order_id: String(body.order_id).slice(0, 50),
        gross_amount: Math.round(body.gross_amount),
      },
      credit_card: { secure: true },
      customer_details: body.customer_details,
      ...(useItems ? { item_details: useItems } : {}),
      custom_field1: body.custom_field1,
      custom_field2: body.custom_field2,
      custom_field3: body.custom_field3,
    }

    // Midtrans authorization = Basic base64(serverKey:)
    const auth = btoa(`${serverKey}:`)

    const snapRes = await fetch(snapEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    })

    const snapData = await snapRes.json()

    if (!snapRes.ok || !snapData.token) {
      console.error('Midtrans Snap error:', snapData)
      return new Response(
        JSON.stringify({
          message: snapData.error_messages?.join(', ') || snapData.status_message || 'Gagal membuat transaksi',
          midtrans_response: snapData,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        token: snapData.token,
        redirect_url: snapData.redirect_url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('midtrans-snap error:', err)
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
