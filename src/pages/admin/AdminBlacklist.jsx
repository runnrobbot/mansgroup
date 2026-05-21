import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { blacklistService, profileService } from '../../services'
import { formatDate, formatDateTime } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Ban, ShieldCheck, Search, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const TYPE_COLORS = {
  overdue: 'bg-amber-50 text-amber-700',
  fraud: 'bg-red-50 text-red-700',
  default: 'bg-slate-100 text-slate-600',
}

export default function AdminBlacklist() {
  const { profile: admin } = useAuth()
  const confirm = useConfirm()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [users, setUsers] = useState([])
  const [searchUser, setSearchUser] = useState('')
  const [form, setForm] = useState({ user_id: '', reason: '', type: 'overdue' })
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await blacklistService.listAll()
    setList(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (searchUser.length > 1) {
      profileService.listAll({ search: searchUser, limit: 10 }).then(({ data }) => setUsers(data || []))
    }
  }, [searchUser])

  const handleAdd = async () => {
    if (!form.user_id || !form.reason.trim()) {
      toast.error('User dan alasan wajib diisi')
      return
    }
    const selectedUser = users.find(u => u.id === form.user_id)
    const ok = await confirm({
      title: 'Tambah ke Blacklist?',
      message: `${selectedUser?.full_name || 'User ini'} akan dimasukkan ke daftar blacklist (${form.type}). User tidak dapat mengajukan pinjaman baru.`,
      variant: 'danger',
      confirmLabel: 'Ya, Blacklist',
    })
    if (!ok) return

    setSaving(true)
    const { error } = await blacklistService.add(form.user_id, form.reason, form.type, admin?.id)
    setSaving(false)
    if (!error) {
      toast.success('User berhasil ditambahkan ke blacklist')
      setAddOpen(false)
      setForm({ user_id: '', reason: '', type: 'overdue' })
      setSearchUser('')
      load()
    } else {
      toast.error('Gagal menambahkan ke blacklist')
    }
  }

  const handleRemove = async (item) => {
    const ok = await confirm({
      title: 'Hapus dari Blacklist?',
      message: `${item.profiles?.full_name} akan dihapus dari daftar blacklist dan bisa mengajukan pinjaman kembali.`,
      variant: 'warning',
      confirmLabel: 'Ya, Hapus',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await blacklistService.remove(item.id, admin?.id)
    setActionLoading(false)
    if (!error) {
      toast.success('User berhasil dihapus dari blacklist')
      setDetailOpen(false)
      load()
    } else {
      toast.error('Gagal menghapus dari blacklist')
    }
  }

  const stats = {
    total: list.length,
    overdue: list.filter(i => i.type === 'overdue').length,
    fraud: list.filter(i => i.type === 'fraud').length,
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Blacklist Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kelola daftar user yang diblacklist</p>
          </div>
          <Button icon={Plus} onClick={() => setAddOpen(true)}>Tambah Blacklist</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Blacklist', value: stats.total, color: 'text-red-700' },
            { label: 'Overdue', value: stats.overdue, color: 'text-amber-700' },
            { label: 'Fraud', value: stats.fraud, color: 'text-red-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="card-premium p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`text-2xl font-800 mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>User</Th>
              <Th>Alasan</Th>
              <Th>Tipe</Th>
              <Th>Ditambahkan</Th>
              <Th>Oleh</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : list.length === 0 ? (
                <EmptyRow colSpan={6} message="Tidak ada user dalam blacklist" />
              ) : list.map(item => (
                <Tr key={item.id}>
                  <Td>
                    <div>
                      <p className="font-600 text-sm text-slate-900">{item.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{item.profiles?.email}</p>
                    </div>
                  </Td>
                  <Td className="text-sm text-slate-600 max-w-56">
                    <p className="truncate">{item.reason || '-'}</p>
                  </Td>
                  <Td>
                    <span className={`text-xs font-700 px-2 py-1 rounded-lg ${TYPE_COLORS[item.type] || TYPE_COLORS.default}`}>
                      {item.type?.toUpperCase()}
                    </span>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.added_at)}</Td>
                  <Td className="text-xs text-slate-500">{item.added_by_profile?.full_name || 'Admin'}</Td>
                  <Td align="center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelected(item); setDetailOpen(true) }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleRemove(item)}
                        disabled={actionLoading}
                        className="w-7 h-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-emerald-600 transition-colors disabled:opacity-50">
                        <ShieldCheck size={13} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Add Modal */}
        <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Tambah Blacklist" size="md">
          <ModalBody>
            <div className="space-y-4">
              <div>
                <label className="label-field">Cari User <span className="text-red-400">*</span></label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="input-field pl-9" value={searchUser}
                    onChange={e => setSearchUser(e.target.value)} placeholder="Cari nama atau email user..." />
                </div>
                {users.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {users.map(u => (
                      <button key={u.id} onClick={() => { setForm(f => ({ ...f, user_id: u.id })); setSearchUser(u.full_name) }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors ${form.user_id === u.id ? 'bg-emerald-50' : ''}`}>
                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-700">
                          {u.full_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-600 text-slate-900">{u.full_name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                        {form.user_id === u.id && <span className="ml-auto text-xs text-emerald-600 font-700">✓ Dipilih</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="label-field">Tipe Blacklist</label>
                <select className="input-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="overdue">Overdue - Gagal Bayar</option>
                  <option value="fraud">Fraud - Penipuan</option>
                  <option value="default">Default</option>
                </select>
              </div>
              <div>
                <label className="label-field">Alasan <span className="text-red-400">*</span></label>
                <textarea className="input-field resize-none" rows={3}
                  value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Jelaskan alasan blacklist secara detail..." />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button variant="danger" icon={Ban} loading={saving} onClick={handleAdd}>Blacklist User</Button>
          </ModalFooter>
        </Modal>

        {/* Detail Modal */}
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Blacklist" size="sm">
          {selected && (
            <>
              <ModalBody>
                <div className="space-y-4">
                  <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <p className="font-700 text-red-900">{selected.profiles?.full_name}</p>
                    <p className="text-sm text-red-600">{selected.profiles?.email}</p>
                  </div>
                  {[
                    { label: 'Tipe', value: <span className={`text-xs font-700 px-2 py-1 rounded-lg ${TYPE_COLORS[selected.type]}`}>{selected.type?.toUpperCase()}</span> },
                    { label: 'Alasan', value: selected.reason },
                    { label: 'Ditambahkan', value: formatDateTime(selected.added_at) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setDetailOpen(false)}>Tutup</Button>
                <Button icon={ShieldCheck} loading={actionLoading} onClick={() => handleRemove(selected)}>
                  Hapus dari Blacklist
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
