import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, X, ChevronDown, Bell, LogOut, User, LayoutDashboard,
  CheckCheck, BellOff
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../contexts/NotificationContext'
import { getInitials, formatRelativeTime } from '../../lib/utils'
import toast from 'react-hot-toast'

const NAV_LINKS = [
  { label: 'Beranda', href: '/' },
  { label: 'MansLater', href: '/manslater' },
  { label: 'MansGadai', href: '/mansgadai' },
  { label: 'Tentang', href: '/about' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications()
  const location = useLocation()
  const prevUnreadRef = useRef(unreadCount)

  // Toast when a new notification arrives
  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      const latest = notifications[0]
      if (latest) {
        toast(latest.title, {
          icon: '🔔',
          duration: 4000,
          style: { fontWeight: 600 },
        })
      }
    }
    prevUnreadRef.current = unreadCount
  }, [unreadCount, notifications])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
    setNotifOpen(false)
  }, [location.pathname])

  const dashboardPath = {
    user: '/dashboard',
    staff: '/staff',
    admin: '/admin',
    founder: '/founder',
  }[profile?.role] || '/dashboard'

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled
        ? 'bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm'
        : 'bg-transparent'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img src="/mansgroup.png" alt="MansGroup" className="h-8 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-3.5 py-2 text-sm font-500 rounded-lg transition-all duration-150 ${location.pathname === link.href
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Notification bell — opens dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false) }}
                      className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-500"
                    >
                      <Bell size={18} />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-700 text-white flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {notifOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                            <p className="text-sm font-700 text-slate-900">Notifikasi</p>
                            {unreadCount > 0 && (
                              <button
                                onClick={() => { markAllAsRead(); }}
                                className="flex items-center gap-1 text-xs font-600 text-emerald-600 hover:text-emerald-700 transition-colors"
                              >
                                <CheckCheck size={12} /> Tandai semua
                              </button>
                            )}
                          </div>
                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="py-10 text-center">
                                <BellOff size={20} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">Tidak ada notifikasi</p>
                              </div>
                            ) : (
                              notifications.slice(0, 10).map(n => (
                                <button
                                  key={n.id}
                                  onClick={() => markAsRead(n.id)}
                                  className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-emerald-50/50' : ''
                                    }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {!n.is_read && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                    )}
                                    <div className={!n.is_read ? '' : 'pl-3.5'}>
                                      <p className="text-xs font-600 text-slate-900 leading-snug">{n.title}</p>
                                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</p>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Dashboard link */}
                  <Link
                    to={dashboardPath}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <LayoutDashboard size={14} />
                    Dashboard
                  </Link>

                  {/* Profile dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false) }}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-xs font-700">
                        {getInitials(profile?.full_name || user.email)}
                      </div>
                      <span className="hidden sm:block text-sm font-600 text-slate-700 max-w-24 truncate">
                        {profile?.full_name?.split(' ')[0] || 'User'}
                      </span>
                      <ChevronDown size={13} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {profileOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 rounded-2xl shadow-premium overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-slate-50">
                            <p className="text-sm font-600 text-slate-900 truncate">{profile?.full_name || 'User'}</p>
                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                          </div>
                          <div className="py-1.5">
                            <Link
                              to={`${dashboardPath}/profile`}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                              <User size={14} />
                              Profil Saya
                            </Link>
                            <Link
                              to={dashboardPath}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                              <LayoutDashboard size={14} />
                              Dashboard
                            </Link>
                            <div className="mx-4 my-1 h-px bg-slate-100" />
                            <button
                              onClick={signOut}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <LogOut size={14} />
                              Keluar
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/auth/login"
                    className="hidden sm:block px-4 py-2 text-sm font-600 text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50"
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/auth/register"
                    className="btn-primary text-sm py-2 px-4 rounded-lg font-600"
                  >
                    Daftar Sekarang
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors text-slate-600"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-4 py-3 space-y-0.5">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="block px-3 py-2.5 text-sm font-500 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-slate-100 my-2" />
                {user ? (
                  <>
                    <Link
                      to={dashboardPath}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm font-600 text-emerald-700 bg-emerald-50 rounded-lg"
                    >
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>
                    <button
                      onClick={signOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-500 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut size={14} />
                      Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/auth/login" className="block px-3 py-2.5 text-sm font-500 text-slate-700 hover:bg-slate-50 rounded-lg">
                      Masuk
                    </Link>
                    <Link to="/auth/register" className="block px-3 py-2.5 text-sm font-600 text-emerald-700 bg-emerald-50 rounded-lg">
                      Daftar Sekarang
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Backdrop for dropdowns */}
      {(profileOpen || notifOpen) && (
        <div className="fixed inset-0 z-30" onClick={() => { setProfileOpen(false); setNotifOpen(false) }} />
      )}
    </>
  )
}