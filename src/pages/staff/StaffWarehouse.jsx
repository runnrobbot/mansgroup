import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { warehouseService } from '../../services'
import { formatDate, formatIDR, generateRefNumber } from '../../lib/utils'
import { Warehouse, Plus, Eye, Edit, Package, Tag, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Elektronik', 'Perhiasan', 'Kendaraan', 'Tas & Fashion', 'Jam Tangan', 'Lainnya']
const CONDITIONS = ['Sangat Baik', 'Baik', 'Cukup', 'Kurang Baik']
const STATUSES = ['stored', 'active', 'returned', 'forfeited']
const STATUS_LABELS = { stored: 'Tersimpan', active: 'Aktif Digadai', returned: 'Dikembalikan', forfeited: 'Disita' }
const STATUS_COLORS = {
  stored: 'bg-blue-50 text-blue-700',
  active: 'bg-emerald-50 text-emerald-700',
  returned: 'bg-slate-100 text-slate-600',
  forfeited: 'bg-red-50 text-red-700',
}

const emptyForm = {
  inventory_code: '',
  item_name: '',
  category: '',
  condition: 'Baik',
  estimated_value: '',
  storage_location: '',
  notes: '',
  status: 'stored',
}

export default function StaffWarehouse() {
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await warehouseService.listAll({ limit: 100, category: filterCategory })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterCategory])

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleAdd = async () => {
    if (!form.item_name || !form.category) {
      toast.error('Nama barang dan kategori wajib diisi')
      return
    }
    const ok = await confirm({
      title: 'Tambah Item Warehouse?',
      message: `Item "${form.item_name}" akan ditambahkan ke inventory warehouse.`,
      variant: 'info',
      confirmLabel: 'Ya, Tambahkan',
    })
    if (!ok) return

    setSaving(true)
    const code = form.inventory_code || generateRefNumber('WH')
    const { error } = await warehouseService.addItem({
      ...form,
      inventory_code: code,
      estimated_value: Number(form.estimated_value) || 0,
    })
    setSaving(false)
    if (!error) {
      toast.success('Item berhasil ditambahkan ke warehouse')
      setAddOpen(false)
      setForm(emptyForm)
      load()
    } else {
      toast.error('Gagal menambah item')
    }
  }

  const handleEdit = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Simpan Perubahan?',
      message: 'Data item warehouse akan diperbarui.',
      variant: 'warning',
      confirmLabel: 'Ya, Simpan',
    })
    if (!ok) return

    setSaving(true)
    const { error } = await warehouseService.updateItem(selected.id, {
      ...form,
      estimated_value: Number(form.estimated_value) || 0,
    })
    setSaving(false)
    if (!error) {
      toast.success('Item berhasil diperbarui')
      setEditOpen(false)
      load()
    } else {
      toast.error('Gagal memperbarui item')
    }
  }

  const handleStatusChange = async (item, newStatus) => {
    const ok = await confirm({
      title: `Ubah Status ke ${STATUS_LABELS[newStatus]}?`,
      message: `Status item "${item.item_name}" akan diubah ke ${STATUS_LABELS[newStatus]}.`,
      variant: newStatus === 'forfeited' ? 'danger' : 'warning',
      confirmLabel: 'Ya, Ubah',
    })
    if (!ok) return

    const { error } = await warehouseService.updateItem(item.id, { status: newStatus })
    if (!error) {
      toast.success(`Status diubah ke ${STATUS_LABELS[newStatus]}`)
      load()
    } else {
      toast.error('Gagal mengubah status')
    }
  }

  const openEdit = (item) => {
    setSelected(item)
    setForm({
      inventory_code: item.inventory_code || '',
      item_name: item.item_name || '',
      category: item.category || '',
      condition: item.condition || 'Baik',
      estimated_value: item.estimated_value?.toString() || '',
      storage_location: item.storage_location || '',
      notes: item.notes || '',
      status: item.status || 'stored',
    })
    setEditOpen(true)
  }

  const stats = {
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    stored: items.filter(i => i.status === 'stored').length,
    totalValue: items.reduce((s, i) => s + (i.estimated_value || 0), 0),
  }

  const FormFields = ({ data, onChange }) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label-field">Kode Inventory</label>
        <input className="input-field" value={data.inventory_code} onChange={e => onChange('inventory_code', e.target.value)} placeholder="Auto-generate jika kosong" />
      </div>
      <div>
        <label className="label-field">Nama Barang <span className="text-red-400">*</span></label>
        <input className="input-field" value={data.item_name} onChange={e => onChange('item_name', e.target.value)} placeholder="Nama barang" />
      </div>
      <div>
        <label className="label-field">Kategori <span className="text-red-400">*</span></label>
        <select className="input-field" value={data.category} onChange={e => onChange('category', e.target.value)}>
          <option value="">Pilih Kategori</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label-field">Kondisi</label>
        <select className="input-field" value={data.condition} onChange={e => onChange('condition', e.target.value)}>
          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label-field">Estimasi Nilai (Rp)</label>
        <input type="number" className="input-field" value={data.estimated_value} onChange={e => onChange('estimated_value', e.target.value)} placeholder="0" />
      </div>
      <div>
        <label className="label-field">Lokasi Penyimpanan</label>
        <input className="input-field" value={data.storage_location} onChange={e => onChange('storage_location', e.target.value)} placeholder="Rak A, Lantai 2, dll" />
      </div>
      <div className="col-span-2">
        <label className="label-field">Catatan</label>
        <textarea className="input-field resize-none" rows={2} value={data.notes} onChange={e => onChange('notes', e.target.value)} placeholder="Catatan kondisi atau keterangan tambahan" />
      </div>
    </div>
  )

  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Warehouse Collateral</h1>
            <p className="text-sm text-slate-500 mt-0.5">Inventori dan manajemen barang jaminan gadai</p>
          </div>
          <Button icon={Plus} onClick={() => { setForm(emptyForm); setAddOpen(true) }}>
            Tambah Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Item', value: stats.total, icon: Package, color: 'text-slate-700' },
            { label: 'Aktif Digadai', value: stats.active, icon: Tag, color: 'text-emerald-600' },
            { label: 'Tersimpan', value: stats.stored, icon: Warehouse, color: 'text-blue-600' },
            { label: 'Total Nilai', value: formatIDR(stats.totalValue), icon: DollarSign, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card-premium p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-500">{label}</p>
                <Icon size={15} className={color} />
              </div>
              <p className={`text-lg font-800 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCategory('')}
            className={`text-xs font-600 px-3 py-1.5 rounded-lg transition-colors ${!filterCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Semua
          </button>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setFilterCategory(c)}
              className={`text-xs font-600 px-3 py-1.5 rounded-lg transition-colors ${filterCategory === c ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>Kode Inventory</Th>
              <Th>Barang</Th>
              <Th>Kategori</Th>
              <Th>Kondisi</Th>
              <Th>Est. Nilai</Th>
              <Th>Lokasi</Th>
              <Th>Masuk</Th>
              <Th>Status</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={9} message="Tidak ada item di warehouse" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-700 text-xs font-mono text-emerald-700">{item.inventory_code || '-'}</span></Td>
                  <Td>
                    <p className="font-600 text-sm text-slate-900">{item.item_name || '-'}</p>
                    <p className="text-xs text-slate-400">{item.gadai_applications?.ref_number || '-'}</p>
                  </Td>
                  <Td className="text-xs">{item.category || '-'}</Td>
                  <Td className="text-xs">{item.condition || '-'}</Td>
                  <Td className="font-600 text-sm">{formatIDR(item.estimated_value)}</Td>
                  <Td className="text-xs text-slate-500">{item.storage_location || '-'}</Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.received_at)}</Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelected(item); setDetailOpen(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => openEdit(item)}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <Edit size={13} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Add Modal */}
        <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Item Warehouse" size="lg">
          <ModalBody>
            <FormFields data={form} onChange={setField} />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button icon={Plus} loading={saving} onClick={handleAdd}>Simpan Item</Button>
          </ModalFooter>
        </Modal>

        {/* Edit Modal */}
        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit Item Warehouse" size="lg">
          <ModalBody>
            <FormFields data={form} onChange={setField} />
            <div className="mt-4 pt-4 border-t border-slate-100">
              <label className="label-field">Update Status</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {STATUSES.map(s => (
                  <button key={s}
                    onClick={() => handleStatusChange(selected, s)}
                    className={`text-xs font-600 px-3 py-1.5 rounded-lg border transition-colors ${
                      selected?.status === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button loading={saving} onClick={handleEdit}>Simpan Perubahan</Button>
          </ModalFooter>
        </Modal>

        {/* Detail Modal */}
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Item" size="md">
          {selected && (
            <ModalBody>
              <div className="space-y-4">
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                  <p className="text-xs font-700 text-emerald-700 uppercase tracking-wide mb-1">Kode Inventory</p>
                  <p className="text-xl font-800 text-emerald-800 font-mono">{selected.inventory_code || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Nama Barang', value: selected.item_name },
                    { label: 'Kategori', value: selected.category },
                    { label: 'Kondisi', value: selected.condition },
                    { label: 'Lokasi Penyimpanan', value: selected.storage_location || '-' },
                    { label: 'Estimasi Nilai', value: formatIDR(selected.estimated_value) },
                    { label: 'Tanggal Masuk', value: formatDate(selected.received_at) },
                    { label: 'Status', value: <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span> },
                    { label: 'Ref. Gadai', value: selected.gadai_applications?.ref_number || '-' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                {selected.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">Catatan</p>
                    <p className="text-sm text-slate-600">{selected.notes}</p>
                  </div>
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
