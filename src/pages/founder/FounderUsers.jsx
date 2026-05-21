import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { RoleBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody } from '../../components/ui/Modal'
import { profileService } from '../../services'
import { formatDate } from '../../lib/utils'
import { Users, UserCheck, ShieldCheck, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const ROLE_COLORS = { user: '#52B788', staff: '#3B82F6', admin: '#F59E0B', founder: '#8B5CF6' }
const stagger = { visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } }

export default function FounderUsers() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const LIMIT = 15

  // Load all users once for stats
  useEffect(() => {
    profileService.listAll({ limit: 500 }).then(({ data }) => setAllUsers(data || []))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await profileService.listAll({ page, limit: LIMIT, search, role })
    setUsers(res.data || [])
    setTotal(res.count || 0)
    setLoading(false)
  }, [page, search, role])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, role])

  const totalPages = Math.ceil(total / LIMIT)

  const roleCount = (r) => allUsers.filter(u => u.role === r).length
  const verifiedCount = allUsers.filter(u => u.kyc_status === 'verified').length

  const pieData = ['user', 'staff', 'admin', 'founder']
    .map(r => ({ name: r.charAt(0).toUpperCase() + r.slice(1), value: roleCount(r) }))
    .filter(d => d.value > 0)

  return (
    <DashboardLayout role="founder">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Semua User</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manajemen pengguna platform MansGroup</p>
        </div>

        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <StatCard label="Total User" value={allUsers.filter(u => u.role === 'user').length.toString()} icon={Users} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="KYC Verified" value={verifiedCount.toString()} icon={UserCheck} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Staff Aktif" value={roleCount('staff').toString()} icon={ShieldCheck} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Admin" value={roleCount('admin').toString()} icon={ShieldCheck} />
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input-field pl-8 text-sm w-52"
                  placeholder="Cari nama user..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select value={role} onChange={e => setRole(e.target.value)} className="input-field text-sm w-36">
                <option value="">Semua Role</option>
                {['user', 'staff', 'admin', 'founder'].map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <Table>
              <TableHead>
                <Th>Nama</Th><Th>Email</Th><Th>Role</Th><Th>KYC</Th><Th>Bergabung</Th><Th align="center">Detail</Th>
              </TableHead>
              <TableBody>
                {loading ? (
                  <tr><td colSpan={6} className="py-10 text-center">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td></tr>
                ) : users.length === 0 ? (
                  <EmptyRow colSpan={6} message="Tidak ada user" />
                ) : users.map(u => (
                  <Tr key={u.id}>
                    <Td className="font-500">{u.full_name || '-'}</Td>
                    <Td className="text-xs text-slate-500">{u.email || '-'}</Td>
                    <Td><RoleBadge role={u.role} /></Td>
                    <Td>
                      <span className={`badge ${u.kyc_status === 'verified' ? 'badge-success' : 'badge-gray'}`}>
                        {u.kyc_status || 'unverified'}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-400">{formatDate(u.created_at)}</Td>
                    <Td align="center">
                      <button onClick={() => setSelected(u)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                        <Eye size={14} />
                      </button>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-2">
                <p className="text-xs text-slate-400">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} dari {total}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={13} /></button>
                  <span className="px-3 py-1 text-xs font-600 text-slate-700">{page}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={13} /></button>
                </div>
              </div>
            )}
          </Card>

          {/* Role distribution pie */}
          <Card>
            <h2 className="text-sm font-700 text-slate-900 mb-5">Distribusi Role</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={ROLE_COLORS[entry.name.toLowerCase()] || '#94A3B8'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-12 text-center text-sm text-slate-400">Belum ada data</div>
            )}

            {/* KYC breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
              <p className="text-xs font-700 text-slate-500 uppercase tracking-wider">Status KYC</p>
              {[
                { label: 'Terverifikasi', count: allUsers.filter(u => u.kyc_status === 'verified').length, color: 'bg-emerald-500' },
                { label: 'Pending', count: allUsers.filter(u => u.kyc_status === 'pending').length, color: 'bg-amber-400' },
                { label: 'Belum Verifikasi', count: allUsers.filter(u => !u.kyc_status || u.kyc_status === 'unverified').length, color: 'bg-slate-300' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-xs text-slate-600">{label}</span>
                  </div>
                  <span className="text-xs font-700 text-slate-800">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detail User" size="sm">
        {selected && (
          <ModalBody>
            <div className="space-y-3">
              {[
                { label: 'Nama Lengkap', value: selected.full_name || '-' },
                { label: 'Email', value: selected.email || '-' },
                { label: 'No. HP', value: selected.phone || '-' },
                { label: 'Alamat', value: selected.address || '-' },
                { label: 'Role', value: <RoleBadge role={selected.role} /> },
                { label: 'KYC Status', value: selected.kyc_status || 'unverified' },
                { label: 'Bergabung', value: formatDate(selected.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-600 text-slate-800 text-right">{value}</span>
                </div>
              ))}
            </div>
          </ModalBody>
        )}
      </Modal>
    </DashboardLayout>
  )
}
