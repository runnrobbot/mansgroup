import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { loanService, paymentService, midtransService } from '../../services'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { recomputeLoanState } from '../../lib/paymentSync'
import { useDebouncedReload } from '../../lib/useDebouncedReload'
import { formatIDR, formatDate, formatDateTime, getEffectiveAmount, isRevised, getEffectiveLoanNumbers, generateRefNumber } from '../../lib/utils'
import {
  ArrowLeft, AlertCircle, CheckCircle, Clock, Banknote, CreditCard,
  Calendar, TrendingUp, FileText, Building2, User, Shield,
  ChevronRight, AlertTriangle, Info
} from 'lucide-react'
import toast from 'react-hot-toast'

function InfoGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.filter(Boolean).map(({ label, value, highlight, full }) => (
        <div key={label} className={`p-3 bg-slate-50 rounded-xl ${full ? 'col-span-2' : ''}`}>
          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
          <p className={`font-600 text-sm ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value ?? '-'}</p>
        </div>
      ))}
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, className = '' }) {
  return (
    <Card className={className}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center"><Icon size={14} className="text-emerald-600" /></div>}
        <h2 className="text-sm font-700 text-slate-900">{title}</h2>
      </div>
      {children}
    </Card>
  )
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Diajukan', icon: FileText },
  { key: 'review', label: 'Direview', icon: Clock },
  { key: 'approved', label: 'Disetujui', icon: CheckCircle },
  { key: 'disbursed', label: 'Dicairkan', icon: Banknote },
]

export default function LoanDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [loan, setLoan] = useState(null)
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)

  // Guard untuk setState setelah unmount (mencegah race onSuccess panggil load setelah modal ditutup & component unmount)
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const load = useCallback(async () => {
    const [loanRes, payRes] = await Promise.all([
      loanService.getById(id),
      profile ? paymentService.getByLoanId(id) : Promise.resolve({ data: [] }),
    ])
    if (!mountedRef.current) return
    if (loanRes.error) {
      setFetchError(loanRes.error.message)
    } else {
      setLoan(loanRes.data)
      setPayments(payRes.data || [])
      setFetchError(null)
    }
    setLoading(false)
  }, [id, profile])

  useEffect(() => { load() }, [load])

  const scheduleReload = useDebouncedReload(load, 250)

  // Realtime sync — debounced, jadi banyak event berdekatan (INSERT payment + UPDATE webhook)
  // hanya menyebabkan satu reload
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`loan-detail-${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `loan_id=eq.${id}`,
      }, () => { scheduleReload() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'loans',
        filter: `id=eq.${id}`,
      }, () => { scheduleReload() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, scheduleReload])

  // ── Effective numbers (otomatis correct meski data lama belum direkalkulasi) ─
  const eff = loan
    ? getEffectiveLoanNumbers(loan)
    : { totalRepayment: 0, monthlyInstallment: 0, netDisbursement: 0, totalInterest: 0, platformFee: 0, principal: 0 }

  const totalPaid = payments
    .filter(p => ['confirmed', 'settlement', 'capture'].includes(p.status))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const remaining = Math.max(0, eff.totalRepayment - totalPaid)
  const progress = eff.totalRepayment ? Math.min(100, Math.round((totalPaid / eff.totalRepayment) * 100)) : 0

  const handlePay = async () => {
    const amt = Number(payAmount)
    if (!amt || amt <= 0) { toast.error('Masukkan nominal pembayaran yang valid'); return }
    if (amt > remaining) { toast.error('Nominal melebihi sisa tagihan'); return }
    setPaying(true)

    try {
      // 1. Buat record payment di DB (status: pending)
      const orderId = `PAY-${generateRefNumber()}`
      const { data: payment, error: createErr } = await paymentService.create({
        user_id: profile.id,
        loan_id: id,
        amount: amt,
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
        grossAmount: amt,
        customerName: profile.full_name,
        customerEmail: profile.email,
        customerPhone: profile.phone,
        paymentId: payment.id,
        itemDetails: [{
          id: loan.id,
          price: amt,
          quantity: 1,
          name: `Cicilan ${loan.ref_number}`.slice(0, 50),
        }],
      })
      if (tokenErr || !token) {
        await paymentService.update(payment.id, {
          status: 'failed',
          notes: `Gagal mendapatkan token Midtrans: ${tokenErr?.message || 'unknown'}`,
        })
        throw new Error(
          tokenErr?.message ||
          'Layanan pembayaran sedang tidak tersedia. Coba lagi beberapa saat lagi.'
        )
      }

      // 3. Load Snap & open popup
      await midtransService.loadSnapScript()

      window.snap.pay(token, {
        onSuccess: async (result) => {
          // Update payment record dulu, baru recompute loan state
          await paymentService.update(payment.id, {
            status: 'settlement',
            midtrans_status: result.transaction_status,
            midtrans_transaction_id: result.transaction_id,
            midtrans_payment_type: result.payment_type,
          })
          // recomputeLoanState idempotent — bisa dipanggil paralel dengan webhook
          await recomputeLoanState(id)
          if (!mountedRef.current) return
          toast.success('Pembayaran berhasil! Terima kasih.', { duration: 5000 })
          setPayOpen(false)
          setPayAmount('')
          scheduleReload()
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
          setPayAmount('')
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
          toast('Pembayaran belum diselesaikan. Kamu bisa melanjutkan dari menu Pembayaran.', { icon: 'ℹ️' })
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

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) return (
    <DashboardLayout role="user">
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  if (fetchError || !loan) return (
    <DashboardLayout role="user">
      <div className="max-w-md mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
          <AlertCircle size={20} className="text-red-400" />
        </div>
        <p className="font-700 text-slate-900">Data Pinjaman Tidak Ditemukan</p>
        <p className="text-sm text-slate-400">{fetchError || 'Pengajuan ini belum tersedia atau sedang diproses.'}</p>
        <Link to="/dashboard/loans" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-600 mt-2">
          <ArrowLeft size={14} /> Kembali ke Daftar Pinjaman
        </Link>
      </div>
    </DashboardLayout>
  )

  const isActive = ['disbursed', 'overdue'].includes(loan.status)
  const isPending = ['pending', 'review', 'revision', 'approved'].includes(loan.status)
  const isRejected = loan.status === 'rejected'
  const isDone = loan.status === 'completed'

  // Build schedule — either from DB or calculate client-side
  const schedule = loan.loan_schedules?.length > 0
    ? loan.loan_schedules
    : Array.from({ length: loan.tenor || 0 }, (_, i) => {
      const due = new Date(loan.disbursed_at || loan.created_at)
      due.setMonth(due.getMonth() + i + 1)
      return {
        month: i + 1,
        due_date: due.toISOString(),
        total: eff.monthlyInstallment,
        status: 'pending',
        id: `calc-${i}`,
      }
    })

  const currentStep = STATUS_STEPS.findIndex(s => s.key === loan.status)

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl space-y-5">

        {/* ── Back + header ── */}
        <div>
          <Link to="/dashboard/loans" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
            <ArrowLeft size={13} /> Kembali ke Pinjaman Saya
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-800 text-slate-900">{loan.ref_number}</h1>
              <p className="text-sm text-slate-500 mt-0.5">Pinjaman MansLater</p>
            </div>
            <StatusBadge status={loan.status} />
          </div>
        </div>

        {/* ── Status Rejected ── */}
        {isRejected && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-red-800">Pengajuan Tidak Disetujui</p>
              {loan.admin_notes && <p className="text-xs text-red-600 mt-0.5">Alasan: {loan.admin_notes}</p>}
              <Link to="/dashboard/loans/apply" className="inline-flex items-center gap-1 text-xs font-600 text-red-700 hover:text-red-800 mt-2">
                Ajukan Kembali <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Status tracker (for in-progress) ── */}
        {isPending && (
          <Card>
            <p className="text-sm font-700 text-slate-900 mb-4">Status Pengajuan</p>
            <div className="flex items-center">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStep
                const active = i === currentStep
                const Icon = step.icon
                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className={`flex flex-col items-center gap-1.5 flex-1`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${done ? 'bg-emerald-500' : active ? 'bg-emerald-100 ring-2 ring-emerald-400' : 'bg-slate-100'
                        }`}>
                        <Icon size={14} className={done ? 'text-white' : active ? 'text-emerald-600' : 'text-slate-400'} />
                      </div>
                      <p className={`text-[10px] font-600 text-center leading-tight ${done ? 'text-emerald-600' : active ? 'text-emerald-700' : 'text-slate-400'
                        }`}>{step.label}</p>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 -mt-4 ${i < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
            {loan.status === 'approved' && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-700 font-600">
                  Pengajuan Anda telah disetujui! Dana sebesar <span className="font-800">{formatIDR(getEffectiveAmount(loan, true))}</span> sedang dalam proses pencairan ke rekening {loan.bank_code} {loan.account_number}.
                </p>
              </div>
            )}
            {/* Banner revisi */}
            {isRevised(loan, true) && ['revision', 'review', 'approved'].includes(loan.status) && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={13} className="text-amber-600" />
                  <p className="text-xs font-700 text-amber-700">
                    {loan.status === 'approved' ? 'Pengajuan Disetujui dengan Revisi Limit' : 'Revisi Limit Pinjaman'}
                  </p>
                </div>
                <p className="text-xs text-amber-700">
                  Pengajuan awal: <span className="line-through">{formatIDR(loan.amount)}</span>
                  {' · '}
                  {loan.status === 'approved' ? 'Disetujui' : 'Diusulkan'}: <span className="font-800">{formatIDR(getEffectiveAmount(loan, true))}</span>
                </p>
                {loan.revision_note && (
                  <p className="text-xs text-amber-600 mt-1">Catatan dari tim: {loan.revision_note}</p>
                )}
                {loan.admin_notes && loan.status === 'approved' && (
                  <p className="text-xs text-amber-600 mt-1">Catatan admin: {loan.admin_notes}</p>
                )}
              </div>
            )}
            {loan.status === 'revision' && !isRevised(loan, true) && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs font-700 text-amber-700">Pengajuan Perlu Revisi</p>
                {loan.revision_note && <p className="text-xs text-amber-600 mt-0.5">{loan.revision_note}</p>}
              </div>
            )}
          </Card>
        )}

        {/* ── Active loan: progress + pay CTA ── */}
        {isActive && (
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-700 text-slate-900">Progress Pelunasan</p>
              <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${loan.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                {loan.status === 'overdue' ? '⚠ Telat Bayar' : 'Aktif'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
              <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mb-4">
              <span>Sudah dibayar: <span className="font-700 text-emerald-700">{formatIDR(totalPaid)}</span></span>
              <span>{progress}% lunas</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">Sisa Tagihan</p>
                <p className="font-800 text-red-600 text-lg mt-0.5">{formatIDR(remaining)}</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400">Cicilan / Bulan</p>
                <p className="font-800 text-slate-900 text-lg mt-0.5">{formatIDR(eff.monthlyInstallment)}</p>
              </div>
            </div>
            {!payOpen ? (
              <Button
                icon={CreditCard}
                onClick={() => { setPayOpen(true); setPayAmount(String(Math.min(eff.monthlyInstallment, remaining) || '')) }}
                className="w-full"
                disabled={remaining <= 0}
              >
                {remaining <= 0 ? 'Sudah Lunas' : 'Bayar Cicilan Sekarang'}
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-white rounded-xl border border-slate-100">
                <p className="text-sm font-700 text-slate-900">Pembayaran via Midtrans</p>
                <div>
                  <label className="label-field">Jumlah Pembayaran (Rp)</label>
                  <input type="number" className="input-field" value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="Nominal pembayaran" min={1} max={remaining} />
                  <p className="text-xs text-slate-400 mt-1">Sisa tagihan: {formatIDR(remaining)}</p>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <Info size={13} className="text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">Mendukung Transfer Bank, QRIS, Virtual Account melalui Midtrans</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setPayOpen(false)} className="flex-1" disabled={paying}>Batal</Button>
                  <Button icon={CreditCard} loading={paying} onClick={handlePay} className="flex-1">
                    {paying ? 'Memproses...' : 'Bayar Sekarang'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Completed ── */}
        {isDone && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-white" />
            </div>
            <div>
              <p className="font-700 text-emerald-800">Pinjaman Lunas ✓</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Selamat! Pinjaman {loan.ref_number} telah selesai dilunasi.
                {loan.completed_at && ` Lunas pada ${formatDate(loan.completed_at)}.`}
              </p>
            </div>
          </div>
        )}

        {/* ── Loan Summary ── */}
        <SectionCard title="Detail Pinjaman" icon={Banknote}>
          <InfoGrid items={[
            isRevised(loan, true) && { label: 'Jumlah Diajukan', value: <span className="line-through text-slate-400">{formatIDR(loan.amount)}</span> },
            { label: isRevised(loan, true) ? 'Jumlah Disetujui' : 'Jumlah Pinjaman', value: <span className={isRevised(loan, true) ? 'text-amber-700 font-800' : ''}>{formatIDR(eff.principal)}</span> },
            { label: 'Tenor', value: `${loan.tenor} bulan` },
            { label: 'Bunga (5%/bln)', value: formatIDR(eff.totalInterest) },
            { label: 'Biaya Admin', value: formatIDR(eff.platformFee) },
            { label: 'Dana Diterima', value: formatIDR(eff.netDisbursement), highlight: true },
            { label: 'Cicilan / Bulan', value: formatIDR(eff.monthlyInstallment) },
            { label: 'Total yang Dibayar', value: formatIDR(eff.totalRepayment) },
            loan.disbursed_at && { label: 'Tanggal Cair', value: formatDate(loan.disbursed_at) },
            loan.disbursement_ref && { label: 'Ref Transfer', value: loan.disbursement_ref, full: true },
          ]} />
        </SectionCard>

        {/* ── Repayment Schedule ── */}
        {schedule.length > 0 && (
          <SectionCard title={`Jadwal Cicilan (${loan.tenor} bulan)`} icon={Calendar}>
            <div className="space-y-2">
              {schedule.map((s) => {
                const isPaid = s.status === 'paid'
                const isOverdue = s.status === 'overdue'
                const paidForMonth = payments
                  .filter(p => p.schedule_id === s.id && ['confirmed', 'settlement', 'capture'].includes(p.status))
                  .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

                return (
                  <div key={s.id} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isPaid ? 'bg-emerald-50 border border-emerald-100' :
                    isOverdue ? 'bg-red-50 border border-red-100' :
                      'bg-slate-50 border border-slate-100'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-red-400' : 'bg-slate-200'
                        }`}>
                        {isPaid
                          ? <CheckCircle size={12} className="text-white" />
                          : <span className="text-[10px] font-700 text-slate-600">{s.month}</span>
                        }
                      </div>
                      <div>
                        <p className={`text-sm font-600 ${isPaid ? 'text-emerald-800' : isOverdue ? 'text-red-800' : 'text-slate-800'}`}>
                          Bulan {s.month}
                        </p>
                        <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                          Jatuh tempo: {formatDate(s.due_date)}
                          {isOverdue && ' · TERLAMBAT'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-700 text-sm ${isPaid ? 'text-emerald-700' : isOverdue ? 'text-red-700' : 'text-slate-900'}`}>
                        {formatIDR(s.total)}
                      </p>
                      {isPaid && paidForMonth > 0 && (
                        <p className="text-xs text-emerald-600">✓ Lunas</p>
                      )}
                      {!isPaid && !isOverdue && (
                        <p className="text-xs text-slate-400">Belum bayar</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Summary row */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Total Kewajiban</span>
              <span className="font-800 text-slate-900">{formatIDR(eff.totalRepayment)}</span>
            </div>
          </SectionCard>
        )}

        {/* ── Disbursement Info ── */}
        {(loan.bank_code || loan.account_number) && (
          <SectionCard title="Rekening Pencairan" icon={Building2}>
            <InfoGrid items={[
              { label: 'Bank', value: loan.bank_code },
              { label: 'No. Rekening', value: loan.account_number },
              loan.account_name && { label: 'Nama Pemilik', value: loan.account_name, full: true },
            ]} />
          </SectionCard>
        )}

        {/* ── Personal Data snapshot ── */}
        {(loan.full_name || loan.nik) && (
          <SectionCard title="Data Pemohon (Snapshot)" icon={User}>
            <InfoGrid items={[
              { label: 'Nama Lengkap', value: loan.full_name },
              { label: 'NIK', value: loan.nik },
              { label: 'Tanggal Lahir', value: loan.birth_date ? formatDate(loan.birth_date) : null },
              { label: 'No. HP', value: loan.phone },
              { label: 'Pekerjaan', value: loan.occupation },
              { label: 'Penghasilan', value: loan.income ? formatIDR(loan.income) : null },
              (loan.address) && { label: 'Alamat', value: loan.address, full: true },
            ]} />
          </SectionCard>
        )}

        {/* ── Payment History ── */}
        {payments.length > 0 && (
          <SectionCard title="Riwayat Pembayaran" icon={TrendingUp}>
            <div className="space-y-2">
              {payments.map(p => {
                const isConfirmed = ['confirmed', 'settlement', 'capture'].includes(p.status)
                const isPendingP = ['pending', 'verification'].includes(p.status)
                return (
                  <div key={p.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${isConfirmed ? 'bg-emerald-50' : isPendingP ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                    <div>
                      <p className="text-sm font-600 text-slate-800">{formatIDR(p.amount)}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(p.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-700 px-2 py-0.5 rounded-full ${isConfirmed ? 'bg-emerald-100 text-emerald-700' :
                        isPendingP ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {isConfirmed ? 'Dikonfirmasi' : isPendingP ? 'Menunggu' : 'Gagal'}
                      </span>
                      {p.midtrans_order_id && <p className="text-xs text-slate-400 mt-0.5 font-mono">{p.midtrans_order_id}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Admin notes ── */}
        {loan.admin_notes && !isRejected && (
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
            <Shield size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-700 text-blue-700">Catatan Admin</p>
              <p className="text-xs text-blue-600 mt-0.5">{loan.admin_notes}</p>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}