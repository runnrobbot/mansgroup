import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { gadaiService, warehouseService } from '../../services'
import { formatDate, formatDateTime, generateRefNumber } from '../../lib/utils'
import { Truck, Eye, CheckCircle, Package, MapPin, Calendar, User, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'waiting_pickup', label: 'Menunggu Pickup', color: 'bg-amber-50 text-amber-700' },
  { value: 'picked_up', label: 'Sudah Dijemput', color: 'bg-blue-50 text-blue-700' },
  { value: 'received', label: 'Diterima Warehouse', color: 'bg-emerald-50 text-emerald-700' },
]

export default function StaffGadaiPickup() {
  const { profile } = useAuth()
  const confirm = useConfirm()
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [statusNote, setStatusNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('waiting_pickup')

  const load = async () => {
    setLoading(true)
    const { data } = await gadaiService.listAll({ status: filterStatus, limit: 50 })
    setGadais(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterStatus])

  const handleConfirmPickup = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Konfirmasi Penjemputan',
      message: `Konfirmasi bahwa barang dari ${selected.profiles?.full_name} sudah dijemput dan dalam perjalanan ke warehouse.`,
      variant: 'info',
      confirmLabel: 'Ya, Konfirmasi Pickup',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await gadaiService.updateStatus(selected.id, 'picked_up', statusNote, profile?.id)
    setActionLoading(false)
    if (!error) {
      toast.success('Status diperbarui: Barang sudah dijemput')
      setDetailOpen(false)
      load()
    } else {
      toast.error('Gagal memperbarui status')
    }
  }

  const handleReceiveWarehouse = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Konfirmasi Penerimaan Warehouse?',
      message: `Konfirmasi bahwa barang dari ${selected.profiles?.full_name} sudah diterima dan dicatat di warehouse. Gadai akan diaktifkan.`,
      variant: 'info',
      confirmLabel: 'Ya, Terima & Aktifkan',
    })
    if (!ok) return

    setActionLoading(true)
    // Update gadai status to received/active
    const { error: gadaiError } = await gadaiService.updateStatus(selected.id, 'received', statusNote, profile?.id)

    if (!gadaiError) {
      // Add to warehouse
      const inventoryCode = generateRefNumber('WH')
      await warehouseService.addItem({
        gadai_id: selected.id,
        inventory_code: inventoryCode,
        item_name: selected.item_name || 'Barang Gadai',
        category: selected.item_category || 'umum',
        condition: 'baik',
        estimated_value: selected.loan_amount || 0,
        status: 'stored',
        notes: statusNote,
      })
      toast.success('Barang diterima dan dicatat di warehouse!')
      setDetailOpen(false)
      load()
    } else {
      toast.error('Gagal memperbarui status')
    }
    setActionLoading(false)
  }

  const openDetail = (item) => {
    setSelected(item)
    setStatusNote('')
    setDetailOpen(true)
  }

  const tabs = [
    { value: 'waiting_pickup', label: 'Menunggu Pickup', icon: Clock },
    { value: 'picked_up', label: 'Dalam Perjalanan', icon: Truck },
    { value: 'received', label: 'Diterima', icon: CheckCircle },
  ]

  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Penjemputan Gadai</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kelola jadwal dan konfirmasi penjemputan barang jaminan</p>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilterStatus(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                filterStatus === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>Ref</Th>
              <Th>Pemohon</Th>
              <Th>Barang</Th>
              <Th>Jadwal Pickup</Th>
              <Th>Alamat</Th>
              <Th>Status</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : gadais.length === 0 ? (
                <EmptyRow colSpan={7} message="Tidak ada jadwal penjemputan" />
              ) : gadais.map(g => (
                <Tr key={g.id}>
                  <Td><span className="font-600 text-xs font-mono">{g.ref_number || g.id?.slice(0,8)}</span></Td>
                  <Td>
                    <div>
                      <p className="font-600 text-sm text-slate-900">{g.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{g.profiles?.phone || '-'}</p>
                    </div>
                  </Td>
                  <Td>
                    <div>
                      <p className="text-sm font-500">{g.item_name || '-'}</p>
                      <p className="text-xs text-slate-400">{g.item_category || '-'}</p>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-600">
                    {g.pickup_schedule ? (
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        {formatDateTime(g.pickup_schedule)}
                      </div>
                    ) : '-'}
                  </Td>
                  <Td className="text-xs text-slate-500 max-w-40">
                    <div className="flex items-start gap-1 truncate">
                      <MapPin size={11} className="text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{g.pickup_address || '-'}</span>
                    </div>
                  </Td>
                  <Td><StatusBadge status={g.status} /></Td>
                  <Td align="center">
                    <button
                      onClick={() => openDetail(g)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 mx-auto transition-colors"
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
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Penjemputan" size="md">
          {selected && (
            <>
              <ModalBody>
                {/* Pemohon */}
                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User size={17} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-700 text-slate-900">{selected.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-500">{selected.profiles?.phone || selected.profiles?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: 'Ref. Nomor', value: selected.ref_number || '-' },
                    { label: 'Status', value: <StatusBadge status={selected.status} /> },
                    { label: 'Nama Barang', value: selected.item_name || '-' },
                    { label: 'Kategori', value: selected.item_category || '-' },
                    { label: 'Estimasi Nilai', value: selected.item_estimated_value ? `Rp ${selected.item_estimated_value?.toLocaleString('id')}` : '-' },
                    { label: 'Jumlah Pinjaman', value: selected.loan_amount ? `Rp ${selected.loan_amount?.toLocaleString('id')}` : '-' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Pickup Info */}
                <div className="space-y-3 mb-5 bg-blue-50/60 rounded-xl p-4 border border-blue-100">
                  <p className="text-xs font-700 text-blue-700 uppercase tracking-wide">Info Penjemputan</p>
                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Jadwal</p>
                      <p className="text-sm font-600 text-slate-900">{selected.pickup_schedule ? formatDateTime(selected.pickup_schedule) : 'Belum dijadwalkan'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">Alamat Pickup</p>
                      <p className="text-sm font-600 text-slate-900">{selected.pickup_address || '-'}</p>
                    </div>
                  </div>
                </div>

                {selected.item_photos && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-400 mb-2">Foto Barang</p>
                    <a href={selected.item_photos} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-600 text-emerald-600 underline">Lihat Foto</a>
                  </div>
                )}

                <div>
                  <label className="label-field">Catatan Pickup</label>
                  <textarea
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Catatan kondisi barang, hambatan pickup, dll..."
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setDetailOpen(false)}>Tutup</Button>
                {selected.status === 'waiting_pickup' && (
                  <Button icon={Truck} loading={actionLoading} onClick={handleConfirmPickup}>
                    Konfirmasi Pickup
                  </Button>
                )}
                {selected.status === 'picked_up' && (
                  <Button icon={Package} loading={actionLoading} onClick={handleReceiveWarehouse}>
                    Terima di Warehouse
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}
