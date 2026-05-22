import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { loanService, gadaiService, notificationService, documentService } from '../../services'
import { formatIDR, formatDate, formatDateTime } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, CheckCircle, XCircle, Banknote, CreditCard, Package, ExternalLink, AlertTriangle, Building2, ImagePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-600 text-slate-900 text-right max-w-56">{value}</span>
    </div>
  )
}

export default function AdminApprovals() {
  const { profile } = useAuth()
  const confirm = useConfirm()
  const [tab, setTab] = useState('loans')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({ loans: 0, gadai: 0 })
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Disburse modal
  const [disburseOpen, setDisburseOpen] = useState(false)
  const [disburseAmount, setDisburseAmount] = useState('')
  const [disburseRef, setDisburseRef] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [proofFile, setProofFile] = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [proofUploading, setProofUploading] = useState(false)

  const isLoan = tab === 'loans'

  const loadCounts = async () => {
    const [lr, la, gr, ga] = await Promise.all([
      loanService.listAll({ status: 'review', limit: 1 }),
      loanService.listAll({ status: 'approved', limit: 1 }),
      gadaiService.listAll({ status: 'review', limit: 1 }),
      gadaiService.listAll({ status: 'approved', limit: 1 }),
    ])
    setCounts({
      loans: (lr.count || 0) + (la.count || 0),
      gadai: (gr.count || 0) + (ga.count || 0),
    })
  }

  const load = async () => {
    setLoading(true)
    const svc = isLoan ? loanService : gadaiService
    // Fetch both review (pending approval) and approved (pending disbursement)
    const [reviewRes, approvedRes] = await Promise.all([
      svc.listAll({ status: 'review', limit: 50 }),
      svc.listAll({ status: 'approved', limit: 50 }),
    ])
    const combined = [
      ...(reviewRes.data || []),
      ...(approvedRes.data || []),
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    setItems(combined)
    setLoading(false)
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { load() }, [tab])

  const openDetail = (item) => {
    setSelected(item)
    setNotes('')
  }

  const openDisburse = () => {
    const suggested = selected.suggested_amount || selected.net_disbursement || selected.amount || selected.loan_amount
    setDisburseAmount(String(suggested || ''))
    setDisburseRef('')
    setProofUrl('')
    setProofFile(null)
    setProofPreview(null)
    setDisburseOpen(true)
  }

  const handleProofFile = useCallback((file) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Format tidak didukung. Gunakan JPG, PNG, atau WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran maksimal 5MB.')
      return
    }
    setProofFile(file)
    const reader = new FileReader()
    reader.onload = e => setProofPreview(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Setujui Pengajuan?',
      message: `Pengajuan dari ${selected.profiles?.full_name} akan disetujui. Langkah berikutnya adalah pencairan dana secara manual ke rekening nasabah.`,
      variant: 'info',
      confirmLabel: 'Ya, Setujui',
    })
    if (!ok) return
    setActionLoading(true)

    // Build update payload — approved_at only exists on loans table, not gadai_applications
    const baseUpdate = {
      status: 'approved',
      admin_notes: notes || null,
      approved_by: profile?.id,
      updated_at: new Date().toISOString(),
      ...(selected.suggested_amount ? { approved_amount: selected.suggested_amount } : {}),
    }
    if (isLoan) {
      baseUpdate.approved_at = new Date().toISOString()
    }

    const svc = isLoan ? loanService : gadaiService
    const { error } = await svc.updateFull(selected.id, baseUpdate)

    if (!error && selected.user_id) {
      await notificationService.send({
        userId: selected.user_id,
        type: 'approval',
        title: 'Pengajuan Disetujui ✓',
        message: `Pengajuan ${selected.ref_number} telah disetujui${selected.suggested_amount ? ` dengan nilai ${formatIDR(selected.suggested_amount)}` : ''}. Tim kami akan segera memproses pencairan.`,
      })
    }

    setActionLoading(false)
    if (!error) {
      toast.success('Pengajuan berhasil disetujui')
      setSelected(null)
      load(); loadCounts()
    } else {
      console.error(error)
      toast.error('Gagal menyetujui: ' + (error.message || 'Terjadi kesalahan sistem'))
    }
  }

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!notes.trim()) { toast.error('Tambahkan alasan penolakan sebelum melanjutkan'); return }
    const ok = await confirm({
      title: 'Tolak Pengajuan?',
      message: `Pengajuan dari ${selected.profiles?.full_name} akan ditolak secara final. Nasabah akan mendapatkan notifikasi.`,
      variant: 'danger',
      confirmLabel: 'Ya, Tolak Final',
    })
    if (!ok) return
    setActionLoading(true)
    const svc = isLoan ? loanService : gadaiService
    const { error } = await svc.updateFull(selected.id, {
      status: 'rejected',
      admin_notes: notes,
      approved_by: profile?.id,
      updated_at: new Date().toISOString(),
    })
    if (!error && selected.user_id) {
      await notificationService.send({
        userId: selected.user_id,
        type: 'rejection',
        title: 'Pengajuan Tidak Disetujui',
        message: `Pengajuan ${selected.ref_number} tidak dapat disetujui. Alasan: ${notes}`,
      })
    }
    setActionLoading(false)
    if (!error) {
      toast.success('Pengajuan telah ditolak')
      setSelected(null)
      load(); loadCounts()
    } else {
      console.error(error)
      toast.error('Gagal menolak: ' + (error.message || 'Terjadi kesalahan sistem'))
    }
  }

  // ── Manual Disburse (admin transfers manually to nasabah's bank) ──────────
  const handleDisburse = async () => {
    const amt = Number(disburseAmount)
    if (!amt || amt <= 0) { toast.error('Masukkan jumlah pencairan yang valid'); return }
    if (!disburseRef.trim()) { toast.error('Masukkan nomor referensi transfer sebagai bukti pencairan'); return }

    const ok = await confirm({
      title: 'Konfirmasi Pencairan Dana?',
      message: `Dana sebesar ${formatIDR(amt)} akan dicatat sebagai telah dicairkan ke rekening ${selected.bank_code} ${selected.account_number} (${selected.account_name || '-'}). Pastikan transfer bank sudah benar-benar dilakukan sebelum konfirmasi.`,
      variant: 'warning',
      confirmLabel: 'Konfirmasi Pencairan',
    })
    if (!ok) return

    setActionLoading(true)

    // Upload proof of transfer if provided
    // Path: disbursements/{admin_uid}/{application_id}/... — satisfies RLS: position[2] = auth.uid()
    let finalProofUrl = proofUrl || null
    if (proofFile) {
      setProofUploading(true)
      const uploadPath = `disbursements/${profile.id}/${selected.id}/${Date.now()}-${proofFile.name.replace(/\s+/g, '_')}`
      const { url, error: uploadErr } = await documentService.upload(proofFile, 'documents', uploadPath)
      setProofUploading(false)
      if (uploadErr) {
        toast.error('Gagal mengupload bukti transfer. Periksa koneksi dan coba lagi.')
        setActionLoading(false)
        return
      }
      finalProofUrl = url
    }

    const svc = isLoan ? loanService : gadaiService

    // For gadai: status → waiting_pickup (barang dijemput dulu setelah dana cair)
    // For loans: status → disbursed
    const newStatus = isLoan ? 'disbursed' : 'waiting_pickup'

    const { error } = await svc.updateFull(selected.id, {
      status: newStatus,
      disbursed_at: new Date().toISOString(),
      disbursement_ref: disburseRef.trim() || null,
      net_disbursement: amt,
      approved_by: profile?.id,
      updated_at: new Date().toISOString(),
    })

    if (!error && selected.user_id) {
      const msg = isLoan
        ? `Dana sebesar ${formatIDR(amt)} telah ditransfer ke rekening ${selected.bank_code} ${selected.account_number} Anda. Ref: ${disburseRef.trim()}`
        : `Dana sebesar ${formatIDR(amt)} telah ditransfer ke rekening Anda. Tim kami akan segera menjemput barang gadai Anda. Ref: ${disburseRef.trim()}`

      await notificationService.send({
        userId: selected.user_id,
        type: 'disbursement',
        title: 'Dana Telah Dicairkan ✓',
        message: msg,
      })
    }

    setActionLoading(false)
    if (!error) {
      toast.success(isLoan ? 'Dana berhasil dicairkan' : 'Dana dicairkan — status beralih ke Menunggu Penjemputan')
      setDisburseOpen(false)
      setSelected(null)
      load(); loadCounts()
    } else {
      console.error(error)
      toast.error('Gagal mencairkan dana: ' + (error.message || 'Terjadi kesalahan sistem'))
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Final Approval</h1>
          <p className="text-sm text-slate-500 mt-0.5">Setujui pengajuan yang telah direview staff, lalu cairkan dana secara manual</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {[
            { id: 'loans', label: 'Pinjaman', icon: CreditCard, count: counts.loans },
            { id: 'gadai', label: 'Gadai', icon: Package, count: counts.gadai },
          ].map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span className={`text-xs font-700 px-1.5 py-0.5 rounded-full leading-none ${
                  tab === id ? 'bg-violet-500 text-white' : 'bg-slate-300 text-slate-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>No. Ref</Th>
              <Th>Pemohon</Th>
              <Th>Diajukan</Th>
              <Th>Revisi Staff</Th>
              {isLoan && <Th>Tenor</Th>}
              {!isLoan && <Th>Barang</Th>}
              <Th>Status</Th>
              <Th>Tanggal</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={9} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={9} message="Tidak ada pengajuan untuk disetujui" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-700 text-xs font-mono text-violet-700">{item.ref_number}</span></Td>
                  <Td>
                    <p className="font-600 text-sm text-slate-900">{item.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-slate-400">{item.profiles?.email}</p>
                  </Td>
                  <Td className="font-700">{formatIDR(isLoan ? item.amount : item.loan_amount)}</Td>
                  <Td>
                    {item.suggested_amount ? (
                      <span className="text-xs font-700 text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                        → {formatIDR(item.suggested_amount)}
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </Td>
                  {isLoan && <Td className="text-sm">{item.tenor} bln</Td>}
                  {!isLoan && <Td className="text-sm">{item.item_name || '-'}</Td>}
                  <Td><StatusBadge status={item.status} /></Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.created_at)}</Td>
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

        {/* ── Detail Modal ── */}
        <Modal isOpen={!!selected && !disburseOpen} onClose={() => setSelected(null)} title="Final Approval" size="md">
          {selected && (
            <>
              <ModalBody>
                <div className="bg-slate-50 rounded-xl p-4 mb-5">
                  <p className="text-base font-800 text-slate-900">{selected.profiles?.full_name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{selected.profiles?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={selected.status} />
                    <span className="text-xs font-mono text-slate-400">{selected.ref_number}</span>
                  </div>
                </div>

                {/* Revision warning */}
                {selected.suggested_amount && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-amber-600" />
                      <p className="text-xs font-700 text-amber-700">Revisi Nilai oleh Staff</p>
                    </div>
                    <p className="text-xs text-amber-600">{selected.revision_note || selected.staff_notes}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500 line-through">{formatIDR(isLoan ? selected.amount : selected.loan_amount)}</span>
                      <span className="text-sm font-800 text-amber-800">→ {formatIDR(selected.suggested_amount)}</span>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <InfoRow label={isLoan ? 'Jumlah Diajukan' : 'Nilai Gadai'} value={formatIDR(isLoan ? selected.amount : selected.loan_amount)} />
                  {selected.suggested_amount && <InfoRow label="Nilai Disetujui Staff" value={<span className="text-amber-700 font-800">{formatIDR(selected.suggested_amount)}</span>} />}
                  {isLoan && <InfoRow label="Tenor" value={`${selected.tenor} bulan`} />}
                  {isLoan && <InfoRow label="Bunga (5%/bln)" value={formatIDR((selected.amount || 0) * 0.05 * (selected.tenor || 1))} />}
                  <InfoRow label="Dana Bersih" value={<span className="text-emerald-700 font-800">{formatIDR(selected.net_disbursement || (isLoan ? selected.amount : selected.loan_amount))}</span>} />
                  <InfoRow label="Rekening Tujuan" value={`${selected.bank_code} · ${selected.account_number} (${selected.account_name || '-'})`} />
                  {!isLoan && <InfoRow label="Nama Barang" value={selected.item_name || '-'} />}
                  {!isLoan && <InfoRow label="Alamat Penjemputan" value={selected.pickup_address || '-'} />}
                  <InfoRow label="Tanggal Pengajuan" value={formatDateTime(selected.created_at)} />
                </div>

                {/* Documents */}
                {(() => {
                  const docs = !isLoan
                    ? [{ label: 'Foto Barang', url: selected.item_photo_url }]
                    : [
                        { label: 'Foto KTP', url: selected.ktp_photo_url },
                        { label: 'Selfie + KTP', url: selected.selfie_ktp_url },
                        { label: 'Foto Wajah', url: selected.selfie_url },
                        { label: 'Kartu Keluarga', url: selected.kk_url },
                        { label: 'KTM', url: selected.ktm_url },
                        { label: 'Bukti PDDIKTI', url: selected.pddikti_url },
                      ]
                  const filtered = docs.filter(d => d && d.url)
                  if (!filtered.length) return null
                  return (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2 font-700 uppercase tracking-wider">Dokumen ({filtered.length} file)</p>
                      <div className="flex flex-wrap gap-2">
                        {filtered.map(({ label, url }) => (
                          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-600 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                            <ExternalLink size={11} />{label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {selected.staff_notes && !selected.suggested_amount && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-700 text-blue-700">Catatan Staff</p>
                    <p className="text-xs text-blue-600 mt-0.5">{selected.staff_notes}</p>
                  </div>
                )}

                <div>
                  <label className="label-field">Catatan Admin</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="input-field resize-none" placeholder="Catatan persetujuan atau alasan penolakan..." />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setSelected(null)}>Tutup</Button>
                <Button variant="danger" icon={XCircle} loading={actionLoading} onClick={handleReject}>Tolak</Button>
                {selected.status === 'review' && (
                  <Button icon={CheckCircle} loading={actionLoading} onClick={handleApprove}>Setujui</Button>
                )}
                {selected.status === 'approved' && (
                  <Button icon={Banknote} loading={actionLoading} onClick={openDisburse}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Cairkan Dana
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </Modal>

        {/* ── Manual Disburse Modal ── */}
        <Modal isOpen={disburseOpen} onClose={() => setDisburseOpen(false)} title="Konfirmasi Pencairan Dana Manual" size="sm">
          {selected && (
            <>
              <ModalBody>
                {/* Bank info banner */}
                <div className="flex items-start gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 mb-5">
                  <Building2 size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-600 font-600 mb-0.5">Transfer ke Rekening Nasabah</p>
                    <p className="font-800 text-emerald-900 text-sm">{selected.profiles?.full_name}</p>
                    <p className="text-sm text-emerald-700 mt-0.5">{selected.bank_code} · {selected.account_number}</p>
                    <p className="text-xs text-emerald-600">{selected.account_name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="label-field">Jumlah yang Dicairkan (Rp) <span className="text-red-400">*</span></label>
                    <input type="number" className="input-field" value={disburseAmount}
                      onChange={e => setDisburseAmount(e.target.value)}
                      placeholder="Masukkan jumlah pencairan" />
                    {selected.suggested_amount && (
                      <p className="text-xs text-amber-600 mt-1">
                        Nilai disetujui staff: {formatIDR(selected.suggested_amount)}
                      </p>
                    )}
                    {!selected.suggested_amount && selected.net_disbursement && (
                      <p className="text-xs text-slate-400 mt-1">
                        Dana bersih nasabah: {formatIDR(selected.net_disbursement)}
                      </p>
                    )}
                  </div>

                  {/* Ref number */}
                  <div>
                    <label className="label-field">Nomor Referensi Transfer <span className="text-red-400">*</span></label>
                    <input className="input-field" value={disburseRef}
                      onChange={e => setDisburseRef(e.target.value)}
                      placeholder="Cth: TRF20260522-XXXXXX" />
                    <p className="text-xs text-slate-400 mt-1">Nomor bukti transfer dari sistem perbankan Anda</p>
                  </div>

                  {/* Proof of transfer image */}
                  <div>
                    <label className="label-field">Bukti Transfer (Screenshot) <span className="text-slate-400 font-400">— opsional</span></label>
                    {proofPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-emerald-200">
                        <img src={proofPreview} alt="Bukti transfer" className="w-full max-h-44 object-cover" />
                        <button type="button"
                          onClick={() => { setProofFile(null); setProofPreview(null) }}
                          className="absolute top-2 right-2 w-6 h-6 bg-slate-900/70 rounded-full flex items-center justify-center text-white hover:bg-slate-900 transition-colors">
                          <X size={12} />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full">
                          Siap diupload
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="proof-upload"
                        className="flex flex-col items-center gap-2 p-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                        <ImagePlus size={20} className="text-slate-400" />
                        <p className="text-xs text-slate-500 text-center">
                          Upload screenshot bukti transfer<br />
                          <span className="text-slate-400">JPG, PNG, WebP · Maks 5MB</span>
                        </p>
                        <input id="proof-upload" type="file" className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={e => handleProofFile(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 font-600">
                    ⚠ Pastikan transfer bank sudah berhasil dilakukan sebelum mengkonfirmasi. Tindakan ini tidak dapat dibatalkan dan akan langsung memberi tahu nasabah.
                    {!isLoan && ' Status gadai akan berubah menjadi "Menunggu Penjemputan".'}
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setDisburseOpen(false)}>Batal</Button>
                <Button icon={Banknote} loading={actionLoading} onClick={handleDisburse}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Konfirmasi Pencairan
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
