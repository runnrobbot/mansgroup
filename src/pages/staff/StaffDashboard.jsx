import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { loanService, gadaiService, kycService, warehouseService, paymentService } from '../../services'
import { formatIDR, formatRelativeTime } from '../../lib/utils'
import { ClipboardList, Truck, Warehouse, ChevronRight, CheckCircle, Package, FileSearch, ArrowRight, ShieldCheck } from 'lucide-react'

const stagger = { visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

export default function StaffDashboard() {
  const [stats, setStats] = useState({ pendingLoans: 0, pendingGadai: 0, kycPending: 0, pickup: 0, warehouse: 0, paymentPending: 0 })
  const [recentLoans, setRecentLoans] = useState([])
  const [recentGadai, setRecentGadai] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loanService.listAll({ status: 'pending', limit: 5 }),
      gadaiService.listAll({ status: 'pending', limit: 5 }),
      gadaiService.listAll({ status: 'waiting_pickup', limit: 1 }),
      kycService.listPending(),
      warehouseService.listAll({ limit: 1 }),
      paymentService.listPending(),
    ]).then(([loans, gadai, pickup, kyc, warehouse, payments]) => {
      setStats({
        pendingLoans: loans.count || loans.data?.length || 0,
        pendingGadai: gadai.count || gadai.data?.length || 0,
        pickup: pickup.count || pickup.data?.length || 0,
        kycPending: kyc.data?.length || 0,
        warehouse: warehouse.count || 0,
        paymentPending: payments.data?.length || 0,
      })
      setRecentLoans((loans.data || []).slice(0, 4))
      setRecentGadai((gadai.data || []).slice(0, 4))
      setLoading(false)
    })
  }, [])

  const quickLinks = [
    { label: 'Antrian Review', desc: `${stats.pendingLoans + stats.pendingGadai} pengajuan menunggu`, href: '/staff/review-queue', icon: ClipboardList, color: 'emerald', badge: stats.pendingLoans + stats.pendingGadai },
    { label: 'Verifikasi KYC', desc: `${stats.kycPending} dokumen belum diverifikasi`, href: '/staff/review-queue', icon: ShieldCheck, color: 'blue', badge: stats.kycPending },
    { label: 'Penjemputan Gadai', desc: `${stats.pickup} jadwal hari ini`, href: '/staff/gadai-pickup', icon: Truck, color: 'violet', badge: stats.pickup },
    { label: 'Warehouse', desc: 'Kelola barang jaminan', href: '/staff/warehouse', icon: Warehouse, color: 'amber', badge: stats.warehouse },
  ]

  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  }

  return (
    <DashboardLayout role="staff">
      <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
        {/* Header */}
        <motion.div variants={fadeUp}>
          <h1 className="text-xl font-800 text-slate-900 tracking-tight">Staff Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pantau antrian review, penjemputan, dan warehouse</p>
        </motion.div>

        {/* Stat Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Pinjaman Pending" value={loading ? '...' : String(stats.pendingLoans || 0)} icon={ClipboardList} />
          <StatCard label="Gadai Pending" value={loading ? '...' : String(stats.pendingGadai || 0)} icon={Package} />
          <StatCard label="KYC Pending" value={loading ? '...' : String(stats.kycPending || 0)} icon={FileSearch} />
          <StatCard label="Jadwal Pickup" value={loading ? '...' : String(stats.pickup || 0)} icon={Truck} />
          <StatCard label="Warehouse Items" value={loading ? '...' : String(stats.warehouse || 0)} icon={Warehouse} />
          <StatCard label="Pembayaran" value={loading ? '...' : String(stats.paymentPending || 0)} icon={CheckCircle} />
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map(({ label, desc, href, icon: Icon, color, badge }) => (
            <Link key={href} to={href}
              className="card-premium p-4 flex items-start gap-3 hover:border-emerald-200 group transition-all">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
                <Icon size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-700 text-slate-900">{label}</p>
                  {badge > 0 && (
                    <span className="text-xs font-700 bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Recent Activity Grid */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
          {/* Recent Loans */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-700 text-slate-900">Pinjaman Terbaru</h3>
                <p className="text-xs text-slate-400 mt-0.5">Antrian review pinjaman</p>
              </div>
              <Link to="/staff/review-queue" className="text-xs font-600 text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Lihat semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="px-5 py-3 flex gap-3"><div className="skeleton h-4 flex-1 rounded" /></div>)
              ) : recentLoans.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada antrian</div>
              ) : recentLoans.map(loan => (
                <div key={loan.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-600 text-slate-900 truncate">{loan.profiles?.full_name || '-'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{loan.ref_number || loan.id?.slice(0,8)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-600 text-emerald-700">{formatIDR(loan.amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={loan.status} />
                    <span className="text-xs text-slate-400 hidden sm:block">{formatRelativeTime(loan.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Gadai */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-700 text-slate-900">Gadai Terbaru</h3>
                <p className="text-xs text-slate-400 mt-0.5">Antrian review gadai</p>
              </div>
              <Link to="/staff/review-queue" className="text-xs font-600 text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                Lihat semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="px-5 py-3 flex gap-3"><div className="skeleton h-4 flex-1 rounded" /></div>)
              ) : recentGadai.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada antrian</div>
              ) : recentGadai.map(g => (
                <div key={g.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-600 text-slate-900 truncate">{g.profiles?.full_name || '-'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{g.item_name || 'Barang gadai'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-600 text-emerald-700">{formatIDR(g.loan_amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={g.status} />
                    <span className="text-xs text-slate-400 hidden sm:block">{formatRelativeTime(g.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Workflow Guide */}
        <motion.div variants={fadeUp}>
          <Card className="p-5">
            <h3 className="text-sm font-700 text-slate-900 mb-4">Alur Kerja Staff</h3>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Terima Pengajuan', color: 'bg-slate-100 text-slate-600' },
                { arrow: true },
                { label: 'Review Dokumen', color: 'bg-blue-50 text-blue-700' },
                { arrow: true },
                { label: 'Verifikasi KYC', color: 'bg-violet-50 text-violet-700' },
                { arrow: true },
                { label: 'Teruskan ke Admin', color: 'bg-emerald-50 text-emerald-700' },
                { arrow: true },
                { label: 'Koordinasi Pickup', color: 'bg-amber-50 text-amber-700' },
                { arrow: true },
                { label: 'Update Warehouse', color: 'bg-orange-50 text-orange-700' },
              ].map((item, i) =>
                item.arrow ? (
                  <ChevronRight key={i} size={14} className="text-slate-300 flex-shrink-0" />
                ) : (
                  <span key={i} className={`text-xs font-600 px-3 py-1.5 rounded-lg ${item.color}`}>{item.label}</span>
                )
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
