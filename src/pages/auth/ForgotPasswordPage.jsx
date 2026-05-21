import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { motion } from 'framer-motion'
import { Zap, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (!error) setSent(true)
  }

  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center p-4'>
      <motion.div className='card-premium p-8 max-w-md w-full' initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Link to='/' className='flex items-center gap-2 mb-7'>
          <div className='w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center'>
            <Zap size={13} className='text-white' fill='white' />
          </div>
          <span className='text-sm font-800 text-slate-900'>MansGroup</span>
        </Link>
        {sent ? (
          <div className='text-center'>
            <div className='w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <Mail size={26} className='text-emerald-600' />
            </div>
            <h2 className='text-xl font-800 text-slate-900 mb-2'>Email Terkirim!</h2>
            <p className='text-sm text-slate-500 mb-6'>Cek inbox Anda dan ikuti link untuk reset password.</p>
            <Link to='/auth/login' className='btn-primary w-full justify-center py-2.5 rounded-xl text-sm'>Kembali ke Login</Link>
          </div>
        ) : (
          <>
            <h1 className='text-xl font-800 text-slate-900 mb-1'>Lupa Password?</h1>
            <p className='text-sm text-slate-500 mb-6'>Masukkan email Anda, kami kirim link reset password.</p>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='label-field'>Email</label>
                <input type='email' className='input-field' value={email} onChange={e => setEmail(e.target.value)} placeholder='email@domain.com' required />
              </div>
              <button type='submit' disabled={loading} className='btn-primary w-full justify-center py-2.5 rounded-xl text-sm'>
                {loading ? <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' /> : 'Kirim Link Reset'}
              </button>
            </form>
            <Link to='/auth/login' className='flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mt-4'>
              <ArrowLeft size={13} /> Kembali ke Login
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
