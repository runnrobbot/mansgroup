import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Input, CustomSelect, Textarea, CurrencyInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService } from '../../services'
import { BANKS, COLLATERAL_CATEGORIES, MANSGADAI_CONFIG } from '../../lib/constants'
import { calculateGadaiSimulation, formatIDR, generateRefNumber } from '../../lib/utils'
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

export default function ApplyGadaiPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  // ── Profile & KYC guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
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
  }, [profile, navigate])
  // ─────────────────────────────────────────────────────────────────────────

  const [files, setFiles] = useState({})
  const [loading, setLoading] = useState(false)
  const [bankCode, setBankCode] = useState('BCA')
  const [category, setCategory] = useState('')
  const [loanAmount, setLoanAmount] = useState(MANSGADAI_CONFIG.MIN_AMOUNT)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const sim = calculateGadaiSimulation(Number(loanAmount), bankCode)

  const onSubmit = async data => {
    if (!category) { toast.error('Pilih kategori barang'); return }
    if (!bankCode) { toast.error('Pilih bank tujuan'); return }

    setLoading(true)
    const ref = generateRefNumber('MG')
    const { error } = await gadaiService.create(profile.id, {
      ref_number: ref,
      ...data,
      item_category: category,
      bank_code: bankCode,
      loan_amount: loanAmount,
      interest: sim.interest,
      platform_fee: sim.platformFee,
      net_disbursement: sim.netDisbursement,
      total_repayment: sim.totalRepayment,
      due_date: sim.dueDate,
      item_photo_url: files.item_photo_url || null,
    })
    setLoading(false)
    if (!error) {
      toast.success('Pengajuan gadai berhasil dikirim!')
      navigate('/dashboard/gadai')
    } else {
      toast.error('Gagal mengirim pengajuan')
    }
  }

  return (
    <DashboardLayout role="user">
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Pengajuan MansGadai</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gadaikan barang berharga Anda dan dapatkan dana cepat</p>
        </div>

        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Informasi Barang</h2>
          <div className="space-y-4">
            <Input label="Nama Barang" placeholder="Contoh: iPhone 15 Pro Max 256GB" required
              {...register('item_name', { required: 'Wajib diisi' })} error={errors.item_name?.message} />

            <CustomSelect
              label="Kategori Barang" required
              placeholder="Pilih kategori"
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
            />

            <Textarea label="Deskripsi & Kondisi" rows={3}
              placeholder="Kondisi barang, kelengkapan aksesori, tahun pembelian, catatan khusus..."
              required {...register('item_description', { required: 'Wajib diisi' })} error={errors.item_description?.message} />

            <FileUpload
              label="Foto Barang" required accept="image"
              bucket="documents" path={`gadai/${profile?.id}/item`}
              onUploaded={(f, url) => setFiles(p => ({ ...p, item_photo: f, item_photo_url: url }))}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-700 text-slate-900 mb-5">Penjemputan</h2>
          <div className="space-y-4">
            <Input label="Alamat Penjemputan" placeholder="Alamat lengkap" required
              {...register('pickup_address', { required: 'Wajib diisi' })} error={errors.pickup_address?.message} />
            <Input label="Jadwal Penjemputan" type="datetime-local" required
              {...register('pickup_schedule', { required: 'Wajib diisi' })} error={errors.pickup_schedule?.message} />
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

            {/* Simulation preview */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-xs font-700 text-emerald-700 mb-3">Estimasi Pencairan</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Dana Bersih', value: formatIDR(sim.netDisbursement), highlight: true },
                  { label: 'Total Bayar', value: formatIDR(sim.totalRepayment) },
                  { label: 'Bunga (5%/bln)', value: formatIDR(sim.interest) },
                  { label: 'Platform Fee', value: formatIDR(sim.platformFee) },
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
              <Input label="Nomor Rekening" placeholder="1234567890" required
                {...register('account_number', { required: 'Wajib diisi' })} error={errors.account_number?.message} />
            </div>
            <Input label="Nama Pemilik Rekening" placeholder="Sesuai buku tabungan" required
              {...register('account_name', { required: 'Wajib diisi' })} error={errors.account_name?.message} />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSubmit(onSubmit)} loading={loading} size="lg">
            Kirim Pengajuan Gadai
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
