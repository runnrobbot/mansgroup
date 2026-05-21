import { useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { getInitials } from '../../lib/utils'
import { User, Lock, Shield, Mail, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
        <Icon size={17} className="text-emerald-600" />
      </div>
      <div>
        <p className="text-sm font-700 text-slate-900">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, updateProfile, updatePassword } = useAuth()
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
  })

  const [pwForm, setPwForm] = useState({
    new_password: '',
    confirm_password: '',
  })

  const handleSaveProfile = async () => {
    if (!form.full_name.trim()) {
      toast.error('Nama lengkap wajib diisi')
      return
    }
    setLoadingProfile(true)
    await updateProfile(form)
    setLoadingProfile(false)
  }

  const handleChangePassword = async () => {
    if (!pwForm.new_password || pwForm.new_password.length < 8) {
      toast.error('Password baru minimal 8 karakter')
      return
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    setLoadingPassword(true)
    const { error } = await updatePassword(pwForm.new_password)
    setLoadingPassword(false)
    if (!error) {
      setPwForm({ new_password: '', confirm_password: '' })
    }
  }

  const kycStatusMap = {
    unverified: { label: 'Belum Terverifikasi', cls: 'badge-warning' },
    pending: { label: 'Menunggu Verifikasi', cls: 'badge-info' },
    verified: { label: 'Terverifikasi', cls: 'badge-success' },
    rejected: { label: 'Ditolak', cls: 'badge-danger' },
  }
  const kyc = kycStatusMap[profile?.kyc_status] || kycStatusMap.unverified

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl space-y-5">
        <h1 className="text-xl font-800 text-slate-900">Profil Saya</h1>

        {/* Identity Card */}
        <Card>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-xl font-800 flex-shrink-0">
              {getInitials(profile?.full_name || user?.email || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-700 text-slate-900 truncate">{profile?.full_name || '-'}</p>
              <p className="text-sm text-slate-400 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`badge ${kyc.cls}`}>{kyc.label}</span>
                <span className="badge badge-info capitalize">{profile?.role || 'user'}</span>
                {profile?.reward_eligible && (
                  <span className="badge badge-success">⭐ Reward Eligible</span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Personal Info */}
        <Card>
          <SectionHeader icon={User} title="Informasi Pribadi" subtitle="Data dasar akun Anda" />
          <div className="space-y-4">
            <Input
              label="Nama Lengkap"
              placeholder="Nama sesuai KTP"
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Nomor HP"
                placeholder="08xxxxxxxxxx"
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              <div>
                <label className="label-field flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-400" /> Email
                </label>
                <input
                  className="input-field bg-slate-50 text-slate-500 cursor-not-allowed"
                  value={user?.email || ''}
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">Email tidak dapat diubah</p>
              </div>
            </div>
            <Input
              label="Alamat"
              placeholder="Alamat lengkap"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
            <Button onClick={handleSaveProfile} loading={loadingProfile}>
              Simpan Perubahan
            </Button>
          </div>
        </Card>

        {/* Change Password */}
        <Card>
          <SectionHeader icon={Lock} title="Ubah Password" subtitle="Disarankan ganti password secara berkala" />
          <div className="space-y-4">
            <div className="relative">
              <label className="label-field">Password Baru</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Min. 8 karakter"
                  value={pwForm.new_password}
                  onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label-field">Konfirmasi Password Baru</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  className="input-field pr-10"
                  placeholder="Ulangi password baru"
                  value={pwForm.confirm_password}
                  onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                <p className="text-xs text-red-500 mt-1">Password tidak cocok</p>
              )}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
            <Button
              onClick={handleChangePassword}
              loading={loadingPassword}
              disabled={!pwForm.new_password || !pwForm.confirm_password}
            >
              Ganti Password
            </Button>
          </div>
        </Card>

        {/* Account Info */}
        <Card>
          <SectionHeader icon={Shield} title="Informasi Akun" subtitle="Detail akun dan keamanan" />
          <div className="space-y-3">
            {[
              { label: 'ID Pengguna', value: user?.id?.slice(0, 18) + '...' },
              { label: 'Email Terverifikasi', value: user?.email_confirmed_at ? 'Ya ✓' : 'Belum' },
              { label: 'Tanggal Bergabung', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
              { label: 'Terakhir Login', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : '-' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{label}</span>
                <span className="text-sm font-600 text-slate-800">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}