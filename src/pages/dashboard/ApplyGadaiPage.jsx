import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Input, CustomSelect, Textarea, CurrencyInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService, documentService } from '../../services'
import { BANKS, COLLATERAL_CATEGORIES, MANSGADAI_CONFIG } from '../../lib/constants'
import { calculateGadaiSimulation, formatIDR, generateRefNumber } from '../../lib/utils'
import { Upload, X, Image, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const BANK_OPTIONS = BANKS.map(b => ({
  value: b.code,
  label: b.name,
  sublabel: b.premium ? 'Fee 2.5%' : 'Fee 5%',
  icon: b.premium ? '⭐' : '🏦',
}))

const CATEGORY_OPTIONS = COLLATERAL_CATEGORIES.map(c => ({
  value: c.value,
  label: c.label,
}))

const MAX_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// ── Inline lazy file picker — stores File object only, no upload yet ──────────
function ItemPhotoInput({ value, onChange }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = (file) => {
    setError(null)
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Format tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_SIZE_MB}MB.`)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)
    onChange(file)
  }

  const clear = () => {
    setPreview(null)
    setError(null)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="label-field">
        Foto Barang <span className="text-red-400 ml-0.5">*</span>
      </label>
      <div className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden
        ${preview ? 'border-emerald-300 p-0' : 'border-slate-200 bg-slate-50/50 p-8'}
        ${error ? 'border-red-300 bg-red-50/30' : ''}`}>
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview barang" className="w-full max-h-48 object-cover rounded-xl" />
            <button type="button" onClick={clear}
              className="absolute top-2 right-2 w-6 h-6 bg-slate-900/70 rounded-full flex items-center justify-center text-white hover:bg-slate-900 transition-colors">
              <X size={12} />
            </button>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-slate-700 text-white text-xs px-2 py-1 rounded-full">
              <CheckCircle size={10} />
              Siap diupload saat submit
            </div>
          </div>
        ) : (
          <label htmlFor="item-photo-input" className="flex flex-col items-center gap-3 cursor-pointer text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <Image size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-500 text-slate-600">Klik untuk pilih foto atau drag & drop</p>
              <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WebP · Maks {MAX_SIZE_MB}MB</p>
            </div>
            <input id="item-photo-input" type="file" accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
              onDragOver={e => e.preventDefault()}
            />
          </label>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 font-500">
          <AlertCircle size={12} />{error}
        </p>
      )}
    </div>
  )
}

export default function ApplyGadaiPage() {
  // ── ALL hooks must be at the top, unconditionally ─────────────────────
  const { profile, profileLoading } = useAuth()
  const navigate = useNavigate()

  const [itemPhotoFile, setItemPhotoFile] = useState(null) // raw File — uploaded only on submit
  const [loading, setLoading] = useState(false)
  const [bankCode, setBankCode] = useState('BCA')
  const [category, setCategory] = useState('')
  const [loanAmount, setLoanAmount] = useState(MANSGADAI_CONFIG.MIN_AMOUNT)

  const { register, handleSubmit, formState: { errors } } = useForm()

  // ── Profile & KYC guard ───────────────────────────────────────────────
  useEffect(() => {
    if (profileLoading || profile === null) return
    const isProfileComplete = !!(
      profile.full_name && profile.nik && profile.phone &&
      profile.birth_date && profile.address && profile.occupation && profile.income
    )
    if (!isProfileComplete) {
      toast.error('Lengkapi data profil sebelum mengajukan gadai')
      navigate('/dashboard/profile')
      return
    }
    if (profile.kyc_status !== 'verified') {
      toast.error('Verifikasi KYC diperlukan sebelum pengajuan')
      navigate('/dashboard/profile')
      return
    }
  }, [profile, profileLoading, navigate])

  // ── Derived state ─────────────────────────────────────────────────────
  const sim = calculateGadaiSimulation(Number(loanAmount), bankCode)

  const isProfileComplete = !!(
    profile?.full_name && profile?.nik && profile?.phone &&
    profile?.birth_date && profile?.address && profile?.occupation && profile?.income
  )
  const canRender = !profileLoading && profile !== null && isProfileComplete && profile?.kyc_status === 'verified'

  // ── Submit — upload photo first, then create record ───────────────────
  const onSubmit = async data => {
    if (!category) { toast.error('Pilih kategori barang'); return }
    if (!bankCode)  { toast.error('Pilih bank tujuan'); return }
    if (!itemPhotoFile) { toast.error('Foto barang wajib diupload'); return }

    setLoading(true)

    // Upload photo only now (after user confirmed submission)
    const uploadPath = `gadai/${profile.id}/item/${Date.now()}-${itemPhotoFile.name.replace(/\s+/g, '_')}`
    const { url: itemPhotoUrl, error: uploadError } = await documentService.upload(
      itemPhotoFile, 'documents', uploadPath
    )
    if (uploadError) {
      toast.error('Gagal mengupload foto barang. Coba lagi.')
      setLoading(false)
      return
    }

    const ref = generateRefNumber('MG')
    const { error } = await gadaiService.create(profile.id, {
      ref_number:       ref,
      item_name:        data.item_name,
      item_description: data.item_description,
      item_category:    category,
      pickup_address:   data.pickup_address,
      pickup_schedule:  data.pickup_schedule,
      account_number:   data.account_number,
      account_name:     data.account_name,
      bank_code:        bankCode,
      loan_amount:      loanAmount,
      interest:         sim.interest,
      platform_fee:     sim.platformFee,
      net_disbursement: sim.netDisbursement,
      total_repayment:  sim.totalRepayment,
      due_date:         sim.dueDate,
      item_photo_url:   itemPhotoUrl,
    })

    setLoading(false)
    if (!error) {
      toast.success('Pengajuan gadai berhasil dikirim!')
      navigate('/dashboard/gadai')
    } else {
      console.error(error)
      toast.error('Gagal mengirim pengajuan: ' + (error.message || ''))
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────
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
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Pengajuan MansGadai</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gadaikan barang berharga Anda dan dapatkan dana cepat</p>
        </div>

        {/* Info: foto diupload saat submit */}
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Upload size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Foto barang akan diupload otomatis saat Anda menekan <strong>Kirim Pengajuan</strong>. 
            Tidak ada file yang disimpan sebelum pengajuan dikonfirmasi.
          </p>
        </div>

        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Informasi Barang</h2>
          <div className="space-y-4">
            <Input
              label="Nama Barang" placeholder="Contoh: iPhone 15 Pro Max 256GB" required
              {...register('item_name', { required: 'Wajib diisi' })}
              error={errors.item_name?.message}
            />

            <CustomSelect
              label="Kategori Barang" required
              placeholder="Pilih kategori"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
            />

            <Textarea
              label="Deskripsi & Kondisi" rows={3}
              placeholder="Kondisi barang, kelengkapan aksesori, tahun pembelian, catatan khusus..."
              required
              {...register('item_description', { required: 'Wajib diisi' })}
              error={errors.item_description?.message}
            />

            {/* Lazy file picker — no upload until submit */}
            <ItemPhotoInput value={itemPhotoFile} onChange={setItemPhotoFile} />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Penjemputan</h2>
          <div className="space-y-4">
            <Input
              label="Alamat Penjemputan" placeholder="Alamat lengkap" required
              {...register('pickup_address', { required: 'Wajib diisi' })}
              error={errors.pickup_address?.message}
            />
            <Input
              label="Jadwal Penjemputan" type="datetime-local" required
              {...register('pickup_schedule', { required: 'Wajib diisi' })}
              error={errors.pickup_schedule?.message}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Pinjaman & Rekening</h2>
          <div className="space-y-4">
            <CurrencyInput
              label="Nilai Pinjaman yang Diinginkan" required
              value={loanAmount}
              onChange={setLoanAmount}
              min={MANSGADAI_CONFIG.MIN_AMOUNT}
              max={MANSGADAI_CONFIG.MAX_AMOUNT}
              hint={`Min ${formatIDR(MANSGADAI_CONFIG.MIN_AMOUNT)} · Maks ${formatIDR(MANSGADAI_CONFIG.MAX_AMOUNT)}`}
            />

            {/* Simulation */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs font-700 text-emerald-700 mb-3">Estimasi Pencairan</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Dana Bersih',    value: formatIDR(sim.netDisbursement), highlight: true },
                  { label: 'Total Bayar',    value: formatIDR(sim.totalRepayment) },
                  { label: 'Bunga (5%/bln)', value: formatIDR(sim.interest) },
                  { label: 'Platform Fee',   value: formatIDR(sim.platformFee) },
                ].map(({ label, value, highlight }) => (
                  <div key={label}>
                    <p className="text-xs text-emerald-600">{label}</p>
                    <p className={`font-700 ${highlight ? 'text-emerald-800 text-base' : 'text-emerald-700'}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <CustomSelect
                label="Bank Tujuan" required
                placeholder="Pilih bank"
                options={BANK_OPTIONS}
                value={bankCode}
                onChange={setBankCode}
                searchable
              />
              <Input
                label="Nomor Rekening" placeholder="1234567890" required
                {...register('account_number', { required: 'Wajib diisi' })}
                error={errors.account_number?.message}
              />
            </div>
            <Input
              label="Nama Pemilik Rekening" placeholder="Sesuai buku tabungan" required
              {...register('account_name', { required: 'Wajib diisi' })}
              error={errors.account_name?.message}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit(onSubmit)} loading={loading} size="lg">
            {loading ? 'Mengupload & Mengirim...' : 'Kirim Pengajuan Gadai'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
