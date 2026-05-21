import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService, documentService, loanService } from '../../services'
import { formatIDR, formatDate, formatDateTime, generateRefNumber } from '../../lib/utils'
import { Upload, ExternalLink, Plus, Receipt, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PaymentsPage() {
  const { profile } = useAuth()
  const confirm = useConfirm()
  const [payments, setPayments] = useState([])
  const [activeLoans, setActiveLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [form, setForm] = useState({ loan_id: '', amount: '', payment_method: 'transfer', transfer_ref: '', notes: '' })
  const [proofFile, setProofFile] = useState(null)
  const [saving, setSaving] = useState(false)

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

  const handleSubmitPayment = async () => {
    if (!form.loan_id || !form.amount) {
      toast.error('Pilih pinjaman dan isi jumlah pembayaran')
      return
    }

    const ok = await confirm({
      title: 'Konfirmasi Upload Bukti Pembayaran?',
      message: `Bukti pembayaran sebesar ${formatIDR(Number(form.amount))} akan dikirimkan untuk diverifikasi admin. Pastikan nominal dan bukti transfer sudah benar.`,
      variant: 'info',
      confirmLabel: 'Ya, Kirim Bukti',
    })
    if (!ok) return

    setSaving(true)
    let proofUrl = null

    if (proofFile) {
      const path = `payments/${profile.id}/${Date.now()}_${proofFile.name}`
      const { url } = await documentService.upload(proofFile, 'documents', path)
      proofUrl = url
    }

    const { error } = await paymentService.create({
      user_id: profile.id,
      loan_id: form.loan_id,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      transfer_ref: form.transfer_ref,
      proof_url: proofUrl,
      notes: form.notes,
      status: 'verification',
    })

    setSaving(false)
    if (!error) {
      toast.success('Bukti pembayaran berhasil dikirim untuk diverifikasi')
      setUploadOpen(false)
      setForm({ loan_id: '', amount: '', payment_method: 'transfer', transfer_ref: '', notes: '' })
      setProofFile(null)
      load()
    } else {
      toast.error('Gagal mengirim bukti pembayaran')
    }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const STATUS_LABELS = {
    pending: 'Pending',
    verification: 'Menunggu Verifikasi',
    confirmed: 'Dikonfirmasi',
    failed: 'Ditolak',
    refunded: 'Direfund',
  }

  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0)
  const pendingCount = payments.filter(p => p.status === 'verification').length

  return (
    <DashboardLayout role="user">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Pembayaran</h1>
            <p className="text-sm text-slate-500 mt-0.5">Riwayat dan upload bukti pembayaran cicilan</p>
          </div>
          <Button icon={Upload} onClick={() => setUploadOpen(true)}>Upload Bukti Bayar</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Total Dibayar</p>
            <p className="text-lg font-800 text-emerald-700 mt-1">{formatIDR(totalPaid)}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Menunggu Verifikasi</p>
            <p className="text-2xl font-800 text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Pinjaman Aktif</p>
            <p className="text-2xl font-800 text-slate-900 mt-1">{activeLoans.length}</p>
          </div>
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>ID</Th>
              <Th>Referensi</Th>
              <Th>Jumlah</Th>
              <Th>Metode</Th>
              <Th>Status</Th>
              <Th>Tanggal</Th>
              <Th align="center">Bukti</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : payments.length === 0 ? (
                <EmptyRow colSpan={7} message="Belum ada riwayat pembayaran" />
              ) : payments.map(p => (
                <Tr key={p.id}>
                  <Td><span className="font-600 text-xs font-mono">{p.id?.slice(0, 8).toUpperCase()}</span></Td>
                  <Td className="text-xs">{p.loans?.ref_number || p.gadai_applications?.ref_number || '-'}</Td>
                  <Td className="font-700">{formatIDR(p.amount)}</Td>
                  <Td className="text-xs capitalize">{p.payment_method || 'transfer'}</Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${
                      p.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                      p.status === 'verification' ? 'bg-amber-50 text-amber-700' :
                      p.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(p.created_at)}</Td>
                  <Td align="center">
                    {p.proof_url ? (
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-emerald-600 mx-auto">
                        <ExternalLink size={13} />
                      </a>
                    ) : <span className="text-slate-300 text-xs mx-auto block text-center">-</span>}
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Upload Payment Modal */}
        <Modal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Bukti Pembayaran" size="md">
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="label-field">Pilih Pinjaman <span className="text-red-400">*</span></label>
                <select className="input-field" value={form.loan_id} onChange={e => setField('loan_id', e.target.value)}>
                  <option value="">-- Pilih pinjaman aktif --</option>
                  {activeLoans.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.ref_number} · {formatIDR(l.amount)} · {l.status}
                    </option>
                  ))}
                </select>
                {activeLoans.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Tidak ada pinjaman aktif yang perlu dibayar</p>
                )}
              </div>
              <div>
                <label className="label-field">Jumlah Pembayaran (Rp) <span className="text-red-400">*</span></label>
                <input type="number" className="input-field" value={form.amount}
                  onChange={e => setField('amount', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label-field">Metode Pembayaran</label>
                <select className="input-field" value={form.payment_method} onChange={e => setField('payment_method', e.target.value)}>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                  <option value="virtual_account">Virtual Account</option>
                </select>
              </div>
              <div>
                <label className="label-field">Nomor Referensi Transfer</label>
                <input className="input-field" value={form.transfer_ref}
                  onChange={e => setField('transfer_ref', e.target.value)} placeholder="Nomor referensi dari bank (opsional)" />
              </div>
              <div>
                <label className="label-field">Bukti Transfer</label>
                <div className="mt-1 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-emerald-300 transition-colors">
                  <input type="file" accept="image/*,.pdf" className="hidden" id="proof-upload"
                    onChange={e => setProofFile(e.target.files[0])} />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    {proofFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <span className="text-sm font-600 text-emerald-700">{proofFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-400">Klik untuk upload bukti transfer</p>
                        <p className="text-xs text-slate-300 mt-0.5">JPG, PNG, PDF (maks 5MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <label className="label-field">Catatan (opsional)</label>
                <textarea className="input-field resize-none" rows={2} value={form.notes}
                  onChange={e => setField('notes', e.target.value)} placeholder="Catatan tambahan..." />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setUploadOpen(false)}>Batal</Button>
            <Button icon={Upload} loading={saving} onClick={handleSubmitPayment}>Kirim Bukti Bayar</Button>
          </ModalFooter>
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}
