import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // loading = true ONLY until we know whether there is a session or not.
  // It goes false as soon as we have a user object OR confirm no session.
  // Profile is fetched asynchronously afterwards — does NOT block navigation.
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const initialized = useRef(false)
  const profileFetchRef = useRef(null)

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) {
        console.error('[Auth] fetchProfile error:', error.message)
        return null
      }
      return data
    } catch (err) {
      console.error('[Auth] fetchProfile unexpected:', err)
      return null
    }
  }, [])

  const loadProfileAsync = useCallback(async (userId) => {
    // Cancel any in-flight profile fetch
    const fetchId = Date.now()
    profileFetchRef.current = fetchId
    setProfileLoading(true)
    const p = await fetchProfile(userId)
    // Only apply if this is still the latest request
    if (profileFetchRef.current === fetchId) {
      setProfile(p)
      setProfileLoading(false)
    }
  }, [fetchProfile])

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return

        if (event === 'TOKEN_REFRESHED') {
          // Token silently refreshed — just update user object, no loading
          if (session?.user) setUser(session.user)
          return
        }

        if (session?.user) {
          setUser(session.user)
          // Unblock navigation immediately — profile loads async
          if (!initialized.current) {
            initialized.current = true
            if (mounted) setLoading(false)
          }
          // Fetch profile in background (non-blocking)
          loadProfileAsync(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
          setProfileLoading(false)
          if (!initialized.current) {
            initialized.current = true
            if (mounted) setLoading(false)
          }
        }
      }
    )

    // Safety fallback: if onAuthStateChange is slow, resolve via getSession
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (initialized.current || !mounted) return
      // onAuthStateChange hasn't fired yet
      if (!session) {
        initialized.current = true
        if (mounted) setLoading(false)
      } else {
        // Has session but listener hasn't fired — unblock immediately
        initialized.current = true
        if (mounted) {
          setUser(session.user)
          setLoading(false)
        }
        loadProfileAsync(session.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfileAsync])

  // ─── Auth actions ────────────────────────────────────────────────────────

  const signUp = async ({ email, password, fullName, phone }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone } },
      })
      if (error) throw error
      toast.success('Registrasi berhasil! Silakan cek email Anda untuk verifikasi.')
      return { data, error: null }
    } catch (err) {
      toast.error(err.message || 'Registrasi gagal')
      return { data: null, error: err }
    }
  }

  const signIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return { data, error: null }
    } catch (err) {
      toast.error(err.message || 'Login gagal')
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    toast.success('Berhasil keluar')
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      toast.success('Link reset password telah dikirim ke email Anda')
      return { error: null }
    } catch (err) {
      toast.error(err.message || 'Gagal mengirim email reset')
      return { error: err }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password berhasil diperbarui')
      return { error: null }
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui password')
      return { error: err }
    }
  }

  const updateProfile = async (updates) => {
    if (!user) return { error: new Error('Not authenticated') }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      setProfile(data)
      toast.success('Profil berhasil diperbarui')
      return { data, error: null }
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui profil')
      return { data: null, error: err }
    }
  }

  const refreshProfile = async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    setProfile(p)
    return p
  }

  const isRole = (role) => profile?.role === role
  const hasMinRole = (minRole) => {
    const hierarchy = ['user', 'staff', 'admin', 'founder']
    const userIdx = hierarchy.indexOf(profile?.role)
    const minIdx = hierarchy.indexOf(minRole)
    return userIdx >= minIdx
  }

  const value = {
    user,
    profile,
    loading,
    profileLoading,
    sessionLoaded: !loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
    isRole,
    hasMinRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}