import { useEffect, useState, useRef, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, loanService, midtransService } from '../../services'
import { supabase } from '../../lib/supabase'
import { recomputeLoanState } from '../../lib/paymentSync'
import { useDebouncedReload } from '../../lib/useDebouncedReload'
import {
  formatIDR, formatDate, generateRefNumber,
  getEffectiveLoanNumbers, isRevised,
} from '../../lib/utils'
import { CreditCard, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  pending: 'Menunggu Pembayaran',
  verification: 'Menunggu Verifikasi',
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
  const confirm = useConfirm()
  const [payments, setPayments] = useState([])
  const [activeLoans, setActiveLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)

  // Track komponen masih mounted — guard untuk setState setelah unmount
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
    // Hanya tampilkan loan yang masih aktif. 'completed' di-exclude agar
    // setelah lunas, card pinjaman langsung hilang dari section "Pinjaman Aktif".
    // History pembayarannya tetap muncul di tabel "Riwayat Pembayaran" di bawah.
    setActiveLoans(
      (loansRes.data || []).filter(l => ['disbursed', 'overdue'].includes(l.status))
    )
    setLoading(false)
  }, [profile])

  // Initial load
  useEffect(() => { load() }, [load])

  // Realtime reload — debounced + queued (lihat useDebouncedReload.js)
  const scheduleReload = useDebouncedReload(load, 250)

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`payments-user-${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${profile.id}`,
      }, () => { scheduleReload() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'loans',
        filter: `user_id=eq.${profile.id}`,
      }, () => { scheduleReload() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, scheduleReload])

  // Pre-compute per-loan stats — SELALU pakai getEffectiveLoanNumbers supaya
  // konsisten dengan revisi staff (approved_amount / suggested_amount).
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
  // ↑ Sembunyikan loan yang remaining-nya sudah 0 (lunas) — tidak perlu tunggu DB update status ke 'completed'

  const openPay = (stat) => {
    setSelectedLoan(stat)
    setAmount(String(stat.defaultPay || ''))
    setPayOpen(true)
  }

  const handlePay = async () => {
    if (!selectedLoan || !amount || Number(amount) <= 0) {
      toast.error('Masukkan nominal pembayaran yang valid')
      return
    }
    const nominal = Number(amount)
    if (nominal > selectedLoan.remaining) {
      toast.error(`Nominal melebihi sisa tagihan (${formatIDR(selectedLoan.remaining)})`)
      return
    }

    const ok = await confirm({
      title: 'Lanjutkan Pembayaran?',
      message: `Kamu akan membayar ${formatIDR(nominal)} untuk pinjaman ${selectedLoan.loan.ref_number}. Selanjutnya kamu akan diarahkan ke halaman pembayaran Midtrans yang aman.`,
      variant: 'info',
      confirmLabel: 'Lanjutkan',
    })
    if (!ok) return

    setPaying(true)

    try {
      // 1. Buat record payment di DB (status: pending)
      const orderId = `PAY-${generateRefNumber()}`
      const { data: payment, error: createErr } = await paymentService.create({
        user_id: profile.id,
        loan_id: selectedLoan.loan.id,
        amount: nominal,
        payment_type: 'repayment',
        payment_method: 'midtrans',
        midtrans_order_id: orderId,
        status: 'pending',
      })
      if (createErr || !payment) {
        throw new Error(createErr?.message || 'Gagal membuat order pembayaran')
      }

      // 2. Request Snap token
      const { token, error: tokenErr } = await midtransService.createSnapToken({
        orderId,
        grossAmount: nominal,
        customerName: profile.full_name,
        customerEmail: profile.email,
        customerPhone: profile.phone,
        paymentId: payment.id,
        itemDetails: [{
          id: selectedLoan.loan.id,
          price: nominal,
          quantity: 1,
          name: `Cicilan ${selectedLoan.loan.ref_number}`.slice(0, 50),
        }],
      })

      if (tokenErr || !token) {
        await paymentService.update(payment.id, {
          status: 'failed',
          notes: `Gagal mendapatkan token Midtrans: ${tokenErr?.message || 'unknown'}`,
        })
        throw new Error(
          tokenErr?.message ||
          'Layanan pembayaran sedang tidak tersedia. Coba lagi beberapa saat lagi atau hubungi tim kami.'
        )
      }

      // 3. Load Snap.js & buka popup
      await midtransService.loadSnapScript()

      window.snap.pay(token, {
        onSuccess: async (result) => {
          await finalizePayment(payment.id, 'settlement', result, selectedLoan.loan.id)
          if (!mountedRef.current) return
          toast.success('Pembayaran berhasil! Terima kasih.', { duration: 5000 })
          setPayOpen(false)
          load() // force immediate reload — jangan hanya andalkan debounce/realtime
        },
        onPending: async (result) => {
          await paymentService.update(payment.id, {
            status: 'verification',
            midtrans_status: result.transaction_status,
            midtrans_transaction_id: result.transaction_id,
            midtrans_payment_type: result.payment_type,
          })
          if (!mountedRef.current) return
          toast('Pembayaran sedang diproses. Selesaikan sesuai instruksi yang diberikan.', { icon: '⏳', duration: 6000 })
          setPayOpen(false)
          scheduleReload()
        },
        onError: async (result) => {
          await paymentService.update(payment.id, {
            status: 'failed',
            midtrans_status: result?.status_message || 'error',
          })
          if (!mountedRef.current) return
          toast.error('Pembayaran gagal. Silakan coba lagi.')
          scheduleReload()
        },
        onClose: () => {
          if (!mountedRef.current) return
          toast('Pembayaran belum diselesaikan. Kamu bisa melanjutkan dari riwayat pembayaran.', { icon: 'ℹ️' })
          setPayOpen(false)
          scheduleReload()
        },
      })
    } catch (err) {
      console.error('Payment error:', err)
      if (mountedRef.current) toast.error(err.message || 'Terjadi kesalahan saat memproses pembayaran')
    } finally {
      if (mountedRef.current) setPaying(false)
    }
  }

  /**
   * Finalize payment: update status di tabel payments lalu recompute loan state.
   *
   * Penting: recomputeLoanState() dipanggil SETELAH paymentService.update() commit,
   * dan dia akan re-fetch payments dari DB (bukan delta) — jadi idempotent
   * meski webhook server juga jalan paralel.
   */
  const finalizePayment = async (paymentId, status, midtransResult, loanId) => {
    await paymentService.update(paymentId, {
      status,
      midtrans_status: midtransResult.transaction_status,
      midtrans_transaction_id: midtransResult.transaction_id,
      midtrans_payment_type: midtransResult.payment_type,
    })
    if (loanId) {
      // Recompute langsung — kalau gagal, webhook server akan retry
      await recomputeLoanState(loanId)
    }
    // Realtime subscription akan trigger reload otomatis dari UPDATE event,
    // tapi schedule juga sebagai backup kalau realtime telat
    scheduleReload()
  }

  // Resume payment yang masih pending
  const handleResumePending = async (payment) => {
    if (!payment.midtrans_order_id) {
      toast.error('Pembayaran ini tidak bisa dilanjutkan otomatis. Hubungi tim kami.')
      return
    }
    setPaying(true)
    try {
      const { token, error: tokenErr } = await midtransService.createSnapToken({
        orderId: payment.midtrans_order_id,
        grossAmount: payment.amount,
        customerName: profile.full_name,
        customerEmail: profile.email,
        customerPhone: profile.phone,
        paymentId: payment.id,
      })
      if (tokenErr || !token) throw new Error(tokenErr?.message || 'Gagal melanjutkan pembayaran')

      await midtransService.loadSnapScript()
      window.snap.pay(token, {
        onSuccess: async (result) => {
          await finalizePayment(payment.id, 'settlement', result, payment.loan_id)
          if (mountedRef.current) {
            toast.success('Pembayaran berhasil!')
            load() // force immediate reload
          }
        },
        onPending: async (result) => {
          await paymentService.update(payment.id, {
            status: 'verification',
            midtrans_status: result.transaction_status,
            midtrans_transaction_id: result.transaction_id,
            midtrans_payment_type: result.payment_type,
          })
          if (mountedRef.current) toast('Pembayaran masih diproses', { icon: '⏳' })
          scheduleReload()
        },
        onError: async () => {
          if (mountedRef.current) toast.error('Pembayaran gagal')
          scheduleReload()
        },
        onClose: () => { scheduleReload() },
      })
    } catch (err) {
      if (mountedRef.current) toast.error(err.message)
    } finally {
      if (mountedRef.current) setPaying(false)
    }
  }

  const totalPaid = payments.filter(p => CONFIRMED_STATUSES.includes(p.status)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const pendingCount = payments.filter(p => ['verification', 'pending'].includes(p.status)).length

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
            <p className="text-xs text-slate-400">Menunggu Konfirmasi</p>
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
            <h2 className="text-sm font-700 text-slate-900 mb-4">Pinjaman Aktif — Bayar Sekarang</h2>
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
                          <span className={`text-[10px] font-700 px-1.5 py-0.5 rounded ${loan.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                            {loan.status === 'overdue' ? 'OVERDUE' : 'AKTIF'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Pokok: <span className="font-600 text-slate-700">{formatIDR(eff.principal)}</span>
                          {revised && <span className="text-amber-600 ml-1">(direvisi dari {formatIDR(loan.amount)})</span>}
                          {' · '}
                          {monthsPaid}/{loan.tenor} cicilan
                        </p>
                      </div>
                      <Button
                        size="sm"
                        icon={CreditCard}
                        onClick={() => openPay(stat)}
                        disabled={remaining <= 0}
                      >
                        {remaining <= 0 ? 'Lunas' : 'Bayar'}
                      </Button>
                    </div>

                    {/* Progress + numbers */}
                    <div className="w-full bg-white rounded-full h-1.5 mb-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
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
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : payments.length === 0 ? (
                <EmptyRow colSpan={7} message="Belum ada riwayat pembayaran" />
              ) : payments.map(p => {
                const isPendingPayment = p.status === 'pending'
                return (
                  <Tr key={p.id}>
                    <Td><span className="font-600 text-xs font-mono text-emerald-700">{p.loans?.ref_number || p.gadai_applications?.ref_number || '-'}</span></Td>
                    <Td className="font-700">{formatIDR(p.amount)}</Td>
                    <Td>
                      <span className={`text-xs font-600 px-2 py-1 rounded-lg ${p.payment_method === 'midtrans' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {p.payment_method === 'midtrans' ? 'Midtrans' : p.payment_method || 'Transfer'}
                      </span>
                    </Td>
                    <Td className="text-xs font-mono text-slate-400">{p.midtrans_order_id || '-'}</Td>
                    <Td>
                      <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_COLORS[p.status] || STATUS_COLORS.pending}`}>
                        {STATUS_LABELS[p.status] || p.status}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-500">{formatDate(p.created_at)}</Td>
                    <Td align="center">
                      {isPendingPayment ? (
                        <button
                          onClick={() => handleResumePending(p)}
                          disabled={paying}
                          className="text-xs font-600 text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          Lanjutkan
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Pay Modal */}
        <Modal isOpen={payOpen} onClose={() => !paying && setPayOpen(false)} title="Bayar Cicilan" size="sm">
          {selectedLoan && (
            <>
              <ModalBody>
                <div className="bg-emerald-50 rounded-xl p-4 mb-5">
                  <p className="text-xs text-emerald-600 font-600 mb-1">Pinjaman</p>
                  <p className="font-800 text-emerald-900">{selectedLoan.loan.ref_number}</p>
                  <div className="mt-2 pt-2 border-t border-emerald-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-emerald-600">Cicilan/bulan</p>
                      <p className="font-700 text-emerald-900">{formatIDR(selectedLoan.eff.monthlyInstallment)}</p>
                    </div>
                    <div>
                      <p className="text-emerald-600">Sisa tagihan</p>
                      <p className="font-700 text-emerald-900">{formatIDR(selectedLoan.remaining)}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="label-field">Jumlah Pembayaran (Rp) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    className="input-field"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Masukkan nominal yang ingin dibayar"
                    min={1}
                    max={selectedLoan.remaining}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.min(selectedLoan.eff.monthlyInstallment, selectedLoan.remaining)))}
                      className="text-xs font-600 text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded bg-emerald-50"
                    >
                      Cicilan/bulan
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(String(selectedLoan.remaining))}
                      className="text-xs font-600 text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded bg-emerald-50"
                    >
                      Lunasi semua
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                  <CreditCard size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Pembayaran via Midtrans Snap. Mendukung Transfer Bank, QRIS, Virtual Account, e-wallet, dan kartu kredit.
                    Setelah selesai, status pembayaran akan diperbarui otomatis.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={paying}>Batal</Button>
                <Button icon={paying ? Loader : CreditCard} loading={paying} onClick={handlePay}>
                  {paying ? 'Memproses...' : 'Bayar Sekarang'}
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}