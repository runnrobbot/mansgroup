import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, CreditCard, Package, Receipt, FileText, Bell,
  User, ChevronLeft, ChevronRight, LogOut, Zap, ClipboardList,
  Truck, Warehouse, AlertTriangle, CheckCircle, Users,
  ArrowLeftRight, Wallet, Ban, Settings, BarChart3, TrendingUp,
  LineChart, AlertOctagon, Menu
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { getInitials, cn } from '../../lib/utils'
import { NAV_ITEMS } from '../../lib/constants'

const ICON_MAP = {
  LayoutDashboard, CreditCard, Package, Receipt, FileText, Bell, User,
  ClipboardList, Truck, Warehouse, AlertTriangle, CheckCircle, Users,
  ArrowLeftRight, Wallet, Ban, Settings, BarChart3, TrendingUp,
  LineChart, AlertOctagon, Home: LayoutDashboard,
}

export function DashboardLayout({ children, role }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = NAV_ITEMS[role] || NAV_ITEMS.user

  const brandColors = {
    user: 'from-emerald-700 to-emerald-500',
    staff: 'from-blue-700 to-blue-500',
    admin: 'from-violet-700 to-violet-500',
    founder: 'from-amber-600 to-amber-400',
  }

  const brandColor = brandColors[role] || brandColors.user

  const Sidebar = ({ mobile = false }) => (
    <div className={cn(
      'flex flex-col h-full bg-white border-r border-slate-100',
      !mobile && (collapsed ? 'w-16' : 'w-60'),
      mobile && 'w-72'
    )}>
      {/* Brand */}
      <div className={cn(
        'flex items-center gap-2.5 h-16 px-4 border-b border-slate-100 flex-shrink-0',
        collapsed && !mobile && 'justify-center px-0'
      )}>
        <div className={`w-8 h-8 rounded-[10px] bg-gradient-to-br ${brandColor} flex items-center justify-center flex-shrink-0`}>
          <Zap size={15} className="text-white" fill="white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="flex flex-col leading-none overflow-hidden">
            <span className="text-sm font-800 text-slate-900 tracking-tight">MansGroup</span>
            <span className="text-[9px] text-slate-400 font-500 tracking-widest uppercase">
              {role === 'user' ? 'Portal User' : role === 'staff' ? 'Staff Panel' : role === 'admin' ? 'Admin Panel' : 'Founder Panel'}
            </span>
          </div>
        )}
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || LayoutDashboard
            const isActive = location.pathname === item.path ||
              (item.path !== `/${role}` && location.pathname.startsWith(item.path))
            const isNotif = item.path.includes('notifications')

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => mobile && setMobileOpen(false)}
                title={collapsed && !mobile ? item.label : undefined}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 relative',
                  collapsed && !mobile && 'justify-center px-0',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-500'
                )}
              >
                <Icon size={16} className="flex-shrink-0" />
                {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
                {isNotif && unreadCount > 0 && (
                  <span className={cn(
                    'bg-emerald-500 text-white text-[9px] font-700 rounded-full flex items-center justify-center flex-shrink-0',
                    collapsed && !mobile ? 'absolute -top-1 -right-1 w-4 h-4' : 'w-4 h-4 ml-auto'
                  )}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User info */}
      <div className={cn(
        'border-t border-slate-100 p-3 flex-shrink-0',
        collapsed && !mobile && 'flex justify-center'
      )}>
        {collapsed && !mobile ? (
          <button
            onClick={signOut}
            className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            title="Keluar"
          >
            <LogOut size={14} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${brandColor} flex items-center justify-center text-white text-xs font-700 flex-shrink-0`}>
              {getInitials(profile?.full_name || user?.email || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-600 text-slate-900 truncate">
                {profile?.full_name || user?.email || 'User'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{role}</p>
            </div>
            <button
              onClick={signOut}
              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              <Sidebar mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-slate-100">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${brandColor} flex items-center justify-center`}>
              <Zap size={12} className="text-white" fill="white" />
            </div>
            <span className="text-sm font-700 text-slate-900">MansGroup</span>
          </div>
          <Link to={`/${role}/notifications`} className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full text-[8px] font-700 text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
