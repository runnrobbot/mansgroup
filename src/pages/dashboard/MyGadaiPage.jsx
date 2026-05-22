import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService, paymentService, midtransService } from '../../services'
import { supabase } from '../../lib/supabase'
import { recomputeGadaiState, recomputeGadaiExtension } from '../../lib/paymentSync'
import { useDebouncedReload } from '../../lib/useDebouncedReload'
import {
  formatIDR, formatDate, formatDateTime,
  getEffectiveGadaiNumbers, getEffectiveAmount, isRevised, generateRefNumber,
} from '../../lib/utils'
import {
  Plus, Eye, RefreshCw, AlertTriangle, Calendar, Package,
  Lock, Clock, ArrowRight, AlertCircle, CreditCard, Loader,
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_INFO = {
  pending: { label: 'Menunggu Review', color: 'bg-slate-100 text-slate-600' },
  review: { label: 'Direview Staff', color: 'bg-blue-50 text-blue-700' },
  waiting_pickup: { label: 'Menunggu Penjemputan', color: 'bg-amber-50 text-amber-700' },
  picked_up: { label: 'Barang Dijemput', color: 'bg-violet-50 text-violet-700' },
  received: { label: 'Diterima Warehouse', color: 'bg-blue-50 text-blue-700' },
  active: { label: 'Aktif Digadai', color: 'bg-emerald-50 text-emerald-700' },
  due: { label: 'Jatuh Tempo', color: 'bg-amber-50 text-amber-700' },
  extended: { label: 'Diperpanjang', color: 'bg-teal-50 text-teal-700' },
  overdue: { label: 'Telat Bayar', color: 'bg-red-50 text-red-700' },
  completed: { label: 'Lunas', color: 'bg-emerald-100 text-emerald-800' },
  forfeited: { label: 'Disita', color: 'bg-red-100 text-red-800' },
  rejected: { label: 'Ditolak', color: 'bg-red-50 text-red-700' },
}

const PAYABLE_STATUSES = ['active', 'due', 'extended', 'overdue']

export default function MyGadaiPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)

  // Detail modal
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Payment modal
  const [payGadai, setPayGadai] = useState(null)       // gadai record yang mau dibayar
  const [payType, setPayType] = useState(null)          // 'extension' | 'repayment'
  const [paying, setPaying] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (!profile || loadingRef.current) return
    loadingRef.current = true
    try {
      const { data } = await gadaiService.getByUserId(profile.id)
      if (mountedRef.current) setGadais(data || [])
    } finally {
      loadingRef.current = false
      if (mountedRef.current) setLoading(false)
    }
  }, [profile])

  useEffect(() => { load() }, [load])

  const scheduleReload = useDebouncedReload(load, 250)

  // Realtime — sync ketika status gadai berubah
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`mygadai-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'gadai_applications',
        filter: `user_id=eq.${profile.id}`,
      }, () => { scheduleReload() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `user_id=eq.${profile.id}`,
      }, () => { scheduleReload() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, scheduleReload])

  // ── Status logic ──────────────────────────────────────────────────────────
  const isProfileComplete = !!(
    profile?.full_name && profile?.nik && profile?.phone &&
    profile?.birth_date && profile?.address && profile?.occupation && profile?.income
  )
  const isKycVerified = profile?.kyc_status === 'verified'

  const GADAI_MAX = 3
  const activeGadaiStatuses = ['active', 'due', 'extended', 'overdue', 'waiting_pickup', 'picked_up', 'received']
  const pendingGadaiStatuses = ['pending', 'review', 'revision', 'approved']

  const activeGadais = gadais.filter(g => activeGadaiStatuses.includes(g.status))
  const pendingGadais = gadais.filter(g => pendingGadaiStatuses.includes(g.status))
  const inFlightCount = activeGadais.length + pendingGadais.length

  const activeGadai = activeGadais[0] || null
  const pendingGadai = pendingGadais[0] || null

  // ── Midtrans payment ──────────────────────────────────────────────────────

  const openPay = (gadai, type) => {
    setPayGadai(gadai)
    setPayType(type)
    setPayOpen(true)
  }

  const handlePay = async () => {
    if (!payGadai || !payType) return
    const eff = getEffectiveGadaiNumbers(payGadai)
    const nominal = payType === 'extension' ? eff.extensionFee : eff.totalRepayment

    if (!nominal || nominal <= 0) {
      toast.error('Nominal pembayaran tidak valid')
      return
    }

    const label = payType === 'extension'
      ? `Perpanjangan gadai ${payGadai.ref_number} — +30 hari`
      : `Pelunasan gadai ${payGadai.ref_number}`

    const ok = await confirm({
      title: payType === 'extension' ? 'Perpanjang Gadai?' : 'Lunasi Gadai?',
      message: `${label}. Total pembayaran: ${formatIDR(nominal)}. Kamu akan diarahkan ke halaman pembayaran Midtrans yang aman.`,
      variant: 'info',
      confirmLabel: 'Lanjutkan Pembayaran',
    })
    if (!ok) return

    setPaying(true)
    try {
      // 1. Buat record payment
      const orderId = `GAD-${generateRefNumber()}`
      const { data: payment, error: createErr } = await paymentService.create({
        user_id: profile.id,
        gadai_id: payGadai.id,
        amount: nominal,
        payment_type: payType,   // 'extension' | 'repayment'
        payment_method: 'midtrans',
        midtrans_order_id: orderId,
        status: 'pending',
      })
      if (createErr || !payment) throw new Error(createErr?.message || 'Gagal membuat order pembayaran')

      // 2. Request Snap token
      const { token, error: tokenErr } = await midtransService.createSnapToken({
        orderId,
        grossAmount: nominal,
        customerName: profile.full_name,
        customerEmail: profile.email,
        customerPhone: profile.phone,
        paymentId: payment.id,
        itemDetails: [{
          id: payGadai.id,
          price: nominal,
          quantity: 1,
          name: (payType === 'extension'
            ? `Perpanjangan ${payGadai.ref_number}`
            : `Pelunasan ${payGadai.ref_number}`
          ).slice(0, 50),
        }],
      })

      if (tokenErr || !token) {
        await paymentService.update(payment.id, {
          status: 'failed',
          notes: `Gagal token Midtrans: ${tokenErr?.message || 'unknown'}`,
        })
        throw new Error(tokenErr?.message || 'Layanan pembayaran tidak tersedia. Coba beberapa saat lagi.')
      }

      // 3. Buka Snap popup
      await midtransService.loadSnapScript()

      window.snap.pay(token, {
        onSuccess: async (result) => {
          // Update payment record → confirmed
          await paymentService.update(payment.id, {
            status: 'settlement',
            midtrans_status: result.transaction_status,
            midtrans_transaction_id: result.transaction_id,
            midtrans_payment_type: result.payment_type,
          })

          // Update gadai status sesuai tipe pembayaran
          if (payType === 'extension') {
            await recomputeGadaiExtension(payGadai.id)
          } else {
            await recomputeGadaiState(payGadai.id)
          }

          if (!mountedRef.current) return
          toast.success(
            payType === 'extension'
              ? 'Gadai berhasil diperpanjang! Jatuh tempo diperbarui +30 hari.'
              : 'Pelunasan berhasil! Gadai sudah berstatus Lunas.',
            { duration: 5000 }
          )
          setPayOpen(false)
          load()
        },
        onPending: async (result) => {
          await paymentService.update(payment.id, {
            status: 'verification',
            midtrans_status: result.transaction_status,
            midtrans_transaction_id: result.transaction_id,
            midtrans_payment_type: result.payment_type,
          })
          if (!mountedRef.current) return
          toast('Pembayaran diproses. Selesaikan sesuai instruksi yang diberikan.', { icon: '⏳', duration: 6000 })
          setPayOpen(false)
          scheduleReload()
        },
        onError: async (result) => {
          await paymentService.update(payment.id, {
            status: 'failed',
            midtrans_status: result?.status_message || 'error',
          })
          if (!mountedRef.current) return
          toast.error('Pembayaran gagal. Silakan coba lagi.')
          scheduleReload()
        },
        onClose: () => {
          if (!mountedRef.current) return
          toast('Pembayaran belum diselesaikan. Kamu bisa melanjutkan dari halaman ini.', { icon: 'ℹ️' })
          setPayOpen(false)
          scheduleReload()
        },
      })
    } catch (err) {
      console.error('Gadai payment error:', err)
      if (mountedRef.current) toast.error(err.message || 'Terjadi kesalahan saat memproses pembayaran')
    } finally {
      if (mountedRef.current) setPaying(false)
    }
  }

  // ── Tombol "Ajukan Gadai" ─────────────────────────────────────────────────
  const getApplyButton = () => {
    if (!isProfileComplete || !isKycVerified) {
      return (
        <button
          onClick={() => {
            toast.error(!isProfileComplete ? 'Lengkapi data profil terlebih dahulu' : 'Verifikasi KYC diperlukan sebelum pengajuan')
            navigate('/dashboard/profile')
          }}
          className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 bg-slate-200 text-slate-500 cursor-pointer transition-all hover:bg-slate-300"
        >
          <Lock size={14} /> Ajukan Gadai
        </button>
      )
    }
    if (inFlightCount >= GADAI_MAX) {
      return (
        <button
          onClick={() => toast.error(`Maksimal ${GADAI_MAX} gadai aktif/pengajuan per akun. Selesaikan salah satu terlebih dahulu.`)}
          className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 bg-slate-200 text-slate-500 cursor-pointer transition-all hover:bg-slate-300"
        >
          <Lock size={14} /> Ajukan Gadai
        </button>
      )
    }
    if (pendingGadai) {
      return (
        <button
          onClick={() => { setSelected(pendingGadai); setDetailOpen(true) }}
          className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer transition-all hover:bg-amber-100"
        >
          <Clock size={14} /> Lihat Pengajuan
        </button>
      )
    }
    return (
      <Link
        to="/dashboard/gadai/apply"
        className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 btn-primary"
      >
        <Plus size={14} /> Ajukan Gadai {inFlightCount > 0 && <span className="text-xs opacity-70">({inFlightCount}/{GADAI_MAX})</span>}
      </Link>
    )
  }

  // ── Banner info ───────────────────────────────────────────────────────────
  const getBanner = () => {
    if (!isProfileComplete) {
      return (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-700 text-blue-800">Profil belum lengkap</p>
            <p className="text-xs text-blue-600 mt-0.5">Isi data diri, NIK, dan verifikasi KYC sebelum mengajukan gadai.</p>
          </div>
          <Link to="/dashboard/profile" className="ml-auto text-xs font-600 text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap">
            Lengkapi <ArrowRight size={12} />
          </Link>
        </div>
      )
    }
    if (!isKycVerified) {
      return (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-700 text-amber-800">KYC belum diverifikasi</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {profile?.kyc_status === 'pending'
                ? 'Dokumen KYC kamu sedang dalam proses review oleh tim kami.'
                : 'Upload KTP dan selfie untuk memulai proses verifikasi.'}
            </p>
          </div>
          <Link to="/dashboard/profile" className="ml-auto text-xs font-600 text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap">
            {profile?.kyc_status === 'pending' ? 'Cek Status' : 'Verifikasi'} <ArrowRight size={12} />
          </Link>
        </div>
      )
    }
    if (inFlightCount >= GADAI_MAX) {
      return (
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <Lock size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-700 text-slate-700">Batas maksimal gadai tercapai</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Anda memiliki <span className="font-600">{inFlightCount} dari {GADAI_MAX}</span> gadai aktif/dalam proses.
              Selesaikan salah satu sebelum mengajukan gadai baru.
            </p>
          </div>
        </div>
      )
    }
    if (pendingGadai) {
      const eff = getEffectiveAmount(pendingGadai, false)
      const wasRevised = isRevised(pendingGadai, false)
      const isApproved = pendingGadai.status === 'approved'
      return (
        <div className={`flex items-start gap-3 p-4 rounded-2xl ${isApproved ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
          <Clock size={16} className={`flex-shrink-0 mt-0.5 ${isApproved ? 'text-emerald-500' : 'text-amber-500'}`} />
          <div className="flex-1">
            <p className={`text-sm font-700 ${isApproved ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isApproved ? 'Pengajuan Gadai Disetujui — Menunggu Pencairan' : 'Ada pengajuan yang sedang diproses'}
            </p>
            <p className={`text-xs mt-0.5 ${isApproved ? 'text-emerald-700' : 'text-amber-600'}`}>
              {wasRevised ? (
                <>
                  Gadai <span className="font-600">{pendingGadai.ref_number}</span> ({pendingGadai.item_name || 'barang'}) {isApproved ? 'disetujui' : 'sedang direview'} dengan nilai{' '}
                  <span className="font-700">{formatIDR(eff)}</span> (direvisi dari pengajuan asli {formatIDR(pendingGadai.loan_amount)} oleh tim kami).
                </>
              ) : (
                <>
                  Gadai <span className="font-600">{pendingGadai.ref_number}</span> ({pendingGadai.item_name || 'barang'}) {isApproved ? 'sudah disetujui, menunggu pencairan dana.' : 'sedang dalam review tim kami.'}
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => { setSelected(pendingGadai); setDetailOpen(true) }}
            className={`ml-auto text-xs font-600 flex items-center gap-1 whitespace-nowrap ${isApproved ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-600 hover:text-amber-700'}`}
          >
            Lihat <ArrowRight size={12} />
          </button>
        </div>
      )
    }
    if (gadais.some(g => g.status === 'overdue')) {
      return (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-700 text-red-700">Ada gadai yang melewati jatuh tempo</p>
            <p className="text-xs text-red-500 mt-0.5">Segera lakukan perpanjangan atau pelunasan untuk menghindari penyitaan barang.</p>
          </div>
        </div>
      )
    }
    return null
  }

  const stats = {
    active: gadais.filter(g => ['active', 'due', 'extended'].includes(g.status)).length,
    pending: gadais.filter(g => ['pending', 'review', 'waiting_pickup', 'picked_up', 'received'].includes(g.status)).length,
    total: gadais.length,
  }

  // ── Compute payment info for modal ────────────────────────────────────────
  const payEff = payGadai ? getEffectiveGadaiNumbers(payGadai) : null
  const payAmount = payEff
    ? (payType === 'extension' ? payEff.extensionFee : payEff.totalRepayment)
    : 0

  return (
    <DashboardLayout role="user">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Gadai Saya</h1>
            <p className="text-sm text-slate-500 mt-0.5">{gadais.length} total pengajuan gadai</p>
          </div>
          {getApplyButton()}
        </div>

        {/* Banner */}
        {!loading && getBanner()}

        {/* Stats */}
        {!loading && gadais.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="card-premium p-4">
              <p className="text-xs text-slate-400">Aktif Digadai</p>
              <p className="text-2xl font-800 text-emerald-700 mt-1">{stats.active}</p>
            </div>
            <div className="card-premium p-4">
              <p className="text-xs text-slate-400">Proses</p>
              <p className="text-2xl font-800 text-amber-700 mt-1">{stats.pending}</p>
            </div>
            <div className="card-premium p-4">
              <p className="text-xs text-slate-400">Total Pengajuan</p>
              <p className="text-2xl font-800 text-slate-900 mt-1">{stats.total}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <Card>
          <Table>
            <TableHead>
              <Th>Ref</Th>
              <Th>Barang</Th>
              <Th>Nilai Pinjaman</Th>
              <Th>Status</Th>
              <Th>Jatuh Tempo</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : gadais.length === 0 ? (
                <EmptyRow colSpan={6} message="Belum ada gadai" />
              ) : gadais.map(g => {
                const eff = getEffectiveAmount(g, false)
                const revised = isRevised(g, false)
                const canPay = PAYABLE_STATUSES.includes(g.status)
                return (
                  <Tr key={g.id}>
                    <Td><span className="font-600 text-xs font-mono">{g.ref_number || '-'}</span></Td>
                    <Td>
                      <div>
                        <p className="font-600 text-sm text-slate-900">{g.item_name || '-'}</p>
                        <p className="text-xs text-slate-400">{g.item_category || '-'}</p>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-700">{formatIDR(eff)}</span>
                        {revised && (
                          <span className="text-[10px] text-amber-600 mt-0.5">
                            direvisi dari {formatIDR(g.loan_amount)}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_INFO[g.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_INFO[g.status]?.label || g.status}
                      </span>
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {g.due_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(g.due_date)}
                        </div>
                      ) : '-'}
                    </Td>
                    <Td align="center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Detail */}
                        <button
                          onClick={() => { setSelected(g); setDetailOpen(true) }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                          title="Detail"
                        >
                          <Eye size={13} />
                        </button>
                        {/* Perpanjang */}
                        {canPay && (
                          <button
                            onClick={() => openPay(g, 'extension')}
                            disabled={paying}
                            className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-amber-600 transition-colors disabled:opacity-50"
                            title="Perpanjang Gadai"
                          >
                            <RefreshCw size={13} />
                          </button>
                        )}
                        {/* Lunasi */}
                        {canPay && (
                          <button
                            onClick={() => openPay(g, 'repayment')}
                            disabled={paying}
                            className="w-7 h-7 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-emerald-600 transition-colors disabled:opacity-50"
                            title="Bayar Lunas"
                          >
                            <CreditCard size={13} />
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Detail Modal */}
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Gadai" size="md">
          {selected && (() => {
            const eff = getEffectiveGadaiNumbers(selected)
            const canPay = PAYABLE_STATUSES.includes(selected.status)
            return (
              <ModalBody>
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                        <Package size={17} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-700 text-slate-900">{selected.item_name || '-'}</p>
                        <p className="text-xs text-slate-500">{selected.item_category || '-'}</p>
                      </div>
                      <div className="ml-auto">
                        <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_INFO[selected.status]?.color}`}>
                          {STATUS_INFO[selected.status]?.label || selected.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isRevised(selected, false) && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={13} className="text-amber-600" />
                        <p className="text-xs font-700 text-amber-700">Limit Direvisi oleh Tim Kami</p>
                      </div>
                      <p className="text-xs text-amber-700">
                        Pengajuan awal: <span className="line-through">{formatIDR(selected.loan_amount)}</span> · Disetujui: <span className="font-800">{formatIDR(getEffectiveAmount(selected, false))}</span>
                      </p>
                      {selected.revision_note && (
                        <p className="text-xs text-amber-600 mt-1">Catatan: {selected.revision_note}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Ref. Nomor', value: selected.ref_number || '-' },
                      { label: 'Nilai Pinjaman', value: formatIDR(eff.principal) },
                      { label: 'Bunga (5%)', value: formatIDR(eff.interest) },
                      { label: 'Total Pelunasan', value: <span className="text-red-600 font-800">{formatIDR(eff.totalRepayment)}</span> },
                      { label: 'Biaya Perpanjangan', value: <span className="text-amber-700 font-700">{formatIDR(eff.extensionFee)}</span> },
                      { label: 'Jatuh Tempo', value: selected.due_date ? formatDate(selected.due_date) : '-' },
                      { label: 'Jadwal Pickup', value: selected.pickup_schedule ? formatDateTime(selected.pickup_schedule) : '-' },
                      { label: 'Tanggal Pengajuan', value: formatDateTime(selected.created_at) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                        <p className="text-sm font-600 text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>

                  {selected.staff_notes && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-xs font-700 text-blue-700">Catatan Staff</p>
                      <p className="text-xs text-blue-600 mt-0.5">{selected.staff_notes}</p>
                    </div>
                  )}

                  {canPay && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="secondary"
                        icon={RefreshCw}
                        className="flex-1"
                        onClick={() => { setDetailOpen(false); openPay(selected, 'extension') }}
                      >
                        Perpanjang (+{formatIDR(eff.extensionFee)})
                      </Button>
                      <Button
                        icon={CreditCard}
                        className="flex-1"
                        onClick={() => { setDetailOpen(false); openPay(selected, 'repayment') }}
                      >
                        Lunasi ({formatIDR(eff.totalRepayment)})
                      </Button>
                    </div>
                  )}
                </div>
              </ModalBody>
            )
          })()}
        </Modal>

        {/* Payment Confirmation Modal */}
        <Modal
          isOpen={payOpen}
          onClose={() => !paying && setPayOpen(false)}
          title={payType === 'extension' ? 'Perpanjang Gadai' : 'Lunasi Gadai'}
          size="sm"
        >
          {payGadai && payEff && (
            <>
              <ModalBody>
                <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-emerald-600 font-600 mb-1">Gadai</p>
                  <p className="font-800 text-emerald-900">{payGadai.ref_number}</p>
                  <p className="text-xs text-emerald-700 mt-0.5">{payGadai.item_name || '-'}</p>
                </div>

                <div className="space-y-3 mb-4">
                  {payType === 'extension' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Nilai pinjaman</span>
                        <span className="font-600">{formatIDR(payEff.principal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Biaya perpanjangan (10%)</span>
                        <span className="font-700 text-amber-700">{formatIDR(payEff.extensionFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                        <span className="text-slate-700 font-600">Jatuh tempo baru</span>
                        <span className="font-700 text-emerald-700">+30 hari</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Pokok pinjaman</span>
                        <span className="font-600">{formatIDR(payEff.principal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Bunga (5%)</span>
                        <span className="font-600">{formatIDR(payEff.interest)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                        <span className="text-slate-700 font-600">Total pelunasan</span>
                        <span className="font-800 text-red-600">{formatIDR(payEff.totalRepayment)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
                  <CreditCard size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Pembayaran via Midtrans Snap. Mendukung Transfer Bank, QRIS, Virtual Account, e-wallet, dan kartu kredit.
                    Status akan diperbarui otomatis setelah pembayaran selesai.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={paying}>Batal</Button>
                <Button
                  icon={paying ? Loader : CreditCard}
                  loading={paying}
                  onClick={handlePay}
                >
                  {paying ? 'Memproses...' : `Bayar ${formatIDR(payAmount)}`}
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}
