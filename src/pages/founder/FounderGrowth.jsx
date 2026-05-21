import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { analyticsService } from '../../services'
import { formatIDR } from '../../lib/utils'
import { TrendingUp, Users, CreditCard, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { format, subMonths } from 'date-fns'

const stagger = { visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function buildGrowthData(loans, gadai, users) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      month: format(d, 'MMM yy'),
      key: format(d, 'yyyy-MM'),
      newUsers: 0,
      newLoans: 0,
      newGadai: 0,
      loanVolume: 0,
      gadaiVolume: 0,
    }
  })

  users.forEach(u => {
    const m = months.find(m => m.key === u.created_at?.slice(0, 7))
    if (m) m.newUsers++
  })
  loans.forEach(l => {
    const m = months.find(m => m.key === l.created_at?.slice(0, 7))
    if (m) { m.newLoans++; m.loanVolume += (l.amount || 0) }
  })
  gadai.forEach(g => {
    const m = months.find(m => m.key === g.created_at?.slice(0, 7))
    if (m) { m.newGadai++; m.gadaiVolume += (g.loan_amount || 0) }
  })

  return months
}

function GrowthCard({ label, current, previous, format: fmt = (v) => v.toString(), icon: Icon }) {
  const growth = previous ? (((current - previous) / previous) * 100).toFixed(1) : '0.0'
  const isPositive = Number(growth) >= 0
  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-600 text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Icon size={16} className="text-emerald-600" />
        </div>
      </div>
      <p className="text-2xl font-800 text-slate-900">{fmt(current)}</p>
      <div className={`flex items-center gap-1 mt-1.5 text-xs font-600 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {isPositive ? '+' : ''}{growth}% vs bulan lalu
      </div>
    </div>
  )
}

export default function FounderGrowth() {
  const [data, setData] = useState({ loans: [], gadai: [], payments: [], users: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsService.getSummary().then(d => { setData(d); setLoading(false) })
  }, [])

  const monthlyData = buildGrowthData(data.loans, data.gadai, data.users)
  const thisM = monthlyData[monthlyData.length - 1] || {}
  const lastM = monthlyData[monthlyData.length - 2] || {}

  if (loading) return (
    <DashboardLayout role="founder">
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout role="founder">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Growth Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pertumbuhan pengguna dan volume transaksi</p>
        </div>

        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <GrowthCard label="User Baru" current={thisM.newUsers || 0} previous={lastM.newUsers || 0} icon={Users} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <GrowthCard label="Pinjaman Baru" current={thisM.newLoans || 0} previous={lastM.newLoans || 0} icon={CreditCard} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <GrowthCard label="Gadai Baru" current={thisM.newGadai || 0} previous={lastM.newGadai || 0} icon={Package} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <GrowthCard
              label="Volume Pinjaman"
              current={thisM.loanVolume || 0}
              previous={lastM.loanVolume || 0}
              format={formatIDR}
              icon={TrendingUp}
            />
          </motion.div>
        </motion.div>

        {/* User growth area chart */}
        <Card>
          <div className="mb-6">
            <h2 className="text-sm font-700 text-slate-900">Pertumbuhan Pengguna Baru</h2>
            <p className="text-xs text-slate-400 mt-0.5">Registrasi baru per bulan — 6 bulan terakhir</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="newUsers" name="User Baru" stroke="#2D6A4F" strokeWidth={2.5} fill="url(#userGrad)" dot={{ fill: '#2D6A4F', r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Transaction volume */}
        <Card>
          <div className="mb-6">
            <h2 className="text-sm font-700 text-slate-900">Volume Transaksi per Bulan</h2>
            <p className="text-xs text-slate-400 mt-0.5">Nilai pinjaman + gadai yang diajukan</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barSize={20} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000000).toFixed(0)}Jt`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} formatter={v => formatIDR(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="loanVolume" name="Volume Pinjaman" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gadaiVolume" name="Volume Gadai" fill="#95D5B2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Combined line chart - applications */}
        <Card>
          <div className="mb-6">
            <h2 className="text-sm font-700 text-slate-900">Pengajuan Baru (Pinjaman vs Gadai)</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="newLoans" name="Pinjaman Baru" stroke="#2D6A4F" strokeWidth={2.5} dot={{ fill: '#2D6A4F', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="newGadai" name="Gadai Baru" stroke="#52B788" strokeWidth={2.5} strokeDasharray="4 2" dot={{ fill: '#52B788', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </DashboardLayout>
  )
}
