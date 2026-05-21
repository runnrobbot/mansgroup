import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { loanService, gadaiService, paymentService, profileService } from '../../services'
import { formatIDR, formatRelativeTime } from '../../lib/utils'
import {
  CheckCircle, Users, Wallet, Ban,
  ArrowRight, CreditCard, Package, Clock, AlertTriangle
} from 'lucide-react'

const stagger = { visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

export default function AdminDashboard() {
  const [stats, setStats] = useState({ approvals: 0, gadaiApprovals: 0, users: 0, payments: 0, blacklist: 0, overdue: 0 })
  const [pendingLoans, setPendingLoans] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      loanService.listAll({ status: 'review', limit: 5 }),
      gadaiService.listAll({ status: 'review', limit: 1 }),
      profileService.listAll({ limit: 1 }),
      paymentService.listPending(),
      loanService.listAll({ status: 'overdue', limit: 1 }),
    ]).then(([loans, gadai, users, payments, overdue]) => {
      setStats({
        approvals: loans.count || loans.data?.length || 0,
        gadaiApprovals: gadai.count || gadai.data?.length || 0,
        users: users.count || 0,
        payments: payments.data?.length || 0,
        overdue: overdue.count || 0,
      })
      setPendingLoans((loans.data || []).slice(0, 5))
      setPendingPayments((payments.data || []).slice(0, 5))
      setLoading(false)
    })
  }, [])

  const quickLinks = [
    { label: 'Final Approval', desc: 'Pinjaman & gadai review', href: '/admin/approvals', icon: CheckCircle, badge: (stats.approvals || 0) + (stats.gadaiApprovals || 0) },
    { label: 'Verifikasi Pembayaran', desc: 'Konfirmasi transfer masuk', href: '/admin/transactions', icon: Wallet, badge: stats.payments || 0 },
    { label: 'Kelola User', desc: 'Manajemen akun pengguna', href: '/admin/users', icon: Users },
    { label: 'Blacklist', desc: 'User terblokir', href: '/admin/blacklist', icon: Ban },
    { label: 'Monitor Overdue', desc: 'Pinjaman telat bayar', href: '/admin/approvals?tab=overdue', icon: AlertTriangle, badge: stats.overdue || 0 },
  ]

  return (
    <DashboardLayout role="admin">
      <motion.div className="space-y-6" initial="hidden" animate="visible" variants={stagger}>
        <motion.div variants={fadeUp}>
          <h1 className="text-xl font-800 text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola approval, user, dan transaksi platform</p>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Menunggu Approval" value={loading ? '...' : String((stats.approvals || 0) + (stats.gadaiApprovals || 0))} icon={CheckCircle} />
          <StatCard label="Total User" value={loading ? '...' : String(stats.users || 0)} icon={Users} />
          <StatCard label="Pembayaran Pending" value={loading ? '...' : String(stats.payments || 0)} icon={Wallet} />
          <StatCard label="Pinjaman Overdue" value={loading ? '...' : String(stats.overdue || 0)} icon={AlertTriangle} />
          <StatCard label="Gadai Review" value={loading ? '...' : String(stats.gadaiApprovals || 0)} icon={Package} />
          <StatCard label="Blacklist" value={loading ? '...' : String(stats.blacklist || 0)} icon={Ban} />
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickLinks.map(({ label, desc, href, icon: Icon, badge }) => (
            <Link key={label} to={href}
              className="card-premium p-4 flex flex-col gap-2.5 hover:border-violet-200 group transition-all">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                  <Icon size={16} className="text-violet-600" />
                </div>
                {badge > 0 && <span className="text-xs font-700 bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">{badge}</span>}
              </div>
              <div>
                <p className="text-sm font-700 text-slate-900">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Data grids */}
        <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-5">
          {/* Pending Approvals */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-700 text-slate-900">Antrian Final Approval</h3>
                <p className="text-xs text-slate-400 mt-0.5">Pinjaman siap disetujui</p>
              </div>
              <Link to="/admin/approvals" className="text-xs font-600 text-violet-600 hover:text-violet-700 flex items-center gap-1">
                Lihat semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? [1,2,3].map(i => (
                <div key={i} className="px-5 py-3"><div className="skeleton h-4 rounded w-3/4" /></div>
              )) : pendingLoans.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada antrian</div>
              ) : pendingLoans.map(loan => (
                <div key={loan.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60">
                  <div>
                    <p className="text-sm font-600 text-slate-900">{loan.profiles?.full_name || '-'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{loan.ref_number}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-600 text-violet-700">{formatIDR(loan.amount)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={loan.status} />
                    <Clock size={12} className="text-slate-300" />
                    <span className="text-xs text-slate-400">{formatRelativeTime(loan.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Pending Payments */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-700 text-slate-900">Pembayaran Belum Diverifikasi</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload bukti transfer menunggu konfirmasi</p>
              </div>
              <Link to="/admin/transactions" className="text-xs font-600 text-violet-600 hover:text-violet-700 flex items-center gap-1">
                Lihat semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? [1,2,3].map(i => (
                <div key={i} className="px-5 py-3"><div className="skeleton h-4 rounded w-3/4" /></div>
              )) : pendingPayments.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Tidak ada pembayaran pending</div>
              ) : pendingPayments.map(p => (
                <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60">
                  <div>
                    <p className="text-sm font-600 text-slate-900">{p.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-slate-400">{p.loans?.ref_number || p.id?.slice(0,8)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-700 text-emerald-700">{formatIDR(p.amount)}</span>
                    <span className="text-xs text-slate-400">{formatRelativeTime(p.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  )
}
