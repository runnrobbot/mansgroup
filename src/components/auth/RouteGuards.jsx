import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-500">Memuat sesi...</p>
      </div>
    </div>
  )
}

function ProfileLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-500">Memuat profil...</p>
      </div>
    </div>
  )
}

// Requires authentication — shows loader only during initial session check
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/auth/login" replace />
  return children
}

// Requires specific role or minimum role
export function RequireRole({ children, role, minRole }) {
  const { user, profile, loading, profileLoading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/auth/login" replace />
  // Wait for profile to load before evaluating role
  if (profileLoading || !profile) return <ProfileLoading />

  const hierarchy = ['user', 'staff', 'admin', 'founder']
  const userIdx = hierarchy.indexOf(profile?.role)

  if (minRole) {
    const minIdx = hierarchy.indexOf(minRole)
    if (userIdx < minIdx) return <Navigate to="/dashboard" replace />
  } else if (role) {
    if (profile?.role !== role) return <Navigate to="/dashboard" replace />
  }

  return children
}

// Redirect authenticated users away from auth pages
export function PublicOnly({ children }) {
  const { user, profile, loading, profileLoading } = useAuth()
  if (loading) return <AuthLoading />

  if (user) {
    // Wait for profile so we know where to redirect
    if (profileLoading || !profile) return <ProfileLoading />
    const redirectMap = {
      user: '/dashboard',
      staff: '/staff',
      admin: '/admin',
      founder: '/founder',
    }
    return <Navigate to={redirectMap[profile.role] || '/dashboard'} replace />
  }

  return children
}

// Smart redirect based on role
export function RoleRedirect() {
  const { user, profile, loading, profileLoading } = useAuth()
  if (loading) return <AuthLoading />
  if (!user) return <Navigate to="/auth/login" replace />
  if (profileLoading || !profile) return <ProfileLoading />

  const redirectMap = {
    user: '/dashboard',
    staff: '/staff',
    admin: '/admin',
    founder: '/founder',
  }
  return <Navigate to={redirectMap[profile?.role] || '/dashboard'} replace />
}