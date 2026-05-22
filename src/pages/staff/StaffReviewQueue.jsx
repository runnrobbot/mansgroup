import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { loanService, gadaiService, kycService } from '../../services'
import { formatIDR, formatDate, calculateCreditScore } from '../../lib/utils'
import { Eye, CheckCircle, XCircle, ClipboardList, ShieldCheck, Package, ExternalLink, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

function CreditBadge({ score, category }) {
  const map = {
    excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    good:      'bg-blue-50 text-blue-700 border-blue-200',
    fair:      'bg-amber-50 text-amber-700 border-amber-200',
    poor:      'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-600 px-2 py-1 rounded-lg border ${map[category] || map.poor}`}>
      {score} · {category}
    </span>
  )
}

export default function StaffReviewQueue() {
  const { profile } = useAuth()
  const confirm = useConfirm()
  const [tab, setTab] = useState('loans')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ loans: 0, gadai: 0, kyc: 0 })
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Revision state
  const [showRevision, setShowRevision] = useState(false)
  const [revisionAmount, setRevisionAmount] = useState('')
  const [revisionNote, setRevisionNote] = useState('')

  const loadCounts = async () => {
    const [l, g, k] = await Promise.all([
      loanService.listAll({ status: 'pending', limit: 1 }),
      gadaiService.listAll({ status: 'pending', limit: 1 }),
      kycService.listPending(),
    ])
    setCounts({
      loans: l.count || 0,
      gadai: g.count || 0,
      kyc:   k.data?.length || 0,
    })
  }

  const load = async () => {
    setLoading(true)
    if (tab === 'loans') {
      const { data } = await loanService.listAll({ status: 'pending', limit: 50 })
      setItems(data || [])
    } else if (tab === 'gadai') {
      const { data } = await gadaiService.listAll({ status: 'pending', limit: 50 })
      setItems(data || [])
    } else {
      const { data } = await kycService.listPending()
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { load() }, [tab])

  const openDetail = (item) => {
    setSelected(item)
    setNotes('')
    setShowRevision(false)
    setRevisionAmount('')
    setRevisionNote('')
    setModalOpen(true)
  }

  // Action: forward to admin (status → review)
  const handleForward = async () => {
    const ok = await confirm({
      title: 'Teruskan ke Admin?',
      message: `Pengajuan dari ${selected.profiles?.full_name} akan diteruskan ke admin untuk final approval. Dokumen sudah diverifikasi.`,
      variant: 'info',
      confirmLabel: 'Ya, Teruskan',
    })
    if (!ok) return
    setActionLoading(true)
    const fn = tab === 'loans' ? loanService.updateStatus : gadaiService.updateStatus
    const { error } = await fn(selected.id, 'review', notes, profile?.id)
    setActionLoading(false)
    if (!error) {
      toast.success('Pengajuan diteruskan ke admin')
      setModalOpen(false)
      load(); loadCounts()
    } else toast.error('Gagal meneruskan')
  }

  // Action: reject
  const handleReject = async () => {
    if (!notes.trim()) { toast.error('Tambahkan alasan penolakan'); return }
    const ok = await confirm({
      title: 'Tolak Pengajuan?',
      message: `Pengajuan dari ${selected.profiles?.full_name} akan ditolak. Tindakan ini tidak bisa dibatalkan.`,
      variant: 'danger',
      confirmLabel: 'Ya, Tolak',
    })
    if (!ok) return
    setActionLoading(true)
    const fn = tab === 'loans' ? loanService.updateStatus : gadaiService.updateStatus
    const { error } = await fn(selected.id, 'rejected', notes, profile?.id)
    setActionLoading(false)
    if (!error) {
      toast.success('Pengajuan ditolak')
      setModalOpen(false)
      load(); loadCounts()
    } else toast.error('Gagal menolak')
  }

  // Action: revise limit — send to admin with suggested_amount pre-filled
  const handleRevise = async () => {
    const amt = Number(revisionAmount)
    if (!amt || amt <= 0) { toast.error('Masukkan jumlah yang disarankan'); return }
    if (!revisionNote.trim()) { toast.error('Tambahkan catatan revisi'); return }
    const original = selected.amount || selected.loan_amount
    if (amt >= original) { toast.error('Jumlah revisi harus lebih kecil dari pengajuan asli'); return }

    const ok = await confirm({
      title: 'Revisi & Teruskan ke Admin?',
      message: `Pengajuan asli ${formatIDR(original)} akan direvisi menjadi ${formatIDR(amt)}. Admin akan melihat catatan revisi ini dan memutuskan final approval.`,
      variant: 'warning',
      confirmLabel: 'Ya, Revisi & Teruskan',
    })
    if (!ok) return

    setActionLoading(true)

    // Update loan with revision info, status → review (so admin can see it)
    const isLoan = tab === 'loans'
    const { error } = await (isLoan ? loanService : gadaiService).updateFull(selected.id, {
      status: 'review',
      staff_notes: revisionNote,
      revision_note: revisionNote,
      suggested_amount: amt,
      reviewed_by: profile?.id,
      updated_at: new Date().toISOString(),
    })

    setActionLoading(false)
    if (!error) {
      toast.success(`Pengajuan direvisi (${formatIDR(amt)}) dan diteruskan ke admin`)
      setModalOpen(false)
      load(); loadCounts()
    } else toast.error('Gagal merevisi pengajuan')
  }

  const handleKycAction = async (action) => {
    const isApprove = action === 'approve'
    const ok = await confirm({
      title: isApprove ? 'Verifikasi KYC?' : 'Tolak KYC?',
      message: isApprove
        ? `KYC ${selected.profiles?.full_name} akan diverifikasi.`
        : `KYC ${selected.profiles?.full_name} akan ditolak.`,
      variant: isApprove ? 'info' : 'danger',
      confirmLabel: isApprove ? 'Verifikasi' : 'Tolak',
    })
    if (!ok) return
    setActionLoading(true)
    const { error } = await kycService.updateStatus(selected.id, isApprove ? 'verified' : 'rejected', notes)
    setActionLoading(false)
    if (!error) {
      toast.success(isApprove ? 'KYC diverifikasi' : 'KYC ditolak')
      setModalOpen(false)
      load(); loadCounts()
    }
  }

  const isLoan = tab === 'loans'
  const isGadai = tab === 'gadai'

  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Antrian Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">Verifikasi dokumen dan teruskan ke admin, atau revisi limit pengajuan</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {[
            { id: 'loans', label: 'Pinjaman', icon: ClipboardList, count: counts.loans },
            { id: 'gadai', label: 'Gadai', icon: Package, count: counts.gadai },
            { id: 'kyc', label: 'KYC', icon: ShieldCheck, count: counts.kyc },
          ].map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span className="text-xs font-700 bg-blue-500 text-white rounded-full px-1.5 py-0.5 leading-none">{count}</span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>No. Ref</Th>
              <Th>Pemohon</Th>
              <Th>{isLoan ? 'Jumlah' : isGadai ? 'Nilai Gadai' : 'Dokumen'}</Th>
              {isLoan && <Th>Tenor</Th>}
              {isGadai && <Th>Barang</Th>}
              <Th>Tanggal</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={6} message="Tidak ada antrian review" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-700 text-xs font-mono text-blue-700">{item.ref_number || item.id?.slice(0,8)}</span></Td>
                  <Td>
                    <p className="font-600 text-sm text-slate-900">{item.profiles?.full_name || item.full_name || '-'}</p>
                    <p className="text-xs text-slate-400">{item.profiles?.email || ''}</p>
                  </Td>
                  <Td className="font-700">{isLoan || isGadai ? formatIDR(item.amount || item.loan_amount) : `${[item.ktp_photo_url, item.selfie_ktp_url, item.kk_url, item.ktm_url].filter(Boolean).length} file`}</Td>
                  {isLoan && <Td className="text-xs">{item.tenor} bulan</Td>}
                  {isGadai && <Td className="text-xs">{item.item_name || '-'}</Td>}
                  <Td className="text-xs text-slate-400">{formatDate(item.created_at)}</Td>
                  <Td align="center">
                    <button onClick={() => openDetail(item)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
                      <Eye size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Detail / Action Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Review Pengajuan" size="lg">
          {selected && (
            <>
              <ModalBody>
                {/* Header */}
                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-800 text-slate-900 text-base">{selected.profiles?.full_name || selected.full_name}</p>
                      <p className="text-sm text-slate-500">{selected.profiles?.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <StatusBadge status={selected.status} />
                        <span className="text-xs font-mono text-slate-400">{selected.ref_number}</span>
                      </div>
                    </div>
                    {(isLoan || isGadai) && (() => {
                      const { score, category } = calculateCreditScore?.(selected) || { score: 0, category: 'poor' }
                      return <CreditBadge score={score} category={category} />
                    })()}
                  </div>
                </div>

                {/* Loan / Gadai Info */}
                {(isLoan || isGadai) && (
                  <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                    {[
                      { label: 'Jumlah Diajukan', value: <span className="font-800 text-slate-900">{formatIDR(selected.amount || selected.loan_amount)}</span> },
                      isLoan && { label: 'Tenor', value: `${selected.tenor} bulan` },
                      isGadai && { label: 'Barang', value: selected.item_name || '-' },
                      { label: 'Bank', value: `${selected.bank_code || '-'} · ${selected.account_number || '-'}` },
                      { label: 'Pekerjaan', value: selected.occupation || '-' },
                      { label: 'Penghasilan', value: selected.income ? formatIDR(selected.income) : '-' },
                      { label: 'NIK', value: selected.nik || '-' },
                      { label: 'Tanggal Lahir', value: selected.birth_date || '-' },
                    ].filter(Boolean).map(({ label, value }) => (
                      <div key={label} className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                        <p className="font-600 text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* KYC Docs */}
                {(() => {
                  const docs = [
                    { label: 'Foto KTP', url: selected.ktp_photo_url },
                    { label: 'Selfie + KTP', url: selected.selfie_ktp_url },
                    { label: 'Foto Wajah', url: selected.selfie_url },
                    { label: 'Kartu Keluarga', url: selected.kk_url },
                    { label: 'KTM', url: selected.ktm_url },
                    { label: 'Bukti PDDIKTI', url: selected.pddikti_url },
                    isGadai && { label: 'Foto Barang', url: selected.item_photo_url },
                  ].filter(d => d && d.url)
                  if (!docs.length) return null
                  return (
                    <div className="mb-5">
                      <p className="text-xs text-slate-400 mb-2 font-700 uppercase tracking-wider">Dokumen ({docs.length} file)</p>
                      <div className="flex flex-wrap gap-2">
                        {docs.map(({ label, url }) => (
                          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-600 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                            <ExternalLink size={11} />{label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Previous revision note */}
                {selected.revision_note && (
                  <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-xs font-700 text-orange-700 mb-1">Riwayat Revisi Sebelumnya</p>
                    <p className="text-xs text-orange-600">{selected.revision_note}</p>
                    {selected.suggested_amount && (
                      <p className="text-xs text-orange-700 font-700 mt-1">Limit disarankan: {formatIDR(selected.suggested_amount)}</p>
                    )}
                  </div>
                )}

                {/* Staff notes */}
                <div className="mb-4">
                  <label className="label-field">Catatan Staff</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="input-field resize-none" placeholder="Catatan review dokumen..." />
                </div>

                {/* Revision section toggle */}
                {(isLoan || isGadai) && (
                  <div>
                    <button
                      onClick={() => setShowRevision(v => !v)}
                      className="flex items-center gap-2 text-sm font-600 text-amber-700 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 rounded-xl border border-amber-200 transition-colors w-full justify-center">
                      <AlertTriangle size={14} />
                      {showRevision ? 'Sembunyikan Revisi Limit' : 'Revisi Limit Pengajuan (jika tidak cocok)'}
                    </button>

                    {showRevision && (
                      <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                        <p className="text-xs text-amber-700 font-600">
                          Jika jumlah yang diajukan terlalu tinggi, tentukan limit yang lebih sesuai. Pengajuan tetap diteruskan ke admin dengan catatan revisi.
                        </p>
                        <div>
                          <label className="label-field">Jumlah yang Disarankan (Rp)</label>
                          <input type="number" className="input-field" value={revisionAmount}
                            onChange={e => setRevisionAmount(e.target.value)}
                            placeholder={`Maks diajukan: ${formatIDR(selected.amount || selected.loan_amount)}`} />
                        </div>
                        <div>
                          <label className="label-field">Catatan Revisi <span className="text-red-400">*</span></label>
                          <textarea className="input-field resize-none" rows={2} value={revisionNote}
                            onChange={e => setRevisionNote(e.target.value)}
                            placeholder="Contoh: Berdasarkan penghasilan dan histori, limit yang aman adalah 3 juta..." />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Tutup</Button>
                {tab === 'kyc' ? (
                  <>
                    <Button variant="danger" icon={XCircle} loading={actionLoading} onClick={() => handleKycAction('reject')}>Tolak KYC</Button>
                    <Button icon={CheckCircle} loading={actionLoading} onClick={() => handleKycAction('approve')}>Verifikasi KYC</Button>
                  </>
                ) : (
                  <>
                    <Button variant="danger" icon={XCircle} loading={actionLoading} onClick={handleReject}>Tolak</Button>
                    {showRevision ? (
                      <Button variant="warning" icon={AlertTriangle} loading={actionLoading} onClick={handleRevise}
                        className="bg-amber-500 hover:bg-amber-600 text-white">
                        Revisi & Teruskan
                      </Button>
                    ) : (
                      <Button icon={CheckCircle} loading={actionLoading} onClick={handleForward}>Teruskan ke Admin</Button>
                    )}
                  </>
                )}
              </ModalFooter>
            </>
          )}
        </Modal>

        {confirm.modal}
      </div>
    </DashboardLayout>
  )
}
