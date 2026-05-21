import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { analyticsService, loanService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { AlertOctagon, TrendingDown, Clock, Percent } from 'lucide-react'

const stagger = { visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

function daysOverdue(createdAt, tenor) {
  if (!createdAt || !tenor) return 0
  const disbursed = new Date(createdAt)
  const due = new Date(disbursed.setMonth(disbursed.getMonth() + Number(tenor)))
  const now = new Date()
  const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export default function FounderNPL() {
  const [data, setData] = useState({ loans: [], gadai: [] })
  const [overdueLoans, setOverdueLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsService.getSummary(),
      loanService.listAll({ status: 'overdue', limit: 50 }),
    ]).then(([summary, overdue]) => {
      setData(summary)
      setOverdueLoans(overdue.data || [])
      setLoading(false)
    })
  }, [])

  const totalLoans = data.loans.length
  const overdueCount = data.loans.filter(l => l.status === 'overdue').length
  const nplRate = totalLoans ? ((overdueCount / totalLoans) * 100).toFixed(2) : '0.00'
  const nplValue = overdueLoans.reduce((s, l) => s + (l.amount || 0), 0)
  const overdueGadai = data.gadai.filter(g => g.status === 'due' || g.status === 'forfeited').length

  const riskBuckets = [
    { label: '1–7 hari', count: overdueLoans.filter(l => { const d = daysOverdue(l.created_at, l.tenor); return d >= 1 && d <= 7 }).length, color: '#F59E0B' },
    { label: '8–30 hari', count: overdueLoans.filter(l => { const d = daysOverdue(l.created_at, l.tenor); return d >= 8 && d <= 30 }).length, color: '#F97316' },
    { label: '31–90 hari', count: overdueLoans.filter(l => { const d = daysOverdue(l.created_at, l.tenor); return d >= 31 && d <= 90 }).length, color: '#EF4444' },
    { label: '>90 hari', count: overdueLoans.filter(l => daysOverdue(l.created_at, l.tenor) > 90).length, color: '#991B1B' },
  ]

  const nplGauge = [
    { name: 'NPL', value: Math.min(parseFloat(nplRate), 100), fill: parseFloat(nplRate) > 5 ? '#EF4444' : '#2D6A4F' },
    { name: 'Sehat', value: 100, fill: '#F1F5F9' },
  ]

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
          <h1 className="text-xl font-800 text-slate-900">NPL Monitor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Non-Performing Loan — analisis pinjaman bermasalah</p>
        </div>

        {/* Alert banner if NPL > 5% */}
        {parseFloat(nplRate) > 5 && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <AlertOctagon size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-800">
              <span className="font-700">Peringatan: NPL Rate {nplRate}%</span> — melebihi ambang batas sehat 5%. Diperlukan tindakan segera.
            </p>
          </div>
        )}

        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial="hidden" animate="visible" variants={stagger}>
          <motion.div variants={fadeUp}>
            <StatCard label="NPL Rate" value={`${nplRate}%`} icon={Percent} change={parseFloat(nplRate) > 5 ? 'Di atas ambang 5%' : 'Dalam batas sehat'} changeType={parseFloat(nplRate) > 5 ? 'negative' : 'positive'} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Pinjaman Overdue" value={overdueCount.toString()} icon={AlertOctagon} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Total Nilai NPL" value={formatIDR(nplValue)} icon={TrendingDown} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Gadai Bermasalah" value={overdueGadai.toString()} icon={Clock} />
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* NPL Gauge */}
          <Card>
            <h2 className="text-sm font-700 text-slate-900 mb-2">NPL Gauge</h2>
            <p className="text-xs text-slate-400 mb-4">Batas sehat: &lt; 5%</p>
            <div className="relative">
              <ResponsiveContainer width="100%" height={180}>
                <RadialBarChart
                  cx="50%" cy="80%"
                  innerRadius="60%" outerRadius="80%"
                  startAngle={180} endAngle={0}
                  data={nplGauge}
                >
                  <RadialBar dataKey="value" cornerRadius={4} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={v => [`${v}%`]} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className={`text-3xl font-800 ${parseFloat(nplRate) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>{nplRate}%</p>
                <p className="text-xs text-slate-400 mt-0.5">NPL Rate</p>
              </div>
            </div>
          </Card>

          {/* Risk buckets bar chart */}
          <Card className="lg:col-span-2">
            <h2 className="text-sm font-700 text-slate-900 mb-6">Distribusi Hari Keterlambatan</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={riskBuckets} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" name="Jumlah Pinjaman" radius={[4, 4, 0, 0]}>
                  {riskBuckets.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Overdue loan list */}
        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Daftar Pinjaman Overdue</h2>
          <Table>
            <TableHead>
              <Th>Ref</Th>
              <Th>Pemohon</Th>
              <Th>Jumlah</Th>
              <Th>Tenor</Th>
              <Th>Status</Th>
              <Th>Tanggal Pengajuan</Th>
            </TableHead>
            <TableBody>
              {overdueLoans.length === 0 ? (
                <EmptyRow colSpan={6} message="Tidak ada pinjaman overdue" />
              ) : overdueLoans.map(loan => (
                <Tr key={loan.id}>
                  <Td><span className="font-600 text-xs text-red-600">{loan.ref_number || '-'}</span></Td>
                  <Td>
                    <div>
                      <p className="font-500 text-sm">{loan.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{loan.profiles?.email || '-'}</p>
                    </div>
                  </Td>
                  <Td className="font-600 text-red-700">{formatIDR(loan.amount)}</Td>
                  <Td>{loan.tenor} bln</Td>
                  <Td><StatusBadge status={loan.status} /></Td>
                  <Td className="text-xs text-slate-400">{formatDate(loan.created_at)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
