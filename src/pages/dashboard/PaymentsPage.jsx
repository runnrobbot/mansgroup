import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, loanService } from '../../services'
import { formatIDR, formatDate, generateRefNumber } from '../../lib/utils'
import { CreditCard, Loader } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_LABELS = {
  pending: 'Pending',
  verification: 'Menunggu Verifikasi',
  confirmed: 'Dikonfirmasi',
  failed: 'Gagal',
  refunded: 'Direfund',
}

const STATUS_COLORS = {
  pending:      'bg-slate-100 text-slate-600',
  verification: 'bg-amber-50 text-amber-700',
  confirmed:    'bg-emerald-50 text-emerald-700',
  failed:       'bg-red-50 text-red-700',
  refunded:     'bg-blue-50 text-blue-700',
}

// Load Midtrans Snap script
function loadMidtrans(clientKey) {
  return new Promise((resolve) => {
    if (window.snap) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js' // change to production URL in prod
    script.setAttribute('data-client-key', clientKey)
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
}

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

  // Midtrans client key from env
  const MIDTRANS_CLIENT_KEY = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || ''

  const load = async () => {
    if (!profile) return
    const [paymentsRes, loansRes] = await Promise.all([
      paymentService.getByUserId(profile.id),
      loanService.getByUserId(profile.id),
    ])
    setPayments(paymentsRes.data || [])
    setActiveLoans((loansRes.data || []).filter(l => ['disbursed', 'overdue'].includes(l.status)))
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const openPay = (loan) => {
    setSelectedLoan(loan)
    setAmount('')
    setPayOpen(true)
  }

  const handlePay = async () => {
    if (!selectedLoan || !amount || Number(amount) <= 0) {
      toast.error('Masukkan jumlah pembayaran yang valid')
      return
    }

    const nominal = Number(amount)

    // Confirm before proceeding
    const ok = await confirm({
      title: 'Lanjutkan Pembayaran?',
      message: `Kamu akan membayar ${formatIDR(nominal)} untuk pinjaman ${selectedLoan.ref_number}. Kamu akan diarahkan ke halaman pembayaran Midtrans.`,
      variant: 'info',
      confirmLabel: 'Lanjutkan',
    })
    if (!ok) return

    setPaying(true)

    try {
      // 1. Create payment record in DB (status: pending)
      const orderId = `PAY-${generateRefNumber()}`
      const { data: payment, error } = await paymentService.create({
        user_id: profile.id,
        loan_id: selectedLoan.id,
        amount: nominal,
        payment_method: 'midtrans',
        midtrans_order_id: orderId,
        status: 'pending',
      })

      if (error) throw new Error('Gagal membuat order pembayaran')

      // 2. Get Snap token from your backend / Supabase Edge Function
      // In production: call your edge function that creates Midtrans transaction
      // For now we show a mock flow
      const snapTokenRes = await fetch('/api/midtrans/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          gross_amount: nominal,
          customer_name: profile.full_name,
          customer_email: profile.email,
          payment_id: payment?.id,
        }),
      }).catch(() => null)

      if (!snapTokenRes || !snapTokenRes.ok) {
        // Fallback: mark as verification for manual review (development mode)
        await paymentService.update(payment?.id, { status: 'verification' })
        toast.success('Pembayaran berhasil dicatat. Admin akan melakukan verifikasi.', { duration: 5000 })
        setPayOpen(false)
        load()
        setPaying(false)
        return
      }

      const { token } = await snapTokenRes.json()

      // 3. Load and open Snap
      await loadMidtrans(MIDTRANS_CLIENT_KEY)
      window.snap.pay(token, {
        onSuccess: async (result) => {
          await paymentService.update(payment?.id, {
            status: 'confirmed',
            midtrans_status: result.transaction_status,
            midtrans_transaction_id: result.transaction_id,
          })
          toast.success('Pembayaran berhasil dikonfirmasi!')
          setPayOpen(false)
          load()
        },
        onPending: async (result) => {
          await paymentService.update(payment?.id, {
            status: 'verification',
            midtrans_status: result.transaction_status,
          })
          toast('Pembayaran pending. Selesaikan pembayaran sesuai instruksi.', { icon: '⏳' })
          setPayOpen(false)
          load()
        },
        onError: async () => {
          await paymentService.update(payment?.id, { status: 'failed' })
          toast.error('Pembayaran gagal. Silakan coba lagi.')
        },
        onClose: () => {
          toast('Pembayaran dibatalkan.', { icon: '❌' })
        },
      })
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setPaying(false)
    }
  }

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0)
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
            <p className="text-2xl font-800 text-slate-900 mt-1">{activeLoans.length}</p>
          </div>
        </div>

        {/* Active loans to pay */}
        {activeLoans.length > 0 && (
          <Card>
            <h2 className="text-sm font-700 text-slate-900 mb-4">Pinjaman Aktif — Bayar Sekarang</h2>
            <div className="space-y-3">
              {activeLoans.map(loan => (
                <div key={loan.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-700 text-slate-900">{loan.ref_number}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pokok: {formatIDR(loan.amount)} ·{' '}
                      <span className={loan.status === 'overdue' ? 'text-red-600 font-600' : 'text-slate-400'}>
                        {loan.status === 'overdue' ? '⚠ Overdue' : 'Aktif'}
                      </span>
                    </p>
                  </div>
                  <Button size="sm" icon={CreditCard} onClick={() => openPay(loan)}>Bayar</Button>
                </div>
              ))}
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
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${
                      p.payment_method === 'midtrans' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
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
                </Tr>
              ))}
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
                  <p className="font-800 text-emerald-900">{selectedLoan.ref_number}</p>
                  <p className="text-sm text-emerald-700 mt-1">Pokok: {formatIDR(selectedLoan.amount)}</p>
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
                  />
                  <p className="text-xs text-slate-400 mt-1">Kamu akan diarahkan ke halaman pembayaran Midtrans</p>
                </div>

                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
                  <CreditCard size={14} className="text-blue-600 flex-shrink-0" />
                  <p className="text-xs text-blue-700">Mendukung Transfer Bank, QRIS, Virtual Account, dan kartu kredit melalui Midtrans Snap.</p>
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
