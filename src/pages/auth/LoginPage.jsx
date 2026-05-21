import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap, ArrowRight, Hand } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    const { data: authData, error } = await signIn(data)
    setLoading(false)
    if (!error) {
      // Redirect based on role (will be handled in router guard)
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(52,183,136,0.12),transparent)]" />
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center">
            <Zap size={17} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-800 text-white">MansGroup</span>
        </Link>

        <div className="relative z-10">
          <h2 className="text-3xl font-800 text-white mb-4 leading-tight flex items-end gap-2">
            Selamat datang<br />kembali <Hand size={26} className="text-amber-400" />
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs">
            Login untuk mengakses dashboard, pantau pinjaman & gadai Anda dalam satu tempat.
          </p>
          <div className="flex flex-col gap-3">
            {['Pantau status pengajuan real-time', 'Kelola tagihan & pembayaran', 'Lihat histori transaksi lengkap'].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs relative z-10">© 2026 PT MansGroup Finansial Indonesia</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <motion.div
          className="max-w-md w-full mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center">
                <Zap size={13} className="text-white" fill="white" />
              </div>
              <span className="text-sm font-800 text-slate-900">MansGroup</span>
            </Link>
            <h1 className="text-2xl font-800 text-slate-900 tracking-tight">Masuk ke akun Anda</h1>
            <p className="text-sm text-slate-500 mt-1.5">Belum punya akun? <Link to="/auth/register" className="text-emerald-600 font-600 hover:text-emerald-700">Daftar gratis</Link></p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label-field">Email</label>
              <input
                type="email"
                placeholder="email@domain.com"
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                {...register('email', { required: 'Email wajib diisi', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Format email tidak valid' } })}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label-field mb-0">Password</label>
                <Link to="/auth/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-500">Lupa password?</Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  className={`input-field pr-11 ${errors.password ? 'border-red-400' : ''}`}
                  {...register('password', { required: 'Password wajib diisi', minLength: { value: 8, message: 'Minimal 8 karakter' } })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 rounded-xl mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Masuk <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 text-center">
              Dengan masuk, Anda menyetujui{' '}
              <Link to="/terms" className="text-emerald-600 font-500">Syarat & Ketentuan</Link>
              {' '}dan{' '}
              <Link to="/privacy" className="text-emerald-600 font-500">Kebijakan Privasi</Link>
              {' '}MansGroup.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
