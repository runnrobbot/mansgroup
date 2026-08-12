// Sakurupiah Frontend Service
// Calls our Supabase Edge Function which proxies to Sakurupiah API
// API Key is NEVER sent to frontend

import { supabase } from '../lib/supabase'

// Call our Edge Function proxy
async function callEdge(type, data = {}) {
  const { data: result, error } = await supabase.functions.invoke('sakurupiah', {
    body: { type, data },
  })
  if (error) throw new Error(error.message || 'Gagal terhubung ke server pembayaran')
  if (result?.error) throw new Error(result.error)
  return result
}

/**
 * Get available payment channels from Sakurupiah
 */
export async function getPaymentChannels() {
  const result = await callEdge('list_channels')
  return result.data || []
}

/**
 * Create a payment and get checkout URL
 * @param {Object} opts
 * @param {string} opts.payment_id - Our internal payment record ID
 * @param {string} opts.merchant_ref - Unique order reference (e.g. MG-20260811-001)
 * @param {string} opts.method - Payment channel code (QRIS, BCAVA, BRIVA, etc.)
 * @param {number} opts.amount - Amount in IDR (integer)
 * @param {string} opts.phone - Customer phone number
 * @param {string} opts.name - Customer name
 * @param {string} opts.email - Customer email
 * @param {string} [opts.description] - Payment description
 * @param {string} [opts.return_url] - URL to redirect after payment
 */
export async function createPayment({
  payment_id,
  merchant_ref,
  method,
  amount,
  phone,
  name,
  email,
  description,
  return_url,
}) {
  return callEdge('create_payment', {
    payment_id,
    merchant_ref,
    method,
    amount,
    phone,
    name,
    email,
    fee_bearer: '1', // merchant bears fee
    description,
    return_url,
  })
}

/**
 * Check payment status via Sakurupiah
 * @param {string} trx_id - Sakurupiah transaction ID
 */
export async function checkPaymentStatus(trx_id) {
  return callEdge('check_status', { trx_id })
}

/**
 * Check merchant balance
 */
export async function checkBalance() {
  return callEdge('check_balance')
}

/**
 * Format amount for display
 */
export function formatAmount(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get human-readable payment channel name
 */
export const CHANNEL_LABELS = {
  QRIS: 'QRIS',
  QRISMU: 'QRIS MU',
  QRIS2: 'QRIS 2',
  QRISC: 'QRISC',
  BCAVA: 'BCA Virtual Account',
  BRIVA: 'BRI Virtual Account',
  BNIVA: 'BNI Virtual Account',
  MANDIRIVA: 'Mandiri Virtual Account',
  OCBC: 'OCBC Virtual Account',
  PERMATAVA: 'Permata Virtual Account',
  BSIVA: 'BSI Virtual Account',
  MUAMALAT: 'Muamalat Virtual Account',
  DANAMON: 'Danamon Virtual Account',
  CIMBVA: 'CIMB Virtual Account',
  SINARMAS: 'Sinarmas Virtual Account',
  BNCVA: 'BNC Virtual Account',
  BAGVA: 'BAG Virtual Account',
  GOPAY: 'GoPay',
  DANA: 'DANA',
  OVO: 'OVO',
  ShopeePay: 'ShopeePay',
  LinkAja: 'LinkAja',
  ALFAMART: 'Alfamart',
  INDOMARET: 'Indomaret',
}

export function getChannelLabel(code) {
  return CHANNEL_LABELS[code] || code || '-'
}
