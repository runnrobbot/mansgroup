import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/Card'
import { loanService } from '../../services'
import { CheckCircle, Users, Wallet, Ban } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ approvals: 0, users: 0, payments: 0, blacklist: 0 })
  useEffect(() => {
    loanService.listAll({ status: 'review', limit: 1 }).then(r => setStats(s => ({ ...s, approvals: r.count || 0 })))
  }, [])
  return (
    <DashboardLayout role='admin'>
      <div className='space-y-6'>
        <h1 className='text-xl font-800 text-slate-900'>Admin Dashboard</h1>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard label='Final Approval' value={stats.approvals.toString()} icon={CheckCircle} />
          <StatCard label='Total User' value={stats.users.toString()} icon={Users} />
          <StatCard label='Pembayaran Pending' value={stats.payments.toString()} icon={Wallet} />
          <StatCard label='Blacklist' value={stats.blacklist.toString()} icon={Ban} />
        </div>
        <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[
            { label: 'Final Approval', href: '/admin/approvals', icon: CheckCircle },
            { label: 'Kelola User', href: '/admin/users', icon: Users },
            { label: 'Blacklist', href: '/admin/blacklist', icon: Ban },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={href} to={href} className='card-premium p-5 flex items-center gap-3 hover:border-emerald-200'>
              <div className='w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center'><Icon size={18} className='text-emerald-600' /></div>
              <span className='text-sm font-700 text-slate-900'>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
