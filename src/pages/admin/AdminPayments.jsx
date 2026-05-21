import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { paymentService } from '../../services'
import { formatIDR, formatDate, formatDateTime } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { CheckCircle, XCircle, Eye, ExternalLink, Wallet, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600',
  verification: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  refunded: 'bg-blue-50 text-blue-700',
}

const STATUS_LABELS = {
  pending: 'Pending',
  verification: 'Menunggu Verifikasi',
  confirmed: 'Terkonfirmasi',
  failed: 'Ditolak',
  refunded: 'Direfund',
}

const METHOD_LABELS = {
  midtrans: 'Midtrans',
  transfer: 'Transfer Manual',
  qris: 'QRIS',
  virtual_account: 'Virtual Account',
}

export default function AdminPayments() {
  const { profile: admin } = useAuth()
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [verifyNotes, setVerifyNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [filter, setFilter] = useState('verification')
  const [counts, setCounts] = useState({ verification: 0, confirmed: 0, failed: 0 })

  const load = async () => {
    setLoading(true)
    const { data } = await paymentService.listPending()
    const pending = data || []
    setCounts({ verification: pending.length, confirmed: 0, failed: 0 })
    setItems(filter === 'verification' ? pending : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const handleVerify = async (action) => {
    if (!selected) return
    const isConfirm = action === 'confirm'
    const ok = await confirm({
      title: isConfirm ? 'Konfirmasi Pembayaran?' : 'Tolak Pembayaran?',
      message: isConfirm
        ? `Pembayaran sebesar ${formatIDR(selected.amount)} dari ${selected.profiles?.full_name} akan dikonfirmasi.`
        : `Pembayaran ini akan ditolak. User perlu melakukan pembayaran ulang.`,
      variant: isConfirm ? 'info' : 'danger',
      confirmLabel: isConfirm ? 'Ya, Konfirmasi' : 'Ya, Tolak',
    })
    if (!ok) return
    setActionLoading(true)
    const { error } = await paymentService.verifyPayment(selected.id, isConfirm ? 'confirmed' : 'failed', admin?.id, verifyNotes)
    setActionLoading(false)
    if (!error) {
      toast.success(isConfirm ? 'Pembayaran dikonfirmasi' : 'Pembayaran ditolak')
      setSelected(null)
      setVerifyNotes('')
      load()
    } else {
      toast.error('Gagal memproses verifikasi')
    }
  }

  const tabs = [
    { value: 'verification', label: 'Menunggu Verifikasi', count: counts.verification },
    { value: 'confirmed', label: 'Terkonfirmasi' },
    { value: 'failed', label: 'Ditolak' },
  ]

  const totalPending = items.reduce((s, i) => s + (i.amount || 0), 0)

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Verifikasi Pembayaran</h1>
          <p className="text-sm text-slate-500 mt-0.5">Konfirmasi pembayaran Midtrans atau transfer manual dari user</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Menunggu Verifikasi</p>
            <p className="text-2xl font-800 text-amber-700 mt-1">{counts.verification}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Total Nominal Pending</p>
            <p className="text-xl font-800 text-slate-900 mt-1">{formatIDR(totalPending)}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={14} className="text-emerald-600" />
              <p className="text-xs text-slate-400">Payment Gateway</p>
            </div>
            <p className="text-sm font-700 text-emerald-700">Midtrans Snap Aktif</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {tabs.map(({ value, label, count }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                filter === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {label}
              {count > 0 && (
                <span className="text-xs font-700 bg-amber-500 text-white rounded-full px-1.5 py-0.5 leading-none">{count}</span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>Ref Pinjaman</Th>
              <Th>Pemohon</Th>
              <Th>Jumlah</Th>
              <Th>Metode</Th>
              <Th>Order ID Midtrans</Th>
              <Th>Tanggal</Th>
              <Th>Status</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={8} message={filter === 'verification' ? 'Tidak ada pembayaran menunggu verifikasi' : 'Tidak ada data'} />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-600 text-xs font-mono text-emerald-700">{item.loans?.ref_number || item.gadai_applications?.ref_number || '-'}</span></Td>
                  <Td>
                    <p className="font-600 text-sm text-slate-900">{item.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-slate-400">{item.profiles?.email || ''}</p>
                  </Td>
                  <Td className="font-700 text-emerald-700">{formatIDR(item.amount)}</Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${
                      item.payment_method === 'midtrans' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {METHOD_LABELS[item.payment_method] || item.payment_method || 'Transfer'}
                    </span>
                  </Td>
                  <Td className="text-xs font-mono text-slate-500">{item.midtrans_order_id || '-'}</Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.created_at)}</Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_COLORS[item.status] || STATUS_COLORS.pending}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </Td>
                  <Td align="center">
                    <button onClick={() => { setSelected(item); setVerifyNotes('') }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                      <Eye size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Verify Modal */}
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Verifikasi Pembayaran" size="md">
          {selected && (
            <>
              <ModalBody>
                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-slate-400">Dari</p>
                      <p className="font-700 text-slate-900">{selected.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{selected.profiles?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Nominal</p>
                      <p className="text-xl font-800 text-emerald-700">{formatIDR(selected.amount)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-5">
                  {[
                    { label: 'Ref. Pinjaman', value: selected.loans?.ref_number || '-' },
                    { label: 'Metode', value: METHOD_LABELS[selected.payment_method] || selected.payment_method || 'Transfer' },
                    { label: 'Order ID Midtrans', value: selected.midtrans_order_id || '-' },
                    { label: 'Status Midtrans', value: selected.midtrans_status || '-' },
                    { label: 'Tanggal', value: formatDateTime(selected.created_at) },
                    { label: 'Ref Transfer', value: selected.transfer_ref || '-' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between border-b border-slate-50 pb-2 last:border-0">
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="text-sm font-600 text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>

                {selected.proof_url && (
                  <div className="mb-5">
                    <p className="text-xs text-slate-400 mb-2 font-600">Bukti Transfer</p>
                    <a href={selected.proof_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-600 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition-colors w-fit">
                      <ExternalLink size={14} />
                      Lihat Bukti Transfer
                    </a>
                  </div>
                )}

                <div>
                  <label className="label-field">Catatan Verifikasi</label>
                  <textarea value={verifyNotes} onChange={e => setVerifyNotes(e.target.value)}
                    rows={2} className="input-field resize-none" placeholder="Catatan verifikasi (opsional)..." />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setSelected(null)}>Tutup</Button>
                <Button variant="danger" icon={XCircle} loading={actionLoading} onClick={() => handleVerify('reject')}>Tolak</Button>
                <Button icon={CheckCircle} loading={actionLoading} onClick={() => handleVerify('confirm')}>Konfirmasi</Button>
              </ModalFooter>
            </>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}
