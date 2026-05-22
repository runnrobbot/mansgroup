import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  CreditCard, Package, Bell, AlertCircle,
  ArrowRight, Clock, Award, Plus, Hand, PartyPopper, Lock
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card, StatCard } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { loanService, gadaiService } from '../../services'
import { formatIDR, formatDate, formatRelativeTime, getEffectiveLoanNumbers } from '../../lib/utils'
import { useNotifications } from '../../contexts/NotificationContext'
import toast from 'react-hot-toast'

const stagger = { visible: { transition: { staggerChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

export default function UserDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { notifications } = useNotifications()

  // Profile completeness check
  const isProfileComplete = !!(
    profile?.full_name &&
    profile?.nik &&
    profile?.phone &&
    profile?.birth_date &&
    profile?.address &&
    profile?.occupation &&
    profile?.income
  )
  const isKycVerified = profile?.kyc_status === 'verified'
  const canApply = isProfileComplete && isKycVerified

  const handleApplyLoan = (e) => {
    if (!isProfileComplete) {
      e.preventDefault()
      toast.error('Lengkapi data profil terlebih dahulu')
      navigate('/dashboard/profile')
      return
    }
    if (!isKycVerified) {
      e.preventDefault()
      toast.error('Verifikasi KYC diperlukan sebelum pengajuan')
      navigate('/dashboard/profile?tab=kyc')
      return
    }
  }

  const handleApplyGadai = (e) => {
    if (!isProfileComplete) {
      e.preventDefault()
      toast.error('Lengkapi data profil terlebih dahulu')
      navigate('/dashboard/profile')
      return
    }
    if (!isKycVerified) {
      e.preventDefault()
      toast.error('Verifikasi KYC diperlukan sebelum pengajuan')
      navigate('/dashboard/profile?tab=kyc')
      return
    }
  }
  const [loans, setLoans] = useState([])
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile) return
      const [l, g] = await Promise.all([
        loanService.getByUserId(profile.id),
        gadaiService.getByUserId(profile.id),
      ])
      setLoans(l.data || [])
      setGadais(g.data || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const activeLoans = loans.filter(l => ['disbursed', 'overdue'].includes(l.status))
  const activeGadais = gadais.filter(g => ['active', 'due', 'extended'].includes(g.status))
  const pendingLoans = loans.filter(l => ['pending', 'review', 'approved'].includes(l.status))
  const hasOverdue = activeLoans.some(l => l.status === 'overdue') || activeGadais.some(g => g.status === 'due')
  const hasReward = profile?.reward_eligible

  const recentActivity = [
    ...loans.slice(0, 3).map(l => ({ ...l, type: 'loan', label: 'Pinjaman' })),
    ...gadais.slice(0, 2).map(g => ({ ...g, type: 'gadai', label: 'Gadai' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-start justify-between"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-xl font-800 text-slate-900 tracking-tight flex items-center gap-2">
              Halo, {profile?.full_name?.split(' ')[0] || 'User'}
              <Hand size={18} className="text-amber-400" />
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/dashboard/loans/apply"
              onClick={handleApplyLoan}
              className={`text-xs py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 font-600 transition-all ${
                canApply
                  ? 'btn-primary'
                  : 'bg-slate-200 text-slate-500 cursor-pointer rounded-lg'
              }`}
            >
              {canApply ? <Plus size={13} /> : <Lock size={13} />} Pinjaman
            </Link>
            <Link
              to="/dashboard/gadai/apply"
              onClick={handleApplyGadai}
              className={`text-xs py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 font-600 transition-all ${
                canApply
                  ? 'btn-secondary'
                  : 'bg-slate-100 text-slate-400 cursor-pointer border border-slate-200 rounded-lg'
              }`}
            >
              {canApply ? <Plus size={13} /> : <Lock size={13} />} Gadai
            </Link>
          </div>
        </motion.div>

        {/* Alerts */}
        {hasOverdue && (
          <motion.div
            className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-700 text-red-800">Ada tagihan yang melewati jatuh tempo!</p>
              <p className="text-xs text-red-600 mt-0.5">Segera lakukan pembayaran untuk menghindari denda tambahan.</p>
            </div>
            <Link to="/dashboard/payments" className="ml-auto btn-primary text-xs py-1.5 px-3 rounded-lg bg-red-500 hover:bg-red-600">
              Bayar
            </Link>
          </motion.div>
        )}

        {hasReward && (
          <motion.div
            className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Award size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-800 flex items-center gap-1.5">
              <PartyPopper size={14} className="text-amber-500" />
              <span><span className="font-700">Selamat!</span> Anda mendapat <span className="font-700">bunga reward 2.5%/bulan</span> untuk pinjaman berikutnya.</span>
            </p>
          </motion.div>
        )}

        {/* KYC prompt */}
        {profile?.kyc_status !== 'verified' && (
          <motion.div
            className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-700 text-blue-800">Lengkapi Verifikasi KYC</p>
              <p className="text-xs text-blue-600 mt-0.5">Upload KTP & selfie untuk dapat mengajukan pinjaman atau gadai.</p>
            </div>
            <Link to="/dashboard/profile" className="ml-auto text-xs font-600 text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Lengkapi <ArrowRight size={12} />
            </Link>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <StatCard label="Pinjaman Aktif" value={activeLoans.length.toString()} icon={CreditCard} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Gadai Aktif" value={activeGadais.length.toString()} icon={Package} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <StatCard label="Pengajuan Pending" value={pendingLoans.length.toString()} icon={Clock} />
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Recent loans */}
          <motion.div className="lg:col-span-2 space-y-5" variants={fadeUp} initial="hidden" animate="visible">
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-700 text-slate-900">Pinjaman Saya</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{loans.length} total pengajuan</p>
                </div>
                <Link to="/dashboard/loans" className="text-xs text-emerald-600 font-600 hover:text-emerald-700 flex items-center gap-1">
                  Lihat Semua <ArrowRight size={12} />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 rounded-xl" />)}
                </div>
              ) : loans.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CreditCard size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500 font-500">Belum ada pinjaman</p>
                  <Link to="/dashboard/loans/apply" className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-600 mt-2">
                    <Plus size={12} /> Ajukan Pinjaman
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {loans.slice(0, 4).map(loan => (
                    <Link
                      key={loan.id}
                      to={`/dashboard/loans/${loan.id}`}
                      className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                          <CreditCard size={15} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-600 text-slate-900">{loan.ref_number || 'Pinjaman'}</p>
                          <p className="text-xs text-slate-400">
                            {(() => {
                              const eff = getEffectiveLoanNumbers(loan)
                              const isRevised = eff.principal > 0 && eff.principal !== (loan.amount || 0)
                              return (
                                <>
                                  {formatIDR(eff.principal)}
                                  {isRevised && <span className="text-amber-500 ml-1">(direvisi)</span>}
                                  {' · '}{loan.tenor} bulan · {formatDate(loan.created_at)}
                                </>
                              )
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={loan.status} />
                        <ArrowRight size={13} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Notifications / Quick actions */}
          <motion.div className="space-y-5" variants={fadeUp} initial="hidden" animate="visible">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-700 text-slate-900">Notifikasi Terbaru</h2>
                <Link to="/dashboard/notifications" className="text-xs text-emerald-600 font-600">Semua</Link>
              </div>
              {notifications.length === 0 ? (
                <div className="py-6 text-center">
                  <Bell size={20} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 4).map(n => (
                    <div key={n.id} className={`p-3 rounded-xl ${n.is_read ? 'bg-slate-50/50' : 'bg-emerald-50/60 border border-emerald-100'}`}>
                      <p className="text-xs font-600 text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>


          </motion.div>
        </div>

        {/* Gadai section */}
        {gadais.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-700 text-slate-900">Gadai Saya</h2>
              <Link to="/dashboard/gadai" className="text-xs text-emerald-600 font-600 hover:text-emerald-700 flex items-center gap-1">
                Lihat Semua <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gadais.slice(0, 3).map(gadai => (
                <Link
                  key={gadai.id}
                  to={`/dashboard/gadai/${gadai.id}`}
                  className="p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Package size={14} className="text-slate-500" />
                    </div>
                    <StatusBadge status={gadai.status} />
                  </div>
                  <p className="text-sm font-600 text-slate-900">{gadai.ref_number}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatIDR(gadai.loan_amount)}</p>
                  {gadai.due_date && (
                    <p className="text-xs text-slate-400 mt-1">Jatuh tempo: {formatDate(gadai.due_date)}</p>
                  )}
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}