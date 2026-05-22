import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { analyticsService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { TrendingUp, Wallet, CreditCard, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { format, subMonths } from 'date-fns'

const stagger = { visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

// Status pembayaran yang dianggap "sukses": Midtrans pakai 'settlement'/'capture',
// manual transfer pakai 'confirmed'. Semuanya harus dihitung sebagai revenue.
const CONFIRMED_PAYMENT_STATUSES = ['settlement', 'capture', 'confirmed']

function buildRevenue(loans, gadais, payments) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return {
      month: format(d, 'MMM yy'),
      key: format(d, 'yyyy-MM'),
      loanFee: 0,
      gadaiFee: 0,
      payments: 0,
    }
  })

  loans.forEach(l => {
    const m = months.find(m => m.key === l.created_at?.slice(0, 7))
    if (m) m.loanFee += (l.platform_fee || 0)
  })
  gadais.forEach(g => {
    const m = months.find(m => m.key === g.created_at?.slice(0, 7))
    if (m) m.gadaiFee += (g.platform_fee || 0)
  })
  payments.forEach(p => {
    if (CONFIRMED_PAYMENT_STATUSES.includes(p.status)) {
      const m = months.find(m => m.key === p.created_at?.slice(0, 7))
      if (m) m.payments += (p.amount || 0)
    }
  })

  return months.map(m => ({ ...m, total: m.loanFee + m.gadaiFee }))
}

export default function FounderRevenue() {
  const [data, setData] = useState({ loans: [], gadai: [], payments: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsService.getSummary().then(d => { setData(d); setLoading(false) })
  }, [])

  const confirmedPayments = data.payments.filter(p => CONFIRMED_PAYMENT_STATUSES.includes(p.status))
  const totalRevenue = data.loans.reduce((s, l) => s + (l.platform_fee || 0), 0)
    + data.gadai.reduce((s, g) => s + (g.platform_fee || 0), 0)
  const totalCollected = confirmedPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const loanRevenue = data.loans.reduce((s, l) => s + (l.platform_fee || 0), 0)
  const gadaiRevenue = data.gadai.reduce((s, g) => s + (g.platform_fee || 0), 0)

  const monthlyData = buildRevenue(data.loans, data.gadai, data.payments)

  const thisMonth = monthlyData[monthlyData.length - 1]?.total || 0
  const lastMonth = monthlyData[monthlyData.length - 2]?.total || 0
  const growth = lastMonth ? (((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1) : 0
  const isGrowthPositive = Number(growth) >= 0

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
          <h1 className="text-xl font-800 text-slate-900">Revenue Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pendapatan platform dari fee pinjaman dan gadai</p>
        </div>

        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <StatCard label="Total Fee Revenue" value={formatIDR(totalRevenue)} icon={TrendingUp} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Pembayaran Terkonfirmasi" value={formatIDR(totalCollected)} icon={Wallet} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Fee Pinjaman" value={formatIDR(loanRevenue)} icon={CreditCard} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Fee Gadai" value={formatIDR(gadaiRevenue)} icon={Package} />
          </motion.div>
        </motion.div>

        {/* MoM growth banner */}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${isGrowthPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          {isGrowthPositive
            ? <ArrowUpRight size={18} className="text-emerald-600 flex-shrink-0" />
            : <ArrowDownRight size={18} className="text-red-500 flex-shrink-0" />}
          <p className="text-sm">
            <span className={`font-700 ${isGrowthPositive ? 'text-emerald-700' : 'text-red-600'}`}>
              {isGrowthPositive ? '+' : ''}{growth}% MoM
            </span>
            <span className="text-slate-600 ml-1.5">
              Bulan ini {formatIDR(thisMonth)} vs bulan lalu {formatIDR(lastMonth)}
            </span>
          </p>
        </div>

        {/* Area chart */}
        <Card>
          <div className="mb-6">
            <h2 className="text-sm font-700 text-slate-900">Tren Revenue Bulanan</h2>
            <p className="text-xs text-slate-400 mt-0.5">6 bulan terakhir (fee pinjaman + gadai)</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="loanFeeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gadaiFeeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#52B788" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#52B788" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} formatter={v => formatIDR(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="loanFee" name="Fee Pinjaman" stroke="#2D6A4F" strokeWidth={2} fill="url(#loanFeeGrad)" />
              <Area type="monotone" dataKey="gadaiFee" name="Fee Gadai" stroke="#52B788" strokeWidth={2} fill="url(#gadaiFeeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Stacked bar - total per month */}
        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-6">Komposisi Revenue per Bulan</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} formatter={v => formatIDR(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="loanFee" name="Fee Pinjaman" fill="#2D6A4F" radius={[2, 2, 0, 0]} stackId="rev" />
              <Bar dataKey="gadaiFee" name="Fee Gadai" fill="#95D5B2" radius={[4, 4, 0, 0]} stackId="rev" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent confirmed payments */}
        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Pembayaran Terkonfirmasi Terbaru</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Tanggal', 'Jumlah', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-700 text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {confirmedPayments.slice(0, 10).map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 font-600 text-slate-900">{formatIDR(p.amount)}</td>
                    <td className="px-4 py-3"><span className="badge badge-success">confirmed</span></td>
                  </tr>
                ))}
                {confirmedPayments.length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-10 text-center text-slate-400 text-sm">Belum ada pembayaran terkonfirmasi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
