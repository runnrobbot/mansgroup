import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { analyticsService } from '../../services'
import { formatIDR } from '../../lib/utils'
import {
  TrendingUp, Users, CreditCard, Package, AlertOctagon,
  DollarSign, Activity, BarChart3
} from 'lucide-react'
import { format, subMonths, startOfMonth } from 'date-fns'

const COLORS = ['#2D6A4F', '#52B788', '#74C69D', '#95D5B2']

const stagger = { visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

function buildMonthlyData(loans, gadais) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return { month: format(d, 'MMM'), key: format(d, 'yyyy-MM'), loans: 0, gadai: 0, revenue: 0 }
  })
  loans.forEach(l => {
    const key = l.created_at?.slice(0, 7)
    const m = months.find(m => m.key === key)
    if (m) { m.loans++; m.revenue += l.amount * 0.05 }
  })
  gadais.forEach(g => {
    const key = g.created_at?.slice(0, 7)
    const m = months.find(m => m.key === key)
    if (m) { m.gadai++; m.revenue += (g.loan_amount || 0) * 0.05 }
  })
  return months
}

export default function FounderDashboard() {
  const [data, setData] = useState({ loans: [], gadai: [], payments: [], users: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsService.getSummary().then(d => {
      setData(d)
      setLoading(false)
    })
  }, [])

  const totalDisbursed = data.loans.filter(l => l.status === 'disbursed').reduce((s, l) => s + (l.amount || 0), 0)
  const activeLoans = data.loans.filter(l => l.status === 'disbursed').length
  const overdueLoans = data.loans.filter(l => l.status === 'overdue').length
  const totalLoans = data.loans.length
  const nplRate = totalLoans ? ((overdueLoans / totalLoans) * 100).toFixed(1) : 0
  const totalUsers = data.users.filter(u => u.role === 'user').length
  const totalRevenue = data.payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0)
  const activeGadai = data.gadai.filter(g => g.status === 'active').length

  const monthlyData = buildMonthlyData(data.loans, data.gadai)

  const loanStatusData = [
    { name: 'Aktif', value: activeLoans },
    { name: 'Selesai', value: data.loans.filter(l => l.status === 'completed').length },
    { name: 'Overdue', value: overdueLoans },
    { name: 'Pending', value: data.loans.filter(l => l.status === 'pending').length },
  ].filter(d => d.value > 0)

  const Skeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  )

  return (
    <DashboardLayout role="founder">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview performa MansGroup secara real-time</p>
        </div>

        {loading ? <Skeleton /> : (
          <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <StatCard label="Total Revenue" value={formatIDR(totalRevenue)} icon={DollarSign} change="vs bulan lalu" changeType="positive" />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard label="Total Disalurkan" value={formatIDR(totalDisbursed)} icon={TrendingUp} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard label="Pinjaman Aktif" value={activeLoans.toString()} icon={CreditCard} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard label="Total Borrower" value={totalUsers.toString()} icon={Users} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard label="Gadai Aktif" value={activeGadai.toString()} icon={Package} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard
                label="NPL Rate"
                value={`${nplRate}%`}
                icon={AlertOctagon}
                change={`${overdueLoans} pinjaman overdue`}
                changeType={nplRate > 5 ? 'negative' : 'positive'}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard label="Total Pengajuan" value={totalLoans.toString()} icon={Activity} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <StatCard label="Total Gadai" value={data.gadai.length.toString()} icon={BarChart3} />
            </motion.div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Monthly revenue chart */}
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-700 text-slate-900">Pertumbuhan Bulanan</h2>
                <p className="text-xs text-slate-400 mt-0.5">6 bulan terakhir</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barSize={20} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: '#F8FAFC' }}
                />
                <Bar dataKey="loans" name="Pinjaman" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gadai" name="Gadai" fill="#95D5B2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Loan status pie */}
          <Card>
            <h2 className="text-sm font-700 text-slate-900 mb-6">Status Pinjaman</h2>
            {loanStatusData.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">Belum ada data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={loanStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {loanStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Revenue trend */}
        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-6">Tren Estimasi Revenue</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(1)}Jt`} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }}
                formatter={v => [formatIDR(v), 'Est. Revenue']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#2D6A4F"
                strokeWidth={2.5}
                dot={{ fill: '#2D6A4F', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent loans table */}
        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Pengajuan Terbaru</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['No. Ref', 'Pemohon', 'Jenis', 'Status', 'Jumlah', 'Tanggal'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-700 text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  ...data.loans.slice(0, 5).map(l => ({ ...l, _type: 'Pinjaman', _amount: l.amount })),
                  ...data.gadai.slice(0, 3).map(g => ({ ...g, _type: 'Gadai', _amount: g.loan_amount })),
                ]
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .slice(0, 8)
                  .map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-700 text-emerald-700 font-mono text-xs">{item.ref_number || '-'}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-600">{item.profiles?.full_name || '-'}</td>
                    <td className="px-4 py-3.5 text-slate-500">{item._type}</td>
                    <td className="px-4 py-3.5">
                      <span className={`badge ${
                        item.status === 'disbursed' || item.status === 'active' ? 'badge-success' :
                        item.status === 'overdue' ? 'badge-danger' :
                        item.status === 'pending' ? 'badge-warning' : 'badge-gray'
                      }`}>{item.status}</span>
                    </td>
                    <td className="px-4 py-3.5 font-600 text-slate-900">{formatIDR(item._amount)}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{item.created_at?.slice(0, 10)}</td>
                  </tr>
                ))}
                {data.loans.length === 0 && data.gadai.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">Belum ada data pengajuan</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
