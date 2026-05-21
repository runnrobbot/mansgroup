import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService } from '../../services'
import { BANKS, COLLATERAL_CATEGORIES, MANSGADAI_CONFIG } from '../../lib/constants'
import { calculateGadaiSimulation, formatIDR, generateRefNumber } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function ApplyGadaiPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [files, setFiles] = useState({})
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { bank_code: 'BCA', loan_amount: 3000000 } })
  const amount = watch('loan_amount', 3000000)
  const bankCode = watch('bank_code', 'BCA')
  const sim = calculateGadaiSimulation(Number(amount), bankCode)

  const onSubmit = async data => {
    setLoading(true)
    const ref = generateRefNumber('MG')
    const { error } = await gadaiService.create(profile.id, {
      ref_number: ref,
      ...data,
      loan_amount: Number(data.loan_amount),
      interest: sim.interest,
      platform_fee: sim.platformFee,
      net_disbursement: sim.netDisbursement,
      total_repayment: sim.totalRepayment,
      due_date: sim.dueDate,
      item_photo_url: files.item_photo_url || null,
    })
    setLoading(false)
    if (!error) { toast.success('Pengajuan gadai berhasil!'); navigate('/dashboard/gadai') }
  }

  return (
    <DashboardLayout role='user'>
      <div className='max-w-2xl space-y-5'>
        <h1 className='text-xl font-800 text-slate-900'>Pengajuan MansGadai</h1>
        <Card>
          <div className='space-y-4'>
            <Input label='Nama Barang' placeholder='Contoh: iPhone 15 Pro Max' required {...register('item_name', { required: 'Wajib diisi' })} error={errors.item_name?.message} />
            <Select label='Kategori Barang' required {...register('item_category', { required: 'Wajib diisi' })} error={errors.item_category?.message}>
              <option value=''>Pilih kategori</option>
              {COLLATERAL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Textarea label='Deskripsi & Kondisi Barang' rows={3} placeholder='Kondisi barang, kelengkapan, tahun pembelian...' required {...register('item_description', { required: 'Wajib diisi' })} error={errors.item_description?.message} />
            <Input label='Nilai Pinjaman yang Diinginkan' type='number' prefix='Rp' required {...register('loan_amount', { required: true, min: MANSGADAI_CONFIG.MIN_AMOUNT, max: MANSGADAI_CONFIG.MAX_AMOUNT })} error={errors.loan_amount?.message} />
            <FileUpload label='Foto Barang' required accept='image' bucket='documents' path={'gadai/' + profile?.id + '/item'} onUploaded={(f, url) => setFiles(prev => ({ ...prev, item_photo: f, item_photo_url: url }))} />
            <Input label='Alamat Penjemputan' placeholder='Alamat lengkap' required {...register('pickup_address', { required: 'Wajib diisi' })} error={errors.pickup_address?.message} />
            <Input label='Jadwal Penjemputan' type='datetime-local' required {...register('pickup_schedule', { required: 'Wajib diisi' })} error={errors.pickup_schedule?.message} />
            <div className='grid sm:grid-cols-2 gap-4'>
              <Select label='Bank Tujuan' required {...register('bank_code')}>
                {BANKS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
              </Select>
              <Input label='Nomor Rekening' placeholder='1234567890' required {...register('account_number', { required: 'Wajib diisi' })} error={errors.account_number?.message} />
            </div>
          </div>
          <div className='mt-5 p-4 bg-emerald-50 rounded-xl'>
            <p className='text-xs font-700 text-emerald-700 mb-2'>Estimasi:</p>
            <div className='grid grid-cols-2 gap-2 text-xs text-emerald-700'>
              <span>Dana Bersih: <strong>{formatIDR(sim.netDisbursement)}</strong></span>
              <span>Total Bayar: <strong>{formatIDR(sim.totalRepayment)}</strong></span>
            </div>
          </div>
          <div className='mt-5 flex justify-end'>
            <Button onClick={handleSubmit(onSubmit)} loading={loading}>Kirim Pengajuan Gadai</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
