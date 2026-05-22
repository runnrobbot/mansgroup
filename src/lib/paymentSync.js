// src/lib/paymentSync.js
//
// Single source of truth untuk recompute loan/gadai state setelah pembayaran.
//
// Kenapa modul ini ada:
//   Sebelumnya ada 3 tempat berbeda yang menghitung sisa tagihan:
//     1. PaymentsPage.syncLoanAfterPayment (client)
//     2. LoanDetailPage.syncLoanAfterPayment (client)
//     3. midtrans-webhook (server)
//   Tiga-tiganya pakai logic delta `confirmedPayments + paidAmount` yang
//   rentan double-counting kalau payment yang baru di-update sudah ter-include
//   di hasil select (read-after-write race di Supabase).
//
// Solusi:
//   Satu fungsi `recomputeLoanState(loanId)` yang:
//     - Ambil ULANG semua payments yang sudah confirmed dari DB
//     - Hitung totalPaid (idempotent — tidak ada delta)
//     - Pakai `effective total_repayment` (hormati revisi staff)
//     - Update loan.remaining_amount + status kalau lunas
//
// Properti penting:
//   - IDEMPOTEN: bisa dipanggil berkali-kali, hasilnya tetap sama
//   - TANPA DELTA: tidak menambahkan paidAmount manual → tidak ada risk double count
//   - HORMATI REVISI: pakai getEffectiveLoanNumbers (approved_amount > suggested_amount > amount)

import { supabase } from './supabase'
import { getEffectiveLoanNumbers, getEffectiveGadaiNumbers } from './utils'

const CONFIRMED_STATUSES = ['settlement', 'capture', 'confirmed']

/**
 * Recompute remaining_amount dan status untuk satu loan.
 *
 * Dipanggil setelah pembayaran sukses (dari client onSuccess/onPending Midtrans),
 * dan juga dari webhook server untuk double-confirm.
 *
 * @param {string} loanId
 * @returns {Promise<{ remaining: number, status: string, totalPaid: number } | null>}
 */
export async function recomputeLoanState(loanId) {
    if (!loanId) return null

    // 1. Ambil loan + semua payments confirmed dalam satu round-trip
    const [loanRes, paymentsRes] = await Promise.all([
        supabase.from('loans').select('*').eq('id', loanId).single(),
        supabase
            .from('payments')
            .select('amount, status')
            .eq('loan_id', loanId)
            .in('status', CONFIRMED_STATUSES),
    ])

    if (loanRes.error || !loanRes.data) {
        console.error('[recomputeLoanState] failed to load loan:', loanRes.error)
        return null
    }

    const loan = loanRes.data
    // Skip kalau sudah completed — tidak perlu update lagi
    if (loan.status === 'completed') {
        return {
            remaining: 0,
            status: 'completed',
            totalPaid: loan.total_repayment || 0,
        }
    }

    const confirmed = paymentsRes.data || []
    const totalPaid = confirmed.reduce((s, p) => s + (Number(p.amount) || 0), 0)

    // Pakai effective total_repayment — hormati revisi staff yang belum di-approve admin
    const eff = getEffectiveLoanNumbers(loan)
    const effectiveTotalRepayment = eff.totalRepayment || loan.total_repayment || 0
    const newRemaining = Math.max(0, effectiveTotalRepayment - totalPaid)

    const updates = {
        remaining_amount: newRemaining,
        updated_at: new Date().toISOString(),
    }
    let newStatus = loan.status
    if (newRemaining === 0 && effectiveTotalRepayment > 0) {
        updates.status = 'completed'
        updates.completed_at = new Date().toISOString()
        newStatus = 'completed'
    }

    // Update hanya kalau ada perubahan nyata — hindari realtime echo yang tidak perlu
    const currentRemaining = Number(loan.remaining_amount)
    const sameRemaining = currentRemaining === newRemaining
    const sameStatus = loan.status === newStatus
    if (sameRemaining && sameStatus) {
        return { remaining: newRemaining, status: newStatus, totalPaid }
    }

    const { error: updateErr } = await supabase
        .from('loans')
        .update(updates)
        .eq('id', loanId)

    if (updateErr) {
        console.error('[recomputeLoanState] update failed:', updateErr)
        return null
    }

    return { remaining: newRemaining, status: newStatus, totalPaid }
}

/**
 * Recompute status gadai setelah pembayaran sukses.
 * Gadai tidak punya remaining_amount column, jadi hanya update status kalau lunas.
 */
export async function recomputeGadaiState(gadaiId) {
    if (!gadaiId) return null

    const [gadaiRes, paymentsRes] = await Promise.all([
        supabase.from('gadai_applications').select('*').eq('id', gadaiId).single(),
        supabase
            .from('payments')
            .select('amount, status')
            .eq('gadai_id', gadaiId)
            .in('status', CONFIRMED_STATUSES),
    ])

    if (gadaiRes.error || !gadaiRes.data) {
        console.error('[recomputeGadaiState] failed to load gadai:', gadaiRes.error)
        return null
    }

    const gadai = gadaiRes.data
    if (['completed', 'forfeited', 'rejected'].includes(gadai.status)) {
        return { status: gadai.status, totalPaid: gadai.total_repayment || 0 }
    }

    const confirmed = paymentsRes.data || []
    const totalPaid = confirmed.reduce((s, p) => s + (Number(p.amount) || 0), 0)

    const eff = getEffectiveGadaiNumbers(gadai)
    const effectiveTotalRepayment = eff.totalRepayment || gadai.total_repayment || 0

    if (totalPaid >= effectiveTotalRepayment && effectiveTotalRepayment > 0) {
        const { error: updateErr } = await supabase
            .from('gadai_applications')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString(),
            })
            .eq('id', gadaiId)

        if (updateErr) {
            console.error('[recomputeGadaiState] update failed:', updateErr)
            return null
        }
        return { status: 'completed', totalPaid }
    }

    return { status: gadai.status, totalPaid }
}

/**
 * Setelah pembayaran perpanjangan gadai sukses via Midtrans:
 * - Set status ke 'extended'
 * - Tambah 30 hari ke due_date (dari due_date saat ini, bukan hari ini)
 *
 * @param {string} gadaiId
 * @returns {Promise<{ status: string, newDueDate: string } | null>}
 */
export async function recomputeGadaiExtension(gadaiId) {
    if (!gadaiId) return null

    const { data: gadai, error } = await supabase
        .from('gadai_applications')
        .select('id, status, due_date')
        .eq('id', gadaiId)
        .single()

    if (error || !gadai) {
        console.error('[recomputeGadaiExtension] failed to load gadai:', error)
        return null
    }

    // Hitung due_date baru: +30 hari dari due_date lama (atau hari ini kalau due_date kosong)
    const base = gadai.due_date ? new Date(gadai.due_date) : new Date()
    base.setDate(base.getDate() + 30)
    const newDueDate = base.toISOString().split('T')[0]

    const { error: updateErr } = await supabase
        .from('gadai_applications')
        .update({
            status: 'extended',
            due_date: newDueDate,
            updated_at: new Date().toISOString(),
        })
        .eq('id', gadaiId)

    if (updateErr) {
        console.error('[recomputeGadaiExtension] update failed:', updateErr)
        return null
    }

    return { status: 'extended', newDueDate }
}