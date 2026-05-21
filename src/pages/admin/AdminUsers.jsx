import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { RoleBadge, StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { profileService, blacklistService, loanService } from '../../services'
import { formatDate, formatDateTime, getInitials } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Eye, ShieldBan, ShieldCheck, UserCog, Ban, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLES = ['user', 'staff', 'admin', 'founder']
const KYC_COLORS = {
  verified: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-700',
  unverified: 'bg-slate-100 text-slate-500',
}

export default function AdminUsers() {
  const { profile: currentAdmin } = useAuth()
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [blacklistOpen, setBlacklistOpen] = useState(false)
  const [blacklistReason, setBlacklistReason] = useState('')
  const [blacklistType, setBlacklistType] = useState('overdue')
  const [actionLoading, setActionLoading] = useState(false)
  const [userLoans, setUserLoans] = useState([])

  const load = async () => {
    setLoading(true)
    const { data } = await profileService.listAll({ search, role: filterRole, limit: 30 })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [search, filterRole])

  const openDetail = async (user) => {
    setSelected(user)
    setDetailOpen(true)
    const { data } = await loanService.listAll({ limit: 5 })
    setUserLoans((data || []).filter(l => l.user_id === user.id))
  }

  const handleRoleChange = async (newRole) => {
    if (!selected) return
    const ok = await confirm({
      title: `Ubah Role ke ${newRole}?`,
      message: `Role ${selected.full_name} akan diubah dari ${selected.role} ke ${newRole}. Perubahan ini akan berpengaruh pada akses pengguna.`,
      variant: 'warning',
      confirmLabel: 'Ya, Ubah Role',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await profileService.updateRole(selected.id, newRole)
    setActionLoading(false)
    if (!error) {
      toast.success(`Role berhasil diubah ke ${newRole}`)
      setRoleOpen(false)
      setSelected(s => ({ ...s, role: newRole }))
      load()
    } else {
      toast.error('Gagal mengubah role')
    }
  }

  const handleAddBlacklist = async () => {
    if (!selected || !blacklistReason.trim()) {
      toast.error('Alasan blacklist wajib diisi')
      return
    }
    const ok = await confirm({
      title: 'Tambah ke Blacklist?',
      message: `${selected.full_name} akan dimasukkan ke daftar blacklist dengan alasan: "${blacklistReason}". User tidak dapat mengajukan pinjaman baru.`,
      variant: 'danger',
      confirmLabel: 'Ya, Blacklist',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await blacklistService.add(selected.id, blacklistReason, blacklistType, currentAdmin?.id)
    setActionLoading(false)
    if (!error) {
      toast.success('User berhasil diblacklist')
      setBlacklistOpen(false)
      setBlacklistReason('')
    } else {
      toast.error('Gagal memblacklist user')
    }
  }

  const handleSuspend = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Suspend Akun?',
      message: `Akun ${selected.full_name} akan disuspend. User tidak dapat login selama akun disuspend.`,
      variant: 'danger',
      confirmLabel: 'Ya, Suspend',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await profileService.update(selected.id, { is_suspended: true, suspended_at: new Date().toISOString() })
    setActionLoading(false)
    if (!error) {
      toast.success('Akun berhasil disuspend')
      setSelected(s => ({ ...s, is_suspended: true }))
      load()
    } else {
      toast.error('Gagal suspend akun')
    }
  }

  const handleUnsuspend = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Aktifkan Akun?',
      message: `Akun ${selected.full_name} akan diaktifkan kembali.`,
      variant: 'info',
      confirmLabel: 'Ya, Aktifkan',
    })
    if (!ok) return

    setActionLoading(true)
    const { error } = await profileService.update(selected.id, { is_suspended: false, suspended_at: null })
    setActionLoading(false)
    if (!error) {
      toast.success('Akun berhasil diaktifkan')
      setSelected(s => ({ ...s, is_suspended: false }))
      load()
    } else {
      toast.error('Gagal mengaktifkan akun')
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Kelola User</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen akun, role, dan status pengguna</p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input-field pl-9 text-sm" placeholder="Cari nama user..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field text-sm w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Semua Role</option>
            {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>Nama</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>KYC</Th>
              <Th>Status</Th>
              <Th>Terdaftar</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : users.length === 0 ? (
                <EmptyRow colSpan={7} message="Tidak ada user ditemukan" />
              ) : users.map(u => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-xs font-700 text-slate-600 flex-shrink-0">
                        {getInitials(u.full_name)}
                      </div>
                      <span className="font-600 text-sm text-slate-900">{u.full_name || '-'}</span>
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-500">{u.email || '-'}</Td>
                  <Td><RoleBadge role={u.role} /></Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${KYC_COLORS[u.kyc_status] || KYC_COLORS.unverified}`}>
                      {u.kyc_status || 'unverified'}
                    </span>
                  </Td>
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${u.is_suspended ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {u.is_suspended ? 'Suspended' : 'Aktif'}
                    </span>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(u.created_at)}</Td>
                  <Td align="center">
                    <button onClick={() => openDetail(u)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                      <Eye size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Detail Modal */}
        <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setRoleOpen(false); setBlacklistOpen(false) }} title="Detail User" size="lg">
          {selected && (
            <>
              <ModalBody>
                {/* User Header */}
                <div className="flex items-start gap-4 mb-6 pb-5 border-b border-slate-100">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-800 text-slate-600 flex-shrink-0">
                    {getInitials(selected.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-800 text-slate-900">{selected.full_name || '-'}</h3>
                    <p className="text-sm text-slate-500">{selected.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <RoleBadge role={selected.role} />
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-lg ${KYC_COLORS[selected.kyc_status] || KYC_COLORS.unverified}`}>
                        KYC: {selected.kyc_status || 'unverified'}
                      </span>
                      <span className={`text-xs font-600 px-2 py-0.5 rounded-lg ${selected.is_suspended ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {selected.is_suspended ? 'Suspended' : 'Aktif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { label: 'NIK', value: selected.nik || '-' },
                    { label: 'No. HP', value: selected.phone || '-' },
                    { label: 'Pekerjaan', value: selected.occupation || '-' },
                    { label: 'Penghasilan', value: selected.monthly_income ? `Rp ${selected.monthly_income?.toLocaleString('id')}` : '-' },
                    { label: 'Terdaftar', value: formatDateTime(selected.created_at) },
                    { label: 'Update Terakhir', value: formatDateTime(selected.updated_at) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Loans */}
                {userLoans.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-700 text-slate-500 uppercase tracking-wide mb-2">Riwayat Pinjaman</p>
                    <div className="space-y-2">
                      {userLoans.map(l => (
                        <div key={l.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                          <div>
                            <span className="text-xs font-700 text-slate-700">{l.ref_number}</span>
                            <span className="text-xs text-slate-400 ml-2">{formatDate(l.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-700">{l.amount ? `Rp ${l.amount.toLocaleString('id')}` : '-'}</span>
                            <StatusBadge status={l.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change Role Accordion */}
                <div className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
                  <button onClick={() => setRoleOpen(!roleOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <UserCog size={15} className="text-slate-500" />
                      <span className="text-sm font-600 text-slate-900">Ubah Role</span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${roleOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {roleOpen && (
                    <div className="px-4 pb-4 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mt-3 mb-3">Role saat ini: <span className="font-700">{selected.role}</span></p>
                      <div className="flex flex-wrap gap-2">
                        {ROLES.filter(r => r !== selected.role).map(r => (
                          <button key={r} onClick={() => handleRoleChange(r)}
                            disabled={actionLoading}
                            className="text-xs font-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-colors disabled:opacity-50">
                            Ubah ke {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Blacklist Accordion */}
                <div className="border border-red-100 rounded-xl overflow-hidden">
                  <button onClick={() => setBlacklistOpen(!blacklistOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Ban size={15} className="text-red-500" />
                      <span className="text-sm font-600 text-red-700">Tambah ke Blacklist</span>
                    </div>
                    <ChevronDown size={14} className={`text-red-400 transition-transform ${blacklistOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {blacklistOpen && (
                    <div className="px-4 pb-4 border-t border-red-50 bg-red-50/30">
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="label-field">Tipe Blacklist</label>
                          <select className="input-field text-sm" value={blacklistType} onChange={e => setBlacklistType(e.target.value)}>
                            <option value="overdue">Overdue</option>
                            <option value="fraud">Fraud</option>
                            <option value="default">Default</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-field">Alasan <span className="text-red-400">*</span></label>
                          <textarea className="input-field resize-none text-sm" rows={2}
                            value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)}
                            placeholder="Alasan blacklist..." />
                        </div>
                        <Button variant="danger" icon={Ban} size="sm" loading={actionLoading} onClick={handleAddBlacklist} className="w-full">
                          Blacklist User Ini
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setDetailOpen(false)}>Tutup</Button>
                {selected.is_suspended ? (
                  <Button icon={ShieldCheck} loading={actionLoading} onClick={handleUnsuspend}>Aktifkan Akun</Button>
                ) : (
                  <Button variant="danger" icon={ShieldBan} loading={actionLoading} onClick={handleSuspend}>Suspend Akun</Button>
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
