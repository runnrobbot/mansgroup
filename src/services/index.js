import { supabase } from '../lib/supabase'

// ─── Profiles ───────────────────────────────────────────────────────────────

export const profileService = {
  async getById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async listAll({ page = 1, limit = 20, search = '', role = '' } = {}) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })

    if (search) query = query.ilike('full_name', `%${search}%`)
    if (role) query = query.eq('role', role)

    return query
  },

  async updateRole(id, role) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
}

// ─── KYC ────────────────────────────────────────────────────────────────────

export const kycService = {
  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  async submit(userId, kycData) {
    const { data, error } = await supabase
      .from('kyc_documents')
      .upsert({ user_id: userId, ...kycData, status: 'pending', submitted_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async updateStatus(id, status, notes = '') {
    const { data, error } = await supabase
      .from('kyc_documents')
      .update({ status, review_notes: notes, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async listPending() {
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('*, profiles(*)')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: true })
    return { data, error }
  },
}

// ─── Loans (MansLater) ───────────────────────────────────────────────────────

export const loanService = {
  async create(userId, loanData) {
    const { data, error } = await supabase
      .from('loans')
      .insert({ user_id: userId, ...loanData, status: 'pending', created_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('loans')
      .select('*, loan_schedules(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('loans')
      .select('*, loan_schedules(*), profiles!loans_user_id_fkey(full_name, email, phone)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async updateStatus(id, status, notes = '', staffId = null) {
    const updates = {
      status,
      updated_at: new Date().toISOString(),
    }
    if (notes) updates.staff_notes = notes
    if (staffId) updates.reviewed_by = staffId
    if (status === 'approved') updates.approved_at = new Date().toISOString()
    if (status === 'disbursed') updates.disbursed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async updateFull(id, updates) {
    const { data, error } = await supabase
      .from('loans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async listAll({ page = 1, limit = 20, status = '', search = '' } = {}) {
    let query = supabase
      .from('loans')
      .select('*, profiles!loans_user_id_fkey(full_name, email, phone)', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (search) query = query.ilike('ref_number', `%${search}%`)

    return query
  },

}

// ─── Gadai (MansGadai) ───────────────────────────────────────────────────────

export const gadaiService = {
  async create(userId, gadaiData) {
    const { data, error } = await supabase
      .from('gadai_applications')
      .insert({ user_id: userId, ...gadaiData, status: 'pending', created_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('gadai_applications')
      .select('*, collateral_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('gadai_applications')
      .select('*, collateral_items(*), profiles(*), documents(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  async updateStatus(id, status, notes = '', staffId = null) {
    const updates = { status, updated_at: new Date().toISOString() }
    if (notes) updates.staff_notes = notes
    if (staffId) updates.reviewed_by = staffId

    const { data, error } = await supabase
      .from('gadai_applications')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async updateFull(id, updates) {
    const { data, error } = await supabase
      .from('gadai_applications')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async listAll({ page = 1, limit = 20, status = '' } = {}) {
    let query = supabase
      .from('gadai_applications')
      .select(
        '*, profiles!gadai_applications_user_id_fkey(full_name, email, phone, nik, birth_date, occupation, income, address)',
        { count: 'exact' }
      )
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    return query
  },

  async schedulePickup(gadaiId, pickupData) {
    const { data, error } = await supabase
      .from('pickup_schedules')
      .insert({ gadai_id: gadaiId, ...pickupData })
      .select()
      .single()
    return { data, error }
  },
}

// ─── Collateral Warehouse ─────────────────────────────────────────────────────

export const warehouseService = {
  async addItem(itemData) {
    const { data, error } = await supabase
      .from('collateral_items')
      .insert({ ...itemData, received_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async listAll({ page = 1, limit = 20, category = '', status = '' } = {}) {
    let query = supabase
      .from('collateral_items')
      .select('*, gadai_applications(ref_number, profiles(full_name))', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)
      .order('received_at', { ascending: false })

    if (category) query = query.eq('category', category)
    if (status) query = query.eq('status', status)

    return query
  },

  async updateItem(id, updates) {
    const { data, error } = await supabase
      .from('collateral_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentService = {
  async create(paymentData) {
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...paymentData, created_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('payments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async getByLoanId(loanId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getByUserId(userId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*, loans(ref_number), gadai_applications(ref_number), profiles(full_name, email)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async verifyPayment(id, status, staffId, notes = '') {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status,
        verified_by: staffId,
        verification_notes: notes,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  async listAll({ status = '', limit = 50 } = {}) {
    let query = supabase
      .from('payments')
      .select('*, profiles(full_name, email), loans(ref_number), gadai_applications(ref_number)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status) query = query.eq('status', status)
    return query
  },

  async listPending() {
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles(full_name, email), loans(ref_number), gadai_applications(ref_number)')
      .eq('status', 'verification')
      .order('created_at', { ascending: true })
    return { data, error }
  },
}

// ─── Documents / File Upload ──────────────────────────────────────────────────

export const documentService = {
  async upload(file, bucket, path) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type })
    if (error) {
      console.error('[Storage Upload Error]', { bucket, path, message: error.message, statusCode: error.statusCode })
      return { url: null, error }
    }

    // Use signed URL for private buckets (documents bucket is private).
    // Expiry: 1 year (31536000s) — suitable for KYC documents.
    const { data: signedData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 31536000)
    if (signError) {
      console.error('[Signed URL Error]', signError)
      return { url: null, error: signError }
    }

    return { url: signedData.signedUrl, error: null }
  },

  async getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    return { url: data?.signedUrl || null, error }
  },

  async saveRecord(docData) {
    const { data, error } = await supabase
      .from('documents')
      .insert({ ...docData, uploaded_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async getByEntity(entityType, entityId) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
    return { data, error }
  },
}

// ─── Blacklist ────────────────────────────────────────────────────────────────

export const blacklistService = {
  async add(userId, reason, type = 'overdue', addedBy) {
    const { data, error } = await supabase
      .from('blacklists')
      .insert({ user_id: userId, reason, type, added_by: addedBy, added_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async check(userId) {
    const { data } = await supabase
      .from('blacklists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    return !!data
  },

  async listAll() {
    const { data, error } = await supabase
      .from('blacklists')
      .select('*, profiles(full_name, email)')
      .eq('is_active', true)
      .order('added_at', { ascending: false })
    return { data, error }
  },

  async remove(id, removedBy) {
    const { data, error } = await supabase
      .from('blacklists')
      .update({ is_active: false, removed_by: removedBy, removed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
}

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationService = {
  async send({ userId, type, title, message, metadata = {} }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id: userId, type, title, message, metadata, is_read: false, created_at: new Date().toISOString() })
      .select()
      .single()
    return { data, error }
  },

  async markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  },
}

// ─── Founder Analytics ────────────────────────────────────────────────────────

export const analyticsService = {
  async getSummary() {
    const [loans, gadai, payments, users] = await Promise.all([
      supabase.from('loans').select('id, ref_number, amount, status, created_at, profiles(full_name)'),
      supabase.from('gadai_applications').select('id, ref_number, loan_amount, status, created_at, profiles(full_name)'),
      supabase.from('payments').select('amount, status, created_at'),
      supabase.from('profiles').select('id, role, created_at'),
    ])

    return {
      loans: loans.data || [],
      gadai: gadai.data || [],
      payments: payments.data || [],
      users: users.data || [],
    }
  },

}

// ─── Midtrans ─────────────────────────────────────────────────────────────────
//
// Frontend TIDAK BOLEH punya Midtrans Server Key (akan bocor di JS bundle).
// Snap token harus di-generate di backend, di sini kami pakai Supabase Edge Function.
//
// Env yang dipakai oleh frontend:
//   VITE_MIDTRANS_CLIENT_KEY    → client key (publik, aman di-expose)
//   VITE_MIDTRANS_SNAP_URL      → snap.js URL (default: production app.midtrans.com)
//
// Edge function ada di: supabase/functions/midtrans-snap/index.ts
export const midtransService = {
  /**
   * Request Snap token dari Supabase Edge Function.
   * Edge function akan create transaction ke Midtrans pakai server key
   * (yang aman karena di server-side), lalu return { token, redirect_url }.
   */
  async createSnapToken({ orderId, grossAmount, customerName, customerEmail, customerPhone, itemDetails, paymentId }) {
    const { data, error } = await supabase.functions.invoke('midtrans-snap', {
      body: {
        order_id: orderId,
        gross_amount: grossAmount,
        customer_details: {
          first_name: customerName || 'Customer',
          email: customerEmail,
          phone: customerPhone,
        },
        item_details: itemDetails || [{
          id: paymentId || orderId,
          price: grossAmount,
          quantity: 1,
          name: 'Pembayaran Cicilan',
        }],
        // payment_id dipakai webhook untuk identify record yang harus di-update
        custom_field1: paymentId,
      },
    })
    if (error) return { token: null, error }
    if (!data?.token) return { token: null, error: new Error(data?.message || 'Gagal mendapatkan token pembayaran') }
    return { token: data.token, redirectUrl: data.redirect_url, error: null }
  },

  /**
   * Load Midtrans Snap.js secara dinamis. Idempotent — kalau sudah loaded, langsung resolve.
   */
  loadSnapScript() {
    return new Promise((resolve, reject) => {
      if (window.snap) return resolve()
      const existing = document.querySelector('script[data-midtrans]')
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Gagal memuat skrip pembayaran')))
        return
      }
      const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY
      if (!clientKey) return reject(new Error('Konfigurasi pembayaran belum lengkap. Hubungi tim kami.'))
      const snapUrl = import.meta.env.VITE_MIDTRANS_SNAP_URL || 'https://app.midtrans.com/snap/snap.js'
      const script = document.createElement('script')
      script.src = snapUrl
      script.setAttribute('data-client-key', clientKey)
      script.setAttribute('data-midtrans', 'true')
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Gagal memuat skrip pembayaran Midtrans'))
      document.head.appendChild(script)
    })
  },
}
