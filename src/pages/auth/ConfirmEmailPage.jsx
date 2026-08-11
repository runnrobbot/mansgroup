import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

export default function ConfirmEmailPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleConfirm = async () => {
      // Supabase auto-handles the token from URL hash on page load
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        setStatus('error')
        setMessage('Link verifikasi tidak valid atau sudah kadaluarsa.')
        return
      }

      if (session?.user?.email_confirmed_at) {
        setStatus('success')
        setMessage('Email berhasil diverifikasi!')
        // Redirect after 2s
        setTimeout(() => navigate('/auth/login'), 2000)
      } else {
        // Still waiting for confirmation — maybe opened the link before it was processed
        setStatus('error')
        setMessage('Verifikasi belum selesai. Pastikan Anda mengklik link terbaru di email.')
      }
    }

    handleConfirm()
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        className="card-premium p-10 max-w-md w-full text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {status === 'loading' && (
          <>
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-800 text-slate-900 mb-2">Memproses...</h2>
            <p className="text-sm text-slate-500">Mohon tunggu sebentar.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-800 text-slate-900 mb-2">Email Diverifikasi!</h2>
            <p className="text-sm text-slate-500 mb-4">{message}</p>
            <p className="text-xs text-slate-400">Mengalihkan ke halaman login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-red-500">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-xl font-800 text-slate-900 mb-2">Verifikasi Gagal</h2>
            <p className="text-sm text-slate-500 mb-4">{message}</p>
            <button
              onClick={() => navigate('/auth/login')}
              className="btn-primary text-sm px-6 py-2.5 rounded-xl"
            >
              Kembali ke Login
            </button>
          </>
        )}
      </motion.div>
    </div>
  )
}
