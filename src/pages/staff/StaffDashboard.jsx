import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { StatCard } from '../../components/ui/Card'
import { loanService, gadaiService } from '../../services'
import { ClipboardList, Truck, Warehouse, AlertTriangle } from 'lucide-react'

export default function StaffDashboard() {
  const [stats, setStats] = useState({ pending: 0, pickup: 0, warehouse: 0, overdue: 0 })
  useEffect(() => {
    Promise.all([
      loanService.listAll({ status: 'pending', limit: 1 }),
      gadaiService.listAll({ status: 'waiting_pickup', limit: 1 }),
    ]).then(([loans, pickup]) => {
      setStats({ pending: loans.count || 0, pickup: pickup.count || 0, warehouse: 0, overdue: 0 })
    })
  }, [])
  return (
    <DashboardLayout role='staff'>
      <div className='space-y-6'>
        <h1 className='text-xl font-800 text-slate-900'>Staff Dashboard</h1>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard label='Antrian Review' value={stats.pending.toString()} icon={ClipboardList} />
          <StatCard label='Jadwal Pickup' value={stats.pickup.toString()} icon={Truck} />
          <StatCard label='Warehouse' value={stats.warehouse.toString()} icon={Warehouse} />
          <StatCard label='Overdue' value={stats.overdue.toString()} icon={AlertTriangle} />
        </div>
        <div className='grid sm:grid-cols-3 gap-4'>
          {[
            { label: 'Antrian Review', href: '/staff/review-queue', icon: ClipboardList },
            { label: 'Penjemputan Gadai', href: '/staff/gadai-pickup', icon: Truck },
            { label: 'Warehouse', href: '/staff/warehouse', icon: Warehouse },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={href} to={href} className='card-premium p-5 flex items-center gap-3 hover:border-emerald-200'>
              <div className='w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center'>
                <Icon size={18} className='text-emerald-600' />
              </div>
              <span className='text-sm font-700 text-slate-900'>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
