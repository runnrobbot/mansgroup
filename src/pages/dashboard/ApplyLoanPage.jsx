import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronRight, User, FileText, CreditCard, Shield } from 'lucide-react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Input, CustomSelect, Textarea, CurrencyInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { useAuth } from '../../contexts/AuthContext'
import { loanService } from '../../services'
import { supabase } from '../../lib/supabase'
import { calculateLoanSimulation, formatIDR, generateRefNumber } from '../../lib/utils'
import { BANKS, MANSLATER_CONFIG } from '../../lib/constants'
import toast from 'react-hot-toast'

const BANK_OPTIONS = BANKS.map(b => ({
  value: b.code,
  label: b.name,
  sublabel: b.premium ? 'Fee 2.5%' : 'Fee 5%',
  icon: b.premium ? '⭐' : '🏦',
}))

const TENOR_OPTIONS = [
  { value: 1, label: '1 Bulan', sublabel: 'Jatuh tempo 1 bulan' },
  { value: 3, label: '3 Bulan', sublabel: 'Cicilan 3× per bulan' },
  { value: 6, label: '6 Bulan', sublabel: 'Cicilan 6× per bulan' },
  { value: 9, label: '9 Bulan', sublabel: 'Cicilan 9× per bulan' },
]

const STEPS = [
  { id: 1, label: 'Data Diri',   icon: User },
  { id: 2, label: 'Dokumen',     icon: FileText },
  { id: 3, label: 'Pinjaman',    icon: CreditCard },
  { id: 4, label: 'Persetujuan', icon: Shield },
]

// Native select for emergency_relation (no CustomSelect needed)
function Select({ label, error, children, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label-field">{label}</label>}
      <select
        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white transition-colors outline-none
          ${error ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-emerald-400'}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function ApplyLoanPage() {
  // ── ALL hooks unconditionally at the top ─────────────────────────────
  const { profile, profileLoading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep]         = useState(1)
  const [files, setFiles]       = useState({})
  const [loading, setLoading]   = useState(false)
  const [userType, setUserType] = useState('worker')
  const [bankCode, setBankCode] = useState('BCA')
  const [tenor, setTenor]       = useState(3)

  const { register, handleSubmit, watch, setValue, formState: { errors }, trigger } = useForm({
    defaultValues: {
      full_name:  '',
      phone:      '',
      nik:        '',
      birth_place:'',
      birth_date: '',
      address:    '',
      occupation: '',
      income:     0,
      amount:     5000000,
      account_number: '',
      account_name:   '',
    }
  })

  // Pre-fill from profile once it loads
  useEffect(() => {
    if (!profile) return
    setValue('full_name',   profile.full_name  || '')
    setValue('phone',       profile.phone      || '')
    setValue('nik',         profile.nik        || '')
    setValue('birth_place', profile.birth_place|| '')
    setValue('birth_date',  profile.birth_date || '')
    setValue('address',     profile.address    || '')
    setValue('occupation',  profile.occupation || '')
    setValue('income',      profile.income     || 0)
    if (profile.occupation === 'mahasiswa') setUserType('student')
  }, [profile, setValue])

  // ── Profile & KYC guard ───────────────────────────────────────────────
  useEffect(() => {
    if (profileLoading || profile === null) return
    const complete = !!(
      profile.full_name && profile.nik && profile.phone &&
      profile.birth_date && profile.address && profile.occupation && profile.income
    )
    if (!complete) {
      toast.error('Lengkapi data profil sebelum mengajukan pinjaman')
      navigate('/dashboard/profile')
      return
    }
    if (profile.kyc_status !== 'verified') {
      toast.error('Verifikasi KYC diperlukan sebelum pengajuan')
      navigate('/dashboard/profile')
    }
  }, [profile, profileLoading, navigate])

  // ── Derived values (safe — after all hooks) ───────────────────────────
  const amount  = watch('amount', 5000000)
  const sim     = calculateLoanSimulation(Number(amount), Number(tenor), bankCode, profile?.reward_eligible)
  const profilePrefilled = !!(profile?.full_name && profile?.nik && profile?.phone)

  const isProfileComplete = !!(
    profile?.full_name && profile?.nik && profile?.phone &&
    profile?.birth_date && profile?.address && profile?.occupation && profile?.income
  )
  const canRender = !profileLoading && profile !== null && isProfileComplete && profile?.kyc_status === 'verified'

  const nextStep = async () => {
    const fields = {
      1: ['full_name', 'nik', 'birth_date', 'phone', 'emergency_name', 'emergency_phone', 'emergency_relation'],
      2: [],
      3: ['amount', 'account_number', 'account_name'],
    }
    if (step === 3) {
      if (!bankCode) { toast.error('Pilih bank tujuan'); return }
      if (!tenor)    { toast.error('Pilih tenor pinjaman'); return }
    }
    const valid = await trigger(fields[step] || [])
    if (valid) setStep(s => s + 1)
  }

  const onSubmit = async (data) => {
    if (!files.ktp_photo_url)   { toast.error('Upload foto KTP terlebih dahulu'); return }
    if (!files.selfie_ktp_url)  { toast.error('Upload selfie dengan KTP terlebih dahulu'); return }

    setLoading(true)

    // One-time profile save if data not yet stored
    if (!profile.nik || !profile.full_name) {
      await supabase.from('profiles').update({
        full_name: data.full_name, nik: data.nik, birth_place: data.birth_place,
        birth_date: data.birth_date, address: data.address, occupation: data.occupation,
        income: Number(data.income), phone: data.phone,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id)
    }

    const { error } = await loanService.create(profile.id, {
      ref_number:           generateRefNumber('ML'),
      amount:               Number(data.amount),
      tenor:                Number(tenor),
      interest_rate:        sim.interestRate / 100,
      total_interest:       sim.totalInterest,
      platform_fee:         sim.platformFee,
      net_disbursement:     sim.netDisbursement,
      total_repayment:      sim.totalRepayment,
      monthly_installment:  sim.monthlyInstallment,
      bank_code:            bankCode,
      account_number:       data.account_number,
      account_name:         data.account_name,
      user_type:            userType,
      // personal data snapshot
      full_name:            data.full_name,
      nik:                  data.nik,
      birth_place:          data.birth_place,
      birth_date:           data.birth_date,
      address:              data.address,
      occupation:           data.occupation,
      income:               Number(data.income),
      phone:                data.phone,
      emergency_name:       data.emergency_name,
      emergency_phone:      data.emergency_phone,
      emergency_relation:   data.emergency_relation,
      nim:                  data.nim        || null,
      campus_name:          data.campus_name|| null,
      // documents
      ktp_photo_url:        files.ktp_photo_url  || null,
      selfie_ktp_url:       files.selfie_ktp_url || null,
      selfie_url:           files.selfie_url     || null,
      kk_url:               files.kk_url         || null,
      ktm_url:              files.ktm_url         || null,
      pddikti_url:          files.pddikti_url     || null,
    })

    setLoading(false)
    if (!error) {
      toast.success('Pengajuan berhasil dikirim!')
      navigate('/dashboard/loans')
    } else {
      console.error(error)
      toast.error('Gagal mengirim pengajuan')
    }
  }

  // ── Render guards (after all hooks) ──────────────────────────────────
  if (profileLoading || !profile) {
    return (
      <DashboardLayout role="user">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }
  if (!canRender) return null

  // ── Form UI ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout role="user">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900 tracking-tight">Pengajuan Pinjaman MansLater</h1>
          <p className="text-sm text-slate-500 mt-1">Isi data dengan benar sesuai dokumen resmi Anda</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all flex-1 ${
                step === s.id ? 'bg-emerald-50 text-emerald-700' :
                step > s.id  ? 'text-emerald-600' : 'text-slate-300'
              }`}>
                {step > s.id ? (
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-700 flex-shrink-0 border ${
                    step === s.id ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 text-slate-400'
                  }`}>{s.id}</div>
                )}
                <span className="text-xs font-600 hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            {/* ── Step 1: Data Diri ── */}
            {step === 1 && (
              <Card>
                <h2 className="text-base font-700 text-slate-900 mb-4">Data Diri</h2>
                {profilePrefilled && (
                  <div className="mb-5 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 font-600">Data diisi otomatis dari profil kamu. Periksa dan sesuaikan jika perlu.</p>
                  </div>
                )}
                <div className="space-y-5">
                  <div>
                    <label className="label-field">Kategori Pemohon</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ value: 'worker', label: 'Pekerja / Umum' }, { value: 'student', label: 'Mahasiswa' }].map(t => (
                        <button key={t.value} type="button" onClick={() => setUserType(t.value)}
                          className={`p-3.5 rounded-xl border text-sm font-600 transition-all ${
                            userType === t.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-emerald-200'
                          }`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Nama Lengkap" placeholder="Sesuai KTP" required {...register('full_name', { required: 'Wajib diisi' })} error={errors.full_name?.message} />
                    <Input label="NIK" placeholder="16 digit" maxLength={16} required {...register('nik', { required: 'Wajib diisi', minLength: { value: 16, message: 'NIK harus 16 digit' }, maxLength: 16 })} error={errors.nik?.message} />
                    <Input label="Tempat Lahir" placeholder="Kota kelahiran" required {...register('birth_place', { required: 'Wajib diisi' })} error={errors.birth_place?.message} />
                    <Input label="Tanggal Lahir" type="date" required {...register('birth_date', { required: 'Wajib diisi' })} error={errors.birth_date?.message} />
                    <Input label="Nomor HP" placeholder="08xxxxxxxxxx" type="tel" required {...register('phone', { required: 'Wajib diisi' })} error={errors.phone?.message} />
                    <Input label="Pekerjaan" placeholder="Pekerjaan saat ini" required {...register('occupation', { required: 'Wajib diisi' })} error={errors.occupation?.message} />
                  </div>
                  <CurrencyInput
                    label="Penghasilan Bulanan" required
                    value={watch('income') || 0}
                    onChange={v => setValue('income', v, { shouldValidate: true })}
                    min={1000000}
                    error={errors.income?.message}
                  />
                  <Textarea label="Alamat Lengkap" placeholder="Alamat sesuai KTP..." rows={3} required {...register('address', { required: 'Wajib diisi' })} error={errors.address?.message} />

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Nama Kontak Darurat" required {...register('emergency_name', { required: 'Wajib diisi' })} error={errors.emergency_name?.message} />
                    <Input label="No. HP Kontak Darurat" type="tel" required {...register('emergency_phone', { required: 'Wajib diisi' })} error={errors.emergency_phone?.message} />
                    <div className="sm:col-span-2">
                      <Select label="Hubungan Kontak Darurat" required {...register('emergency_relation', { required: 'Wajib diisi' })} error={errors.emergency_relation?.message}>
                        <option value="">Pilih hubungan</option>
                        {['Orang Tua', 'Pasangan', 'Kakak/Adik', 'Teman', 'Rekan Kerja', 'Lainnya'].map(r => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    </div>
                  </div>

                  {userType === 'student' && (
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
                      <p className="text-xs font-700 text-blue-700">Data Mahasiswa</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Input label="NIM" placeholder="Nomor Induk Mahasiswa" {...register('nim')} />
                        <Input label="Nama Kampus" placeholder="Universitas/Institut" {...register('campus_name')} />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ── Step 2: Dokumen ── */}
            {step === 2 && (
              <Card>
                <h2 className="text-base font-700 text-slate-900 mb-6">Upload Dokumen</h2>
                <div className="space-y-5">
                  <FileUpload label="Foto KTP" required accept="image" bucket="documents"
                    path={`kyc/${profile?.id}/ktp`} hint="Pastikan KTP terlihat jelas, tidak buram"
                    onUploaded={(file, url) => setFiles(f => ({ ...f, ktp_photo: file, ktp_photo_url: url }))} />
                  <FileUpload label="Selfie dengan KTP" required accept="image" bucket="documents"
                    path={`kyc/${profile?.id}/selfie_ktp`} hint="Pegang KTP di samping wajah, foto dari depan"
                    onUploaded={(file, url) => setFiles(f => ({ ...f, selfie_ktp: file, selfie_ktp_url: url }))} />
                  <FileUpload label="Foto Wajah (Selfie Biasa)" accept="image" bucket="documents"
                    path={`kyc/${profile?.id}/selfie`}
                    onUploaded={(file, url) => setFiles(f => ({ ...f, selfie: file, selfie_url: url }))} />
                  <FileUpload label="Kartu Keluarga (KK)" accept="document" bucket="documents"
                    path={`kyc/${profile?.id}/kk`}
                    onUploaded={(file, url) => setFiles(f => ({ ...f, kk: file, kk_url: url }))} />
                  {userType === 'student' && (
                    <>
                      <FileUpload label="Foto Kartu Tanda Mahasiswa (KTM)" accept="image" bucket="documents"
                        path={`kyc/${profile?.id}/ktm`}
                        onUploaded={(file, url) => setFiles(f => ({ ...f, ktm: file, ktm_url: url }))} />
                      <FileUpload label="Screenshot PDDIKTI (Bukti Mahasiswa Aktif)" accept="image" bucket="documents"
                        path={`kyc/${profile?.id}/pddikti`} hint="Screenshot dari pddikti.kemdikbud.go.id"
                        onUploaded={(file, url) => setFiles(f => ({ ...f, pddikti: file, pddikti_url: url }))} />
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* ── Step 3: Detail Pinjaman ── */}
            {step === 3 && (
              <div className="space-y-5">
                <Card>
                  <h2 className="text-base font-700 text-slate-900 mb-6">Detail Pinjaman</h2>
                  <div className="space-y-5">
                    <CurrencyInput label="Jumlah Pinjaman" required
                      value={watch('amount') || MANSLATER_CONFIG.MIN_AMOUNT}
                      onChange={v => setValue('amount', v, { shouldValidate: true })}
                      min={MANSLATER_CONFIG.MIN_AMOUNT} max={MANSLATER_CONFIG.MAX_AMOUNT} />
                    <CustomSelect label="Tenor" required placeholder="Pilih tenor"
                      options={TENOR_OPTIONS} value={tenor} onChange={v => setTenor(Number(v))} searchable={false} />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <CustomSelect label="Bank Tujuan" required placeholder="Pilih bank"
                        options={BANK_OPTIONS} value={bankCode} onChange={v => setBankCode(v)} searchable />
                      <Input label="Nomor Rekening" placeholder="1234567890" required
                        {...register('account_number', { required: 'Wajib diisi' })} error={errors.account_number?.message} />
                    </div>
                    <Input label="Nama Pemilik Rekening" placeholder="Sesuai buku tabungan" required
                      {...register('account_name', { required: 'Wajib diisi' })} error={errors.account_name?.message} />
                  </div>
                </Card>
                <Card className="bg-emerald-50/50 border-emerald-100">
                  <h3 className="text-sm font-700 text-slate-900 mb-4">Ringkasan Simulasi</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Dana Diterima (Bersih)', value: formatIDR(sim.netDisbursement), bold: true },
                      { label: 'Cicilan per Bulan',      value: formatIDR(sim.monthlyInstallment) },
                      { label: 'Total Bunga',            value: formatIDR(sim.totalInterest) },
                      { label: 'Biaya Admin',            value: formatIDR(sim.platformFee) },
                      { label: 'Total yang Dibayar',     value: formatIDR(sim.totalRepayment) },
                    ].map(({ label, value, bold }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-sm text-slate-500">{label}</span>
                        <span className={`text-sm font-700 ${bold ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* ── Step 4: Persetujuan ── */}
            {step === 4 && (
              <Card>
                <h2 className="text-base font-700 text-slate-900 mb-6">Persetujuan Digital</h2>
                <div className="space-y-4">
                  <div className="p-5 bg-slate-50 rounded-xl max-h-64 overflow-y-auto text-xs text-slate-600 leading-relaxed space-y-3">
                    <p className="font-700 text-slate-800">PERJANJIAN PINJAMAN ONLINE — MansLater</p>
                    <p>Dengan mengajukan pinjaman ini, Pemohon menyatakan dan menyetujui bahwa:</p>
                    <ol className="space-y-2 list-decimal list-inside">
                      <li>Seluruh data dan dokumen yang diberikan adalah benar dan dapat dipertanggungjawabkan.</li>
                      <li>Pemohon bersedia mematuhi ketentuan bunga {sim.interestRate}% per bulan, denda keterlambatan 2% per hari pada minggu pertama dan bertambah 1% setiap minggu berikutnya.</li>
                      <li>Pencairan dana akan dipotong biaya admin sebesar {formatIDR(sim.platformFee)} sesuai ketentuan bank yang dipilih.</li>
                      <li>Pemohon memberikan izin kepada MansGroup untuk melakukan verifikasi data termasuk pengecekan riwayat kredit.</li>
                      <li>Perjanjian ini tunduk pada hukum yang berlaku di Republik Indonesia.</li>
                    </ol>
                  </div>
                  <div className="space-y-3">
                    {[
                      { id: 'agree1', label: 'Saya menyetujui syarat dan ketentuan pinjaman di atas' },
                      { id: 'agree2', label: 'Saya menyatakan bahwa seluruh data yang saya berikan adalah benar' },
                      { id: 'agree3', label: 'Saya bersedia menerima konsekuensi hukum jika data yang diberikan terbukti palsu' },
                    ].map(({ id, label }) => (
                      <label key={id} className="flex items-start gap-3 cursor-pointer group">
                        <input type="checkbox" id={id} {...register(id, { required: 'Wajib disetujui' })} className="mt-0.5 w-4 h-4 accent-emerald-600" />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-xs font-700 text-emerald-800 mb-1">Ringkasan Final</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700">
                      <span>Jumlah: <strong>{formatIDR(amount)}</strong></span>
                      <span>Tenor: <strong>{tenor} bulan</strong></span>
                      <span>Dana Bersih: <strong>{formatIDR(sim.netDisbursement)}</strong></span>
                      <span>Cicilan: <strong>{formatIDR(sim.monthlyInstallment)}/bln</strong></span>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(s => s - 1)}>← Kembali</Button>
          ) : <div />}
          {step < 4 ? (
            <Button onClick={nextStep} iconRight={ChevronRight}>Lanjut</Button>
          ) : (
            <Button onClick={handleSubmit(onSubmit)} loading={loading}>Kirim Pengajuan</Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
