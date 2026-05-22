import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService } from '../../services'
import { formatIDR, formatDate, formatDateTime, calculateGadaiSimulation } from '../../lib/utils'
import { Plus, Eye, RefreshCw, AlertTriangle, Calendar, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_INFO = {
  pending: { label: 'Menunggu Review', color: 'bg-slate-100 text-slate-600' },
  review: { label: 'Direview Staff', color: 'bg-blue-50 text-blue-700' },
  waiting_pickup: { label: 'Menunggu Penjemputan', color: 'bg-amber-50 text-amber-700' },
  picked_up: { label: 'Barang Dijemput', color: 'bg-violet-50 text-violet-700' },
  received: { label: 'Diterima Warehouse', color: 'bg-blue-50 text-blue-700' },
  active: { label: 'Aktif Digadai', color: 'bg-emerald-50 text-emerald-700' },
  due: { label: 'Jatuh Tempo', color: 'bg-amber-50 text-amber-700' },
  extended: { label: 'Diperpanjang', color: 'bg-teal-50 text-teal-700' },
  overdue: { label: 'Telat Bayar', color: 'bg-red-50 text-red-700' },
  completed: { label: 'Lunas', color: 'bg-emerald-100 text-emerald-800' },
  forfeited: { label: 'Disita', color: 'bg-red-100 text-red-800' },
  rejected: { label: 'Ditolak', color: 'bg-red-50 text-red-700' },
}

export default function MyGadaiPage() {
  const { profile } = useAuth()
  const confirm = useConfirm()
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    if (!profile) return
    const { data } = await gadaiService.getByUserId(profile.id)
    setGadais(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  const handleExtend = async (gadai) => {
    const sim = calculateGadaiSimulation(gadai.loan_amount || 0)
    const ok = await confirm({
      title: 'Perpanjang Gadai?',
      message: `Masa gadai akan diperpanjang 1 bulan dengan biaya perpanjangan ${formatIDR(sim.extensionFee)} (10% dari nilai pinjaman).`,
      variant: 'warning',
      confirmLabel: 'Ya, Perpanjang',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await gadaiService.updateStatus(gadai.id, 'extended', 'Perpanjangan oleh user')
    if (!error) {
      toast.success('Gadai berhasil diperpanjang')
      load()
    } else {
      toast.error('Gagal memperpanjang gadai')
    }
    setActionLoading(false)
  }

  const stats = {
    active: gadais.filter(g => g.status === 'active').length,
    total: gadais.length,
    pending: gadais.filter(g => ['pending', 'review', 'waiting_pickup'].includes(g.status)).length,
  }

  return (
    <DashboardLayout role="user">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Gadai Saya</h1>
            <p className="text-sm text-slate-500 mt-0.5">{gadais.length} total pengajuan gadai</p>
          </div>
          <Link to="/dashboard/gadai/apply" className="btn-primary text-sm py-2 px-4 rounded-lg flex items-center gap-1.5">
            <Plus size={14} />Ajukan Gadai
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Aktif Digadai</p>
            <p className="text-2xl font-800 text-emerald-700 mt-1">{stats.active}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Proses</p>
            <p className="text-2xl font-800 text-amber-700 mt-1">{stats.pending}</p>
          </div>
          <div className="card-premium p-4">
            <p className="text-xs text-slate-400">Total Pengajuan</p>
            <p className="text-2xl font-800 text-slate-900 mt-1">{stats.total}</p>
          </div>
        </div>

        {/* Alert for active/overdue */}
        {gadais.filter(g => g.status === 'overdue').length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-red-700">Ada Gadai yang Melewati Jatuh Tempo</p>
              <p className="text-xs text-red-500 mt-0.5">Segera lakukan pembayaran atau perpanjangan untuk menghindari penyitaan barang.</p>
            </div>
          </div>
        )}

        <Card>
          <Table>
            <TableHead>
              <Th>Ref</Th>
              <Th>Barang</Th>
              <Th>Nilai Pinjaman</Th>
              <Th>Status</Th>
              <Th>Jatuh Tempo</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : gadais.length === 0 ? (
                <EmptyRow colSpan={6} message="Belum ada gadai" />
              ) : gadais.map(g => (
                <Tr key={g.id}>
                  <Td><span className="font-600 text-xs font-mono">{g.ref_number || '-'}</span></Td>
                  <Td>
                    <div>
                      <p className="font-600 text-sm text-slate-900">{g.item_name || '-'}</p>
                      <p className="text-xs text-slate-400">{g.item_category || '-'}</p>
                    </div>
                  </Td>
                  <Td className="font-700">{formatIDR(g.loan_amount)}</Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_INFO[g.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_INFO[g.status]?.label || g.status}
                    </span>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {g.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {formatDate(g.due_date)}
                      </div>
                    ) : '-'}
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelected(g); setDetailOpen(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <Eye size={13} />
                      </button>
                      {['active', 'due', 'overdue'].includes(g.status) && (
                        <button onClick={() => handleExtend(g)} disabled={actionLoading}
                          className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-amber-600 transition-colors disabled:opacity-50">
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Detail Modal */}
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Gadai" size="md">
          {selected && (
            <ModalBody>
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Package size={17} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-700 text-slate-900">{selected.item_name || '-'}</p>
                      <p className="text-xs text-slate-500">{selected.item_category || '-'}</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_INFO[selected.status]?.color}`}>
                        {STATUS_INFO[selected.status]?.label || selected.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Ref. Nomor', value: selected.ref_number || '-' },
                    { label: 'Nilai Pinjaman', value: formatIDR(selected.loan_amount) },
                    { label: 'Jatuh Tempo', value: selected.due_date ? formatDate(selected.due_date) : '-' },
                    { label: 'Jadwal Pickup', value: selected.pickup_schedule ? formatDateTime(selected.pickup_schedule) : '-' },
                    { label: 'Tanggal Pengajuan', value: formatDateTime(selected.created_at) },
                    { label: 'Biaya Perpanjangan', value: formatIDR((selected.loan_amount || 0) * 0.1) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                {selected.staff_notes && (
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-700 text-blue-700">Catatan Staff</p>
                    <p className="text-xs text-blue-600 mt-0.5">{selected.staff_notes}</p>
                  </div>
                )}
                {['active', 'due', 'overdue'].includes(selected.status) && (
                  <Button icon={RefreshCw} className="w-full" loading={actionLoading}
                    onClick={() => { setDetailOpen(false); handleExtend(selected) }}>
                    Perpanjang Gadai (+{formatIDR((selected.loan_amount || 0) * 0.1)})
                  </Button>
                )}
              </div>
            </ModalBody>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}
