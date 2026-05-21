import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Zap, CheckCircle, ArrowRight, Rocket } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const STRENGTH_LABELS = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat']
const STRENGTH_COLORS = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600']

function getPasswordStrength(pw) {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

export default function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm()
  const pw = watch('password', '')
  const strength = getPasswordStrength(pw)

  const onSubmit = async (data) => {
    setLoading(true)
    const { error } = await signUp({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phone: data.phone,
    })
    setLoading(false)
    if (!error) setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          className="card-premium p-10 max-w-md w-full text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-800 text-slate-900 mb-2">Registrasi Berhasil!</h2>
          <p className="text-sm text-slate-500 mb-6">
            Cek email Anda untuk link verifikasi. Setelah verifikasi, Anda bisa langsung login.
          </p>
          <Link to="/auth/login" className="btn-primary w-full justify-center py-3 rounded-xl">
            Masuk Sekarang <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(52,183,136,0.12),transparent)]" />
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center">
            <Zap size={17} className="text-white" fill="white" />
          </div>
          <span className="text-lg font-800 text-white">MansGroup</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-3xl font-800 text-white mb-4 flex items-center gap-2">Bergabung dengan<br />MansGroup <Rocket size={26} className="text-emerald-400" /></h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
            Daftar gratis dan akses layanan pinjaman & gadai online terpercaya Indonesia.
          </p>
          <div className="space-y-2">
            {['Proses pengajuan 100% online', 'Pencairan cepat 1x24 jam', 'Bunga transparan, tanpa hidden fee', 'Data terlindungi enkripsi penuh'].map(i => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                {i}
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs relative z-10">© 2026 PT MansGroup Finansial Indonesia</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-10 lg:px-12 overflow-y-auto">
        <motion.div
          className="max-w-lg w-full mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-7">
            <Link to="/" className="flex items-center gap-2 mb-7 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-500 flex items-center justify-center">
                <Zap size={13} className="text-white" fill="white" />
              </div>
              <span className="text-sm font-800 text-slate-900">MansGroup</span>
            </Link>
            <h1 className="text-2xl font-800 text-slate-900 tracking-tight">Buat Akun Baru</h1>
            <p className="text-sm text-slate-500 mt-1.5">Sudah punya akun? <Link to="/auth/login" className="text-emerald-600 font-600 hover:text-emerald-700">Masuk di sini</Link></p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nama Lengkap <span className="text-red-400">*</span></label>
                <input
                  className={`input-field ${errors.fullName ? 'border-red-400' : ''}`}
                  placeholder="Nama sesuai KTP"
                  {...register('fullName', { required: 'Nama wajib diisi', minLength: { value: 3, message: 'Min 3 karakter' } })}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="label-field">Nomor HP <span className="text-red-400">*</span></label>
                <input
                  className={`input-field ${errors.phone ? 'border-red-400' : ''}`}
                  placeholder="08xxxxxxxxxx"
                  type="tel"
                  {...register('phone', { required: 'No. HP wajib diisi', pattern: { value: /^(08|628)\d{8,11}$/, message: 'Format tidak valid' } })}
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="label-field">Email <span className="text-red-400">*</span></label>
              <input
                type="email"
                placeholder="Masukan email"
                className={`input-field ${errors.email ? 'border-red-400' : ''}`}
                {...register('email', { required: 'Email wajib diisi', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Format email tidak valid' } })}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label-field">Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 karakter"
                  className={`input-field pr-11 ${errors.password ? 'border-red-400' : ''}`}
                  {...register('password', { required: 'Password wajib diisi', minLength: { value: 8, message: 'Minimal 8 karakter' } })}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              {pw && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? STRENGTH_COLORS[strength - 1] : 'bg-slate-100'}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {STRENGTH_LABELS[strength - 1] || ''}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 pt-1">
              <input
                type="checkbox"
                id="agree"
                className="mt-0.5 w-4 h-4 accent-emerald-600"
                {...register('agree', { required: 'Anda harus menyetujui syarat & ketentuan' })}
              />
              <label htmlFor="agree" className="text-xs text-slate-500 leading-relaxed">
                Saya menyetujui <Link to="/terms" className="text-emerald-600 font-500">Syarat & Ketentuan</Link> dan <Link to="/privacy" className="text-emerald-600 font-500">Kebijakan Privasi</Link> MansGroup, serta memberikan persetujuan penggunaan data sesuai regulasi OJK.
              </label>
            </div>
            {errors.agree && <p className="text-xs text-red-500 -mt-2">{errors.agree.message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 rounded-xl mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Daftar Sekarang <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
