import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { loanService, gadaiService, kycService } from '../../services'
import { formatIDR, formatDate, formatDateTime } from '../../lib/utils'
import { Eye, CheckCircle, XCircle, MessageSquare, ClipboardList } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function StaffReviewQueue() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('loans')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    if (tab === 'loans') {
      const { data } = await loanService.listAll({ status: 'pending', limit: 50 })
      setItems(data || [])
    } else if (tab === 'gadai') {
      const { data } = await gadaiService.listAll({ status: 'pending', limit: 50 })
      setItems(data || [])
    } else {
      const { data } = await kycService.listPending()
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const handleAction = async (action) => {
    if (!selected) return
    setActionLoading(true)
    const newStatus = action === 'approve' ? 'review' : 'rejected'

    let error
    if (tab === 'loans') {
      const r = await loanService.updateStatus(selected.id, newStatus, notes, profile?.id)
      error = r.error
    } else if (tab === 'gadai') {
      const r = await gadaiService.updateStatus(selected.id, newStatus, notes, profile?.id)
      error = r.error
    } else {
      const r = await kycService.updateStatus(selected.id, newStatus === 'review' ? 'verified' : 'rejected', notes)
      error = r.error
    }

    setActionLoading(false)
    if (!error) {
      toast.success(action === 'approve' ? 'Diteruskan ke admin' : 'Pengajuan ditolak')
      setModalOpen(false)
      setSelected(null)
      setNotes('')
      load()
    } else {
      toast.error('Gagal memproses')
    }
  }

  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Antrian Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">Review dan verifikasi pengajuan masuk</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {[
            { id: 'loans', label: 'Pinjaman', icon: ClipboardList },
            { id: 'gadai', label: 'Gadai', icon: ClipboardList },
            { id: 'kyc', label: 'KYC', icon: ClipboardList },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>Ref. / ID</Th>
              <Th>Pemohon</Th>
              <Th>Jumlah</Th>
              <Th>Tanggal</Th>
              <Th>Status</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={6} message="Tidak ada antrian review" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-600 text-xs">{item.ref_number || item.id?.slice(0, 8)}</span></Td>
                  <Td>
                    <div>
                      <p className="font-500 text-slate-900 text-sm">{item.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{item.profiles?.email}</p>
                    </div>
                  </Td>
                  <Td className="font-600">{formatIDR(item.amount || item.loan_amount)}</Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.created_at)}</Td>
                  <Td><StatusBadge status={item.status} /></Td>
                  <Td align="center">
                    <button
                      onClick={() => { setSelected(item); setModalOpen(true) }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 mx-auto"
                    >
                      <Eye size={15} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Detail Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Review Pengajuan" size="lg">
          {selected && (
            <>
              <ModalBody>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: 'Ref. Nomor', value: selected.ref_number || '-' },
                    { label: 'Status', value: <StatusBadge status={selected.status} /> },
                    { label: 'Pemohon', value: selected.profiles?.full_name || '-' },
                    { label: 'Email', value: selected.profiles?.email || '-' },
                    { label: 'Jumlah', value: formatIDR(selected.amount || selected.loan_amount) },
                    { label: 'Tanggal Pengajuan', value: formatDateTime(selected.created_at) },
                    ...(selected.tenor ? [{ label: 'Tenor', value: `${selected.tenor} bulan` }] : []),
                    ...(selected.occupation ? [{ label: 'Pekerjaan', value: selected.occupation }] : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="label-field">Catatan Staff</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Tambahkan catatan review..."
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button>
                <Button
                  variant="danger"
                  icon={XCircle}
                  loading={actionLoading}
                  onClick={() => handleAction('reject')}
                >
                  Tolak
                </Button>
                <Button
                  icon={CheckCircle}
                  loading={actionLoading}
                  onClick={() => handleAction('approve')}
                >
                  Teruskan ke Admin
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  )
}
