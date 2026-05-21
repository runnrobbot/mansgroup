import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { useNotifications } from '../../contexts/NotificationContext'
import { formatRelativeTime } from '../../lib/utils'
import { Bell, CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const { notifications, markAllAsRead, markAsRead, unreadCount } = useNotifications()
  return (
    <DashboardLayout role='user'>
      <div className='space-y-5 max-w-2xl'>
        <div className='flex items-center justify-between'>
          <div><h1 className='text-xl font-800 text-slate-900'>Notifikasi</h1><p className='text-sm text-slate-500'>{unreadCount} belum dibaca</p></div>
          {unreadCount > 0 && <button onClick={markAllAsRead} className='flex items-center gap-1.5 text-sm text-emerald-600 font-600 hover:text-emerald-700'><CheckCheck size={14} />Tandai semua dibaca</button>}
        </div>
        <div className='space-y-2'>
          {notifications.length === 0 ? (
            <Card className='py-12 text-center'>
              <Bell size={24} className='text-slate-200 mx-auto mb-2' />
              <p className='text-sm text-slate-400'>Tidak ada notifikasi</p>
            </Card>
          ) : notifications.map(n => (
            <div key={n.id} onClick={() => markAsRead(n.id)} className={'p-4 rounded-2xl border cursor-pointer transition-all ' + (n.is_read ? 'bg-white border-slate-100' : 'bg-emerald-50/60 border-emerald-100')}>
              <div className='flex items-start justify-between gap-3'>
                <div><p className={'text-sm font-600 ' + (n.is_read ? 'text-slate-700' : 'text-slate-900')}>{n.title}</p><p className='text-xs text-slate-500 mt-0.5'>{n.message}</p></div>
                <p className='text-xs text-slate-400 flex-shrink-0'>{formatRelativeTime(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
