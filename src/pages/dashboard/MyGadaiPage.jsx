import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService } from '../../services'
import { formatIDR, formatDate, formatDateTime, calculateGadaiSimulation, getEffectiveAmount, isRevised } from '../../lib/utils'
import { Plus, Eye, RefreshCw, AlertTriangle, Calendar, Package, Lock, Clock, ArrowRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_INFO = {
  pending:         { label: 'Menunggu Review',       color: 'bg-slate-100 text-slate-600' },
  review:          { label: 'Direview Staff',         color: 'bg-blue-50 text-blue-700' },
  waiting_pickup:  { label: 'Menunggu Penjemputan',   color: 'bg-amber-50 text-amber-700' },
  picked_up:       { label: 'Barang Dijemput',        color: 'bg-violet-50 text-violet-700' },
  received:        { label: 'Diterima Warehouse',     color: 'bg-blue-50 text-blue-700' },
  active:          { label: 'Aktif Digadai',          color: 'bg-emerald-50 text-emerald-700' },
  due:             { label: 'Jatuh Tempo',            color: 'bg-amber-50 text-amber-700' },
  extended:        { label: 'Diperpanjang',           color: 'bg-teal-50 text-teal-700' },
  overdue:         { label: 'Telat Bayar',            color: 'bg-red-50 text-red-700' },
  completed:       { label: 'Lunas',                  color: 'bg-emerald-100 text-emerald-800' },
  forfeited:       { label: 'Disita',                 color: 'bg-red-100 text-red-800' },
  rejected:        { label: 'Ditolak',                color: 'bg-red-50 text-red-700' },
}

export default function MyGadaiPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const load = async () => {
    if (!profile) return
    const { data } = await gadaiService.getByUserId(profile.id)
    setGadais(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profile])

  // ── Status logic ──────────────────────────────────────────────────────────
  const isProfileComplete = !!(
    profile?.full_name && profile?.nik && profile?.phone &&
    profile?.birth_date && profile?.address && profile?.occupation && profile?.income
  )
  const isKycVerified = profile?.kyc_status === 'verified'

  // All non-terminal gadai (active, in-progress, pending, approved) count toward the 3-gadai cap
  const GADAI_MAX = 3
  const activeGadaiStatuses = ['active', 'due', 'extended', 'overdue', 'waiting_pickup', 'picked_up', 'received']
  const pendingGadaiStatuses = ['pending', 'review', 'revision', 'approved']

  const activeGadais = gadais.filter(g => activeGadaiStatuses.includes(g.status))
  const pendingGadais = gadais.filter(g => pendingGadaiStatuses.includes(g.status))
  const inFlightCount = activeGadais.length + pendingGadais.length // total yang belum selesai

  // Kept for convenience (used in extension logic)
  const activeGadai = activeGadais[0] || null
  const pendingGadai = pendingGadais[0] || null

  const handleExtend = async (gadai) => {
    const sim = calculateGadaiSimulation(gadai.loan_amount || 0)
    const ok = await confirm({
      title: 'Perpanjang Gadai?',
      message: `Masa gadai akan diperpanjang 1 bulan dengan biaya perpanjangan ${formatIDR(sim.extensionFee)} (10% dari nilai pinjaman).`,
      variant: 'warning',
      confirmLabel: 'Ya, Perpanjang',
    })
    if (!ok) return
    setActionLoading(true)
    const { error } = await gadaiService.updateStatus(gadai.id, 'extended', 'Perpanjangan oleh user')
    if (!error) { toast.success('Gadai berhasil diperpanjang'); load() }
    else toast.error('Gagal memperpanjang gadai')
    setActionLoading(false)
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
    // Sudah mencapai batas maksimal 3 gadai aktif/pending
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
    // Cap reached
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
        <div className={`flex items-start gap-3 p-4 rounded-2xl ${
          isApproved ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
        }`}>
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
            className={`ml-auto text-xs font-600 flex items-center gap-1 whitespace-nowrap ${
              isApproved ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            Lihat <ArrowRight size={12} />
          </button>
        </div>
      )
    }
    // Overdue warning (independent)
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
                        <button
                          onClick={() => { setSelected(g); setDetailOpen(true) }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                        >
                          <Eye size={13} />
                        </button>
                        {['active', 'due', 'overdue'].includes(g.status) && (
                          <button
                            onClick={() => handleExtend(g)}
                            disabled={actionLoading}
                            className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-amber-600 transition-colors disabled:opacity-50"
                          >
                            <RefreshCw size={13} />
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
          {selected && (
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

                {/* Banner revisi — muncul kalau staff sudah usulkan revisi atau admin sudah set approved_amount berbeda dari original */}
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
                    { label: 'Ref. Nomor',        value: selected.ref_number || '-' },
                    { label: 'Nilai Diajukan',    value: formatIDR(selected.loan_amount) },
                    { label: 'Nilai Disetujui',   value: <span className={isRevised(selected, false) ? 'text-amber-700 font-800' : ''}>{formatIDR(getEffectiveAmount(selected, false))}</span> },
                    { label: 'Jatuh Tempo',       value: selected.due_date ? formatDate(selected.due_date) : '-' },
                    { label: 'Jadwal Pickup',     value: selected.pickup_schedule ? formatDateTime(selected.pickup_schedule) : '-' },
                    { label: 'Tanggal Pengajuan', value: formatDateTime(selected.created_at) },
                    { label: 'Biaya Perpanjangan', value: formatIDR(getEffectiveAmount(selected, false) * 0.1) },
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
                {['active', 'due', 'overdue'].includes(selected.status) && (
                  <Button icon={RefreshCw} className="w-full" loading={actionLoading}
                    onClick={() => { setDetailOpen(false); handleExtend(selected) }}>
                    Perpanjang Gadai (+{formatIDR(getEffectiveAmount(selected, false) * 0.1)})
                  </Button>
                )}
              </div>
            </ModalBody>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}