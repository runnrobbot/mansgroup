import { useEffect, useState, useRef, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalHeader } from '../../components/ui/Modal'
import { PaymentModal } from '../../components/ui/PaymentModal'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, loanService } from '../../services'
import { supabase } from '../../lib/supabase'
import { useDebouncedReload } from '../../lib/useDebouncedReload'
import {
  formatIDR, formatDate,
  getEffectiveLoanNumbers, isRevised,
} from '../../lib/utils'
import { X, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  pending: 'Menunggu',
  verification: 'Verifikasi',
  settlement: 'Berhasil',
  capture: 'Berhasil',
  confirmed: 'Dikonfirmasi',
  failed: 'Gagal',
  cancel: 'Dibatalkan',
  expire: 'Kedaluwarsa',
  refunded: 'Direfund',
}

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  verification: 'bg-amber-50 text-amber-700',
  settlement: 'bg-emerald-50 text-emerald-700',
  capture: 'bg-emerald-50 text-emerald-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  cancel: 'bg-slate-100 text-slate-500',
  expire: 'bg-slate-100 text-slate-500',
  refunded: 'bg-blue-50 text-blue-700',
}

const CONFIRMED_STATUSES = ['settlement', 'capture', 'confirmed']

export default function PaymentsPage() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [activeLoans, setActiveLoans] = useState([])
  const [loading, setLoading] = useState(true)

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedStat, setSelectedStat] = useState(null)

  // Pending payment detail modal
  const [pendingModal, setPendingModal] = useState(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    if (!profile) return
    const [paymentsRes, loansRes] = await Promise.all([
      paymentService.getByUserId(profile.id),
      loanService.getByUserId(profile.id),
    ])
    if (!mountedRef.current) return
    setPayments(paymentsRes.data || [])
    setActiveLoans(
      (loansRes.data || []).filter(l => ['disbursed', 'overdue'].includes(l.status))
    )
    setLoading(false)
  }, [profile])

  useEffect(() => { load() }, [load])

  const scheduleReload = useDebouncedReload(load, 250)

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`payments-user-${profile.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'payments',
        filter: `user_id=eq.${profile.id}`,
      }, () => { scheduleReload() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'loans',
        filter: `user_id=eq.${profile.id}`,
      }, () => { scheduleReload() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, scheduleReload])

  // Pre-compute per-loan stats
  const loanStats = activeLoans.map(loan => {
    const eff = getEffectiveLoanNumbers(loan)
    const loanPayments = payments.filter(
      p => p.loan_id === loan.id && CONFIRMED_STATUSES.includes(p.status)
    )
    const totalPaid = loanPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const remaining = Math.max(0, eff.totalRepayment - totalPaid)
    const monthsPaid = eff.monthlyInstallment > 0
      ? Math.min(loan.tenor || 0, Math.floor(totalPaid / eff.monthlyInstallment))
      : 0
    return {
      loan,
      eff,
      totalPaid,
      remaining,
      monthsPaid,
      defaultPay: Math.min(eff.monthlyInstallment, remaining),
    }
  }).filter(s => s.remaining > 0)

  const totalPaid = payments.filter(p => CONFIRMED_STATUSES.includes(p.status)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const pendingCount = payments.filter(p => ['verification', 'pending'].includes(p.status)).length

  const handleBayar = (stat) => {
    setSelectedStat(stat)
    setPayModalOpen(true)
  }

  return (
    <DashboardLayout role="user">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-0.5">Bayar cicilan dan lihat riwayat pembayaran</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Total Dibayar</p>
            <p className="text-lg font-800 text-emerald-700 mt-1">{formatIDR(totalPaid)}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Menunggu Pembayaran</p>
            <p className="text-2xl font-800 text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Pinjaman Aktif</p>
            <p className="text-2xl font-800 text-slate-900 mt-1">{loanStats.length}</p>
          </div>
        </div>

        {/* Active loans to pay */}
        {loanStats.length > 0 && (
          <Card>
            <h2 className="text-sm font-700 text-slate-900 mb-4">Pinjaman Aktif</h2>
            <div className="space-y-3">
              {loanStats.map(stat => {
                const { loan, eff, totalPaid: paidForLoan, remaining, monthsPaid } = stat
                const revised = isRevised(loan, true)
                const progress = eff.totalRepayment > 0
                  ? Math.min(100, Math.round((paidForLoan / eff.totalRepayment) * 100))
                  : 0
                return (
                  <div key={loan.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-700 text-slate-900">{loan.ref_number}</p>
                          <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded ${loan.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {loan.status === 'overdue' ? 'OVERDUE' : 'AKTIF'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Pokok: <span className="font-600 text-slate-700">{formatIDR(eff.principal)}</span>
                          {revised && <span className="text-amber-600 ml-1">(direvisi)</span>}
                          {' · '}
                          {monthsPaid}/{loan.tenor} cicilan
                        </p>
                      </div>
                      <button
                        onClick={() => handleBayar(stat)}
                        className="btn-primary text-xs py-2 px-4 rounded-lg flex-shrink-0"
                      >
                        Bayar
                      </button>
                    </div>

                    {/* Progress */}
                    <div className="w-full bg-white rounded-full h-1.5 mb-2 overflow-hidden">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400">Cicilan/bln</p>
                        <p className="font-700 text-slate-900">{formatIDR(eff.monthlyInstallment)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Sudah dibayar</p>
                        <p className="font-700 text-emerald-700">{formatIDR(paidForLoan)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Sisa tagihan</p>
                        <p className="font-700 text-red-600">{formatIDR(remaining)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Pending payments */}
        {payments.filter(p => p.status === 'pending').length > 0 && (
          <Card>
            <h2 className="text-sm font-700 text-slate-900 mb-3">Menunggu Pembayaran</h2>
            <div className="space-y-2">
              {payments.filter(p => p.status === 'pending').map(p => {
                const expired = p.sakurupiah_expired && new Date(p.sakurupiah_expired) < new Date()
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div>
                      <p className="text-sm font-600 text-slate-900">{formatIDR(p.amount)}</p>
                      <p className="text-xs text-slate-500">
                        {p.sakurupiah_method ? `via ${p.sakurupiah_method}` : 'via Sakurupiah'}
                        {p.sakurupiah_expired && ` · Expired: ${expired ? 'SUDAH' : new Date(p.sakurupiah_expired).toLocaleString('id-ID')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {expired ? (
                        <span className="text-xs font-600 text-red-600">Kedaluwarsa</span>
                      ) : p.sakurupiah_checkout_url ? (
                        <a
                          href={p.sakurupiah_checkout_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                        >
                          Lanjutkan <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Memproses...</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Payment history */}
        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-4">Riwayat Pembayaran</h2>
          <Table>
            <TableHead>
              <Th>Ref Pinjaman</Th>
              <Th>Jumlah</Th>
              <Th>Metode</Th>
              <Th>Order ID</Th>
              <Th>Status</Th>
              <Th>Tanggal</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : payments.length === 0 ? (
                <EmptyRow colSpan={6} message="Belum ada riwayat pembayaran" />
              ) : payments.map(p => (
                <Tr key={p.id}>
                  <Td><span className="font-600 text-xs font-mono text-emerald-700">{p.loans?.ref_number || p.gadai_applications?.ref_number || '-'}</span></Td>
                  <Td className="font-700">{formatIDR(p.amount)}</Td>
                  <Td>
                    <span className="text-xs font-600 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">
                      {p.sakurupiah_method ? p.sakurupiah_method : p.payment_method || 'Sakurupiah'}
                    </span>
                  </Td>
                  <Td className="text-xs font-mono text-slate-400">
                    {p.sakurupiah_trx_id || p.midtrans_order_id || p.sakurupiah_ref || '-'}
                  </Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_COLORS[p.status] || STATUS_COLORS.pending}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(p.created_at)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Payment Modal */}
      {selectedStat && (
        <PaymentModal
          open={payModalOpen}
          onClose={() => { setPayModalOpen(false); setSelectedStat(null) }}
          loanId={selectedStat.loan.id}
          userId={profile.id}
          amount={selectedStat.defaultPay}
          description={`Cicilan ${selectedStat.loan.ref_number}`}
          customerName={profile.full_name}
          customerEmail={profile.email}
          customerPhone={profile.phone}
        />
      )}
    </DashboardLayout>
  )
}
