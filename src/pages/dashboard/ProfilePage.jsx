import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Input, CustomSelect } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { documentService } from '../../services'
import { getInitials } from '../../lib/utils'
import { User, Lock, Shield, Mail, Eye, EyeOff, CheckCircle, Clock, XCircle, Upload, Camera, CreditCard, AlertCircle, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../lib/utils'

// ─── KYC Step indicator ───────────────────────────────────────────────────────
function KycStep({ num, label, done, active, last }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 flex-shrink-0 transition-all',
        done ? 'bg-emerald-500 text-white' :
        active ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400 ring-offset-1' :
        'bg-slate-100 text-slate-400'
      )}>
        {done ? <CheckCircle size={14} /> : num}
      </div>
      <span className={cn(
        'text-xs font-600 hidden sm:block',
        done ? 'text-emerald-600' : active ? 'text-slate-800' : 'text-slate-400'
      )}>{label}</span>
      {!last && <div className={cn('flex-1 h-px mx-1', done ? 'bg-emerald-300' : 'bg-slate-200')} />}
    </div>
  )
}

// ─── Photo upload box ─────────────────────────────────────────────────────────
function PhotoBox({ label, hint, icon: Icon, file, url, onSelect, required }) {
  const hasFile = file || url
  return (
    <div>
      <label className="label-field">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <label className={cn(
        'mt-1.5 flex flex-col items-center justify-center gap-2 min-h-[140px] rounded-2xl border-2 border-dashed cursor-pointer transition-all',
        hasFile
          ? 'border-emerald-400 bg-emerald-50/50'
          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
      )}>
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => onSelect(e.target.files[0])} />
        {hasFile ? (
          <div className="flex flex-col items-center gap-1.5 p-4">
            <CheckCircle size={28} className="text-emerald-500" />
            <p className="text-xs font-600 text-emerald-700">{file?.name || 'Foto terupload'}</p>
            <p className="text-[10px] text-slate-400">Tap untuk ganti</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Icon size={22} className="text-slate-400" />
            </div>
            <p className="text-xs font-600 text-slate-600">{label}</p>
            {hint && <p className="text-[10px] text-slate-400 text-center leading-relaxed px-2">{hint}</p>}
          </div>
        )}
      </label>
    </div>
  )
}

const OCCUPATION_OPTIONS = [
  { value: 'karyawan_swasta', label: 'Karyawan Swasta' },
  { value: 'pns', label: 'PNS / ASN' },
  { value: 'tni_polri', label: 'TNI / Polri' },
  { value: 'wirausaha', label: 'Wirausaha / Pedagang' },
  { value: 'profesional', label: 'Profesional (Dokter, Pengacara, dll)' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'ibu_rumah_tangga', label: 'Ibu Rumah Tangga' },
  { value: 'lainnya', label: 'Lainnya' },
]

const INCOME_OPTIONS = [
  { value: '1000000', label: 'Di bawah Rp 1 juta' },
  { value: '2500000', label: 'Rp 1 juta – Rp 2,5 juta' },
  { value: '5000000', label: 'Rp 2,5 juta – Rp 5 juta' },
  { value: '10000000', label: 'Rp 5 juta – Rp 10 juta' },
  { value: '20000000', label: 'Rp 10 juta – Rp 20 juta' },
  { value: '50000000', label: 'Di atas Rp 20 juta' },
]

export default function ProfilePage() {
  const { user, profile, updateProfile, updatePassword, refreshProfile } = useAuth()

  // Profile form
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    nik: '',
    birth_place: '',
    birth_date: '',
    occupation: '',
    income: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // KYC photos
  const [photos, setPhotos] = useState({ ktp: null, selfie_ktp: null, selfie: null })
  const [photoUrls, setPhotoUrls] = useState({ ktp: '', selfie_ktp: '', selfie: '' })
  const [savingKyc, setSavingKyc] = useState(false)
  const [kycLoaded, setKycLoaded] = useState(false)

  // Password
  const [pwForm, setPwForm] = useState({ new_password: '', confirm_password: '' })
  const [savingPw, setSavingPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Active section
  const [activeSection, setActiveSection] = useState('data')

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        address: profile.address || '',
        nik: profile.nik || '',
        birth_place: profile.birth_place || '',
        birth_date: profile.birth_date || '',
        occupation: profile.occupation || '',
        income: profile.income ? String(profile.income) : '',
      })
    }
  }, [profile])

  // Load existing KYC document URLs
  useEffect(() => {
    const loadKyc = async () => {
      if (!profile?.id) return
      const { data } = await supabase
        .from('kyc_documents')
        .select('ktp_photo_url, selfie_ktp_url, selfie_url')
        .eq('user_id', profile.id)
        .single()
      if (data) {
        setPhotoUrls({
          ktp: data.ktp_photo_url || '',
          selfie_ktp: data.selfie_ktp_url || '',
          selfie: data.selfie_url || '',
        })
      }
      setKycLoaded(true)
    }
    loadKyc()
  }, [profile?.id])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // KYC completion check
  const profileComplete = form.full_name && form.nik && form.phone && form.birth_date && form.occupation
  const kycPhotosComplete = (photos.ktp || photoUrls.ktp) && (photos.selfie_ktp || photoUrls.selfie_ktp)
  const fullyVerified = profile?.kyc_status === 'verified'

  const kycStatusMap = {
    unverified: { label: 'Belum Terverifikasi', color: 'text-slate-500', bg: 'bg-slate-100', icon: AlertCircle },
    pending: { label: 'Menunggu Verifikasi Staff', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
    verified: { label: 'Terverifikasi ✓', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
    rejected: { label: 'Ditolak — Upload Ulang', color: 'text-red-700', bg: 'bg-red-50', icon: XCircle },
  }
  const kycInfo = kycStatusMap[profile?.kyc_status || 'unverified']

  const handleSaveProfile = async () => {
    if (!form.full_name.trim()) { toast.error('Nama lengkap wajib diisi'); return }
    if (!form.nik.trim()) { toast.error('NIK wajib diisi'); return }
    if (!form.phone.trim()) { toast.error('Nomor HP wajib diisi'); return }
    setSavingProfile(true)
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name,
      phone: form.phone,
      address: form.address,
      nik: form.nik,
      birth_place: form.birth_place,
      birth_date: form.birth_date || null,
      occupation: form.occupation,
      income: form.income ? Number(form.income) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', profile.id)
    setSavingProfile(false)
    if (!error) {
      toast.success('Data diri berhasil disimpan')
      refreshProfile?.()
    } else {
      toast.error('Gagal menyimpan data')
    }
  }

  const handleSaveKyc = async () => {
    if (!photos.ktp && !photoUrls.ktp) { toast.error('Upload foto KTP terlebih dahulu'); return }
    if (!photos.selfie_ktp && !photoUrls.selfie_ktp) { toast.error('Upload selfie dengan KTP terlebih dahulu'); return }

    setSavingKyc(true)
    let urls = { ...photoUrls }

    // Upload new files
    const uploads = [
      { key: 'ktp', file: photos.ktp, field: 'ktp_photo_url' },
      { key: 'selfie_ktp', file: photos.selfie_ktp, field: 'selfie_ktp_url' },
      { key: 'selfie', file: photos.selfie, field: 'selfie_url' },
    ]

    for (const { key, file, field } of uploads) {
      if (file) {
        const path = `kyc/${profile.id}/${key}_${Date.now()}.${file.name.split('.').pop()}`
        const { url } = await documentService.upload(file, 'documents', path)
        if (url) urls[key] = url
      }
    }

    // Upsert KYC document
    const { error } = await supabase.from('kyc_documents').upsert({
      user_id: profile.id,
      ktp_photo_url: urls.ktp || null,
      selfie_ktp_url: urls.selfie_ktp || null,
      selfie_url: urls.selfie || null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (!error) {
      // Update profile kyc_status to pending
      await supabase.from('profiles').update({ kyc_status: 'pending', updated_at: new Date().toISOString() }).eq('id', profile.id)
      setPhotoUrls(urls)
      setPhotos({ ktp: null, selfie_ktp: null, selfie: null })
      toast.success('Dokumen KYC berhasil dikirim untuk verifikasi!')
      refreshProfile?.()
    } else {
      toast.error('Gagal mengirim dokumen')
    }
    setSavingKyc(false)
  }

  const handleChangePassword = async () => {
    if (pwForm.new_password.length < 8) { toast.error('Password minimal 8 karakter'); return }
    if (pwForm.new_password !== pwForm.confirm_password) { toast.error('Konfirmasi password tidak cocok'); return }
    setSavingPw(true)
    const { error } = await updatePassword(pwForm.new_password)
    setSavingPw(false)
    if (!error) setPwForm({ new_password: '', confirm_password: '' })
  }

  // Completion percentage
  const profileFields = [form.full_name, form.nik, form.phone, form.birth_date, form.address, form.occupation, form.income]
  const filledCount = profileFields.filter(Boolean).length
  const profilePct = Math.round((filledCount / profileFields.length) * 100)

  const SECTIONS = [
    { id: 'data', label: 'Data Diri', icon: User },
    { id: 'kyc', label: 'Verifikasi KYC', icon: Shield },
    { id: 'security', label: 'Keamanan', icon: Lock },
  ]

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl space-y-5">
        {/* Header card */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/8 to-transparent pointer-events-none" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-2xl font-800 flex-shrink-0 shadow-md">
              {getInitials(profile?.full_name || user?.email || 'U')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-800 text-slate-900 text-base truncate">{profile?.full_name || 'Nama belum diisi'}</p>
              <p className="text-sm text-slate-400 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-600 px-2.5 py-1 rounded-lg', kycInfo.bg, kycInfo.color)}>
                  <kycInfo.icon size={12} />
                  {kycInfo.label}
                </span>
                {profile?.reward_eligible && (
                  <span className="text-xs font-600 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">⭐ Reward Eligible</span>
                )}
              </div>
            </div>
          </div>

          {/* Profile completion bar */}
          {!fullyVerified && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-600 text-slate-600">Kelengkapan Profil</p>
                <p className="text-xs font-700 text-emerald-700">{profilePct}%</p>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${profilePct}%` }}
                />
              </div>
              {profilePct < 100 && (
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Lengkapi data diri untuk mempercepat proses pengajuan
                </p>
              )}
            </div>
          )}
        </Card>

        {/* KYC banner if not verified */}
        {profile?.kyc_status !== 'verified' && (
          <div className={cn(
            'rounded-2xl p-4 flex items-start gap-3 border',
            profile?.kyc_status === 'pending'
              ? 'bg-amber-50 border-amber-200'
              : profile?.kyc_status === 'rejected'
              ? 'bg-red-50 border-red-200'
              : 'bg-blue-50 border-blue-200'
          )}>
            {profile?.kyc_status === 'pending' ? (
              <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            ) : profile?.kyc_status === 'rejected' ? (
              <XCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={cn(
                'text-sm font-700',
                profile?.kyc_status === 'pending' ? 'text-amber-800' :
                profile?.kyc_status === 'rejected' ? 'text-red-800' : 'text-blue-800'
              )}>
                {profile?.kyc_status === 'pending'
                  ? 'Dokumen sedang diverifikasi staff'
                  : profile?.kyc_status === 'rejected'
                  ? 'Dokumen ditolak — perlu upload ulang'
                  : 'Lengkapi verifikasi KYC untuk mengajukan pinjaman'}
              </p>
              <p className={cn(
                'text-xs mt-0.5',
                profile?.kyc_status === 'pending' ? 'text-amber-700' :
                profile?.kyc_status === 'rejected' ? 'text-red-600' : 'text-blue-600'
              )}>
                {profile?.kyc_status === 'pending'
                  ? 'Proses verifikasi biasanya 1×24 jam kerja. Kami akan notifikasi setelah selesai.'
                  : profile?.kyc_status === 'rejected'
                  ? 'Pastikan foto jelas, tidak buram, dan data KTP terbaca dengan baik.'
                  : 'Upload KTP dan selfie dengan KTP untuk verifikasi identitas Anda.'}
              </p>
              {profile?.kyc_status !== 'pending' && (
                <button
                  onClick={() => setActiveSection('kyc')}
                  className="mt-2 text-xs font-700 text-blue-700 flex items-center gap-1 hover:underline">
                  Verifikasi Sekarang <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Section tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-600 transition-all',
                activeSection === id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}>
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* ── SECTION: Data Diri ── */}
        {activeSection === 'data' && (
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <User size={17} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-700 text-slate-900">Data Diri</p>
                <p className="text-xs text-slate-400">Data ini akan digunakan untuk proses pengajuan</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Nama + NIK */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Nama Lengkap" required
                  placeholder="Sesuai KTP"
                  value={form.full_name}
                  onChange={e => setField('full_name', e.target.value)}
                />
                <Input
                  label="NIK (16 digit)" required
                  placeholder="3271xxxxxxxxxxxxxxx"
                  maxLength={16}
                  value={form.nik}
                  onChange={e => setField('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                  hint={form.nik.length > 0 && form.nik.length < 16 ? `${form.nik.length}/16 digit` : undefined}
                />
              </div>

              {/* Tempat + Tanggal Lahir */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Tempat Lahir"
                  placeholder="Kota kelahiran"
                  value={form.birth_place}
                  onChange={e => setField('birth_place', e.target.value)}
                />
                <Input
                  label="Tanggal Lahir" required
                  type="date"
                  value={form.birth_date}
                  onChange={e => setField('birth_date', e.target.value)}
                />
              </div>

              {/* HP + Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Nomor HP Aktif" required
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="label-field flex items-center gap-1.5">
                    <Mail size={11} className="text-slate-400" /> Email
                  </label>
                  <input
                    className="input-field bg-slate-50 text-slate-400 cursor-not-allowed"
                    value={user?.email || ''}
                    disabled
                  />
                  <p className="text-xs text-slate-400">Email tidak dapat diubah</p>
                </div>
              </div>

              {/* Pekerjaan + Penghasilan */}
              <div className="grid sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Pekerjaan" required
                  placeholder="Pilih pekerjaan"
                  options={OCCUPATION_OPTIONS}
                  value={form.occupation}
                  onChange={v => setField('occupation', v)}
                />
                <CustomSelect
                  label="Penghasilan per Bulan" required
                  placeholder="Pilih kisaran penghasilan"
                  options={INCOME_OPTIONS}
                  value={form.income}
                  onChange={v => setField('income', v)}
                />
              </div>

              {/* Alamat */}
              <div>
                <label className="label-field">Alamat Lengkap (sesuai KTP)</label>
                <textarea
                  className="input-field resize-none mt-1.5"
                  rows={3}
                  placeholder="Jl. Contoh No. 1, Kelurahan, Kecamatan, Kota/Kabupaten, Provinsi"
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">Data disimpan secara aman dan terenkripsi</p>
              <Button onClick={handleSaveProfile} loading={savingProfile}>
                Simpan Data Diri
              </Button>
            </div>
          </Card>
        )}

        {/* ── SECTION: KYC ── */}
        {activeSection === 'kyc' && (
          <Card>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <Shield size={17} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-700 text-slate-900">Verifikasi KYC</p>
                <p className="text-xs text-slate-400">Upload dokumen identitas untuk diverifikasi staff kami</p>
              </div>
              <div className={cn(
                'ml-auto text-xs font-700 px-3 py-1.5 rounded-xl',
                kycInfo.bg, kycInfo.color
              )}>
                {kycInfo.label}
              </div>
            </div>

            {/* Steps */}
            <div className="flex items-center mb-6 px-1">
              <KycStep num={1} label="Data Diri" done={!!profileComplete} active={!profileComplete} />
              <KycStep num={2} label="Foto Dokumen" done={kycPhotosComplete && profile?.kyc_status !== 'unverified'} active={!!profileComplete} />
              <KycStep num={3} label="Verifikasi" done={fullyVerified} active={profile?.kyc_status === 'pending'} last />
            </div>

            {!profileComplete && (
              <div className="mb-5 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-700 text-amber-800">Lengkapi Data Diri Dulu</p>
                  <p className="text-xs text-amber-700 mt-0.5">Nama, NIK, tanggal lahir, nomor HP, dan pekerjaan harus diisi sebelum upload dokumen KYC.</p>
                  <button onClick={() => setActiveSection('data')}
                    className="mt-2 text-xs font-700 text-amber-800 hover:underline flex items-center gap-1">
                    Lengkapi Data Diri <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="mb-5 p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-700 text-slate-700 mb-2">Tips foto yang valid:</p>
              <ul className="space-y-1">
                {[
                  'Pastikan foto terang dan tidak buram',
                  'Seluruh area KTP harus terlihat jelas, tidak terpotong',
                  'Selfie: wajah dan KTP dalam satu frame, tanpa kacamata hitam',
                  'Format: JPG, PNG, atau PDF (maks 5MB)',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                    <CheckCircle size={11} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Photo uploads */}
            <div className="grid sm:grid-cols-3 gap-4">
              <PhotoBox
                label="Foto KTP" required
                hint="Foto KTP tampak depan, semua sudut terlihat"
                icon={CreditCard}
                file={photos.ktp}
                url={photoUrls.ktp}
                onSelect={f => setPhotos(p => ({ ...p, ktp: f }))}
              />
              <PhotoBox
                label="Selfie + KTP" required
                hint="Foto wajah sambil memegang KTP"
                icon={Camera}
                file={photos.selfie_ktp}
                url={photoUrls.selfie_ktp}
                onSelect={f => setPhotos(p => ({ ...p, selfie_ktp: f }))}
              />
              <PhotoBox
                label="Foto Wajah"
                hint="Foto wajah jelas, tanpa filter (opsional)"
                icon={User}
                file={photos.selfie}
                url={photoUrls.selfie}
                onSelect={f => setPhotos(p => ({ ...p, selfie: f }))}
              />
            </div>

            {fullyVerified ? (
              <div className="mt-5 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-700 text-emerald-800">Identitas Anda Sudah Terverifikasi</p>
                  <p className="text-xs text-emerald-700 mt-0.5">Anda dapat mengajukan pinjaman dan gadai sekarang.</p>
                </div>
              </div>
            ) : profile?.kyc_status === 'pending' ? (
              <div className="mt-5 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
                <Clock size={18} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-700 text-amber-800">Menunggu Verifikasi Staff</p>
                  <p className="text-xs text-amber-700 mt-0.5">Biasanya selesai dalam 1×24 jam kerja. Kami akan kirim notifikasi.</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  icon={Upload}
                  loading={savingKyc}
                  disabled={!profileComplete}
                  onClick={handleSaveKyc}
                >
                  Kirim Dokumen untuk Verifikasi
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ── SECTION: Keamanan ── */}
        {activeSection === 'security' && (
          <>
            <Card>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Lock size={17} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-700 text-slate-900">Ubah Password</p>
                  <p className="text-xs text-slate-400">Disarankan ganti password secara berkala</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label-field">Password Baru</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Min. 8 karakter"
                      value={pwForm.new_password}
                      onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {pwForm.new_password && (
                    <div className="mt-1.5 flex gap-1">
                      {[4, 6, 8].map((len, i) => (
                        <div key={i} className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          pwForm.new_password.length >= len ? 'bg-emerald-400' : 'bg-slate-200'
                        )} />
                      ))}
                      <p className="text-xs text-slate-400 ml-1">
                        {pwForm.new_password.length < 6 ? 'Lemah' : pwForm.new_password.length < 8 ? 'Sedang' : 'Kuat'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label-field">Konfirmasi Password</label>
                  <div className="relative mt-1.5">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Ulangi password baru"
                      value={pwForm.confirm_password}
                      onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                  loading={savingPw}
                  disabled={!pwForm.new_password || !pwForm.confirm_password}
                >
                  Ganti Password
                </Button>
              </div>
            </Card>

            {/* Account info */}
            <Card>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Shield size={17} className="text-slate-500" />
                </div>
                <p className="text-sm font-700 text-slate-900">Informasi Akun</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'User ID', value: user?.id?.slice(0, 18) + '…' },
                  { label: 'Email Terverifikasi', value: user?.email_confirmed_at ? 'Ya ✓' : 'Belum' },
                  { label: 'Bergabung', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-' },
                  { label: 'Terakhir Login', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('id-ID') : '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-600 text-slate-800">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
