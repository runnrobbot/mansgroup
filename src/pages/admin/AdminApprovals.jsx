import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../components/ui/ConfirmModal'
import { loanService, gadaiService, notificationService } from '../../services'
import { formatIDR, formatDate, formatDateTime } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, CheckCircle, XCircle, Banknote, CreditCard, Package, ExternalLink, AlertTriangle } from 'lucide-react'
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

  const loadCounts = async () => {
    const [l, g] = await Promise.all([
      loanService.listAll({ status: 'review', limit: 1 }),
      gadaiService.listAll({ status: 'review', limit: 1 }),
    ])
    setCounts({ loans: l.count || 0, gadai: g.count || 0 })
  }

  const load = async () => {
    setLoading(true)
    const svc = tab === 'loans' ? loanService : gadaiService
    const { data } = await svc.listAll({ status: 'review', limit: 50 })
    setItems(data || [])
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
    setDisburseOpen(true)
  }

  const handleApprove = async () => {
    if (!selected) return
    const ok = await confirm({
      title: 'Setujui Pengajuan?',
      message: `Pengajuan dari ${selected.profiles?.full_name} akan disetujui. Langkah berikutnya adalah pencairan dana melalui Midtrans.`,
      variant: 'info',
      confirmLabel: 'Ya, Setujui',
    })
    if (!ok) return
    setActionLoading(true)
    const svc = tab === 'loans' ? loanService : gadaiService
    const { error } = await svc.updateFull(selected.id, {
      status: 'approved',
      admin_notes: notes,
      approved_by: profile?.id,
      approved_at: new Date().toISOString(),
      // If staff revised limit, lock it in
      ...(selected.suggested_amount ? { approved_amount: selected.suggested_amount } : {}),
      updated_at: new Date().toISOString(),
    })
    if (!error && selected.user_id) {
      await notificationService.send({
        userId: selected.user_id,
        type: 'approval',
        title: 'Pengajuan Disetujui ✓',
        message: `Pengajuan ${selected.ref_number} telah disetujui${selected.suggested_amount ? ` dengan limit ${formatIDR(selected.suggested_amount)}` : ''}. Dana akan segera dicairkan.`,
      })
    }
    setActionLoading(false)
    if (!error) {
      toast.success('Pengajuan berhasil disetujui')
      setSelected(null)
      load(); loadCounts()
    } else toast.error('Gagal menyetujui')
  }

  const handleReject = async () => {
    if (!notes.trim()) { toast.error('Tambahkan alasan penolakan'); return }
    const ok = await confirm({
      title: 'Tolak Pengajuan?',
      message: `Pengajuan dari ${selected.profiles?.full_name} akan ditolak secara final.`,
      variant: 'danger',
      confirmLabel: 'Ya, Tolak Final',
    })
    if (!ok) return
    setActionLoading(true)
    const svc = tab === 'loans' ? loanService : gadaiService
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
        title: 'Pengajuan Ditolak',
        message: `Pengajuan ${selected.ref_number} ditolak. ${notes}`,
      })
    }
    setActionLoading(false)
    if (!error) {
      toast.success('Pengajuan ditolak')
      setSelected(null)
      load(); loadCounts()
    } else toast.error('Gagal menolak')
  }

  const handleDisburse = async () => {
    const amt = Number(disburseAmount)
    if (!amt || amt <= 0) { toast.error('Masukkan jumlah pencairan'); return }

    const ok = await confirm({
      title: 'Konfirmasi Pencairan Dana?',
      message: `Dana sebesar ${formatIDR(amt)} akan dicairkan ke rekening ${selected.bank_code} ${selected.account_number} (${selected.account_name}). Pastikan transfer sudah dilakukan sebelum konfirmasi.`,
      variant: 'warning',
      confirmLabel: 'Konfirmasi Pencairan',
    })
    if (!ok) return

    setActionLoading(true)
    const isLoan = tab === 'loans'
    const svc = isLoan ? loanService : gadaiService
    const { error } = await svc.updateFull(selected.id, {
      status: isLoan ? 'disbursed' : 'active',
      disbursed_at: new Date().toISOString(),
      disbursement_ref: disburseRef || null,
      net_disbursement: amt,
      approved_by: profile?.id,
      updated_at: new Date().toISOString(),
    })
    if (!error && selected.user_id) {
      await notificationService.send({
        userId: selected.user_id,
        type: 'disbursement',
        title: 'Dana Dicairkan ✓',
        message: `Dana sebesar ${formatIDR(amt)} telah dicairkan ke rekening ${selected.bank_code} ${selected.account_number} Anda.`,
      })
    }
    setActionLoading(false)
    if (!error) {
      toast.success('Dana berhasil dicairkan!')
      setDisburseOpen(false)
      setSelected(null)
      load(); loadCounts()
    } else toast.error('Gagal mencairkan dana')
  }

  const isLoan = tab === 'loans'

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Final Approval</h1>
          <p className="text-sm text-slate-500 mt-0.5">Setujui pengajuan yang sudah direview staff, lalu cairkan dana</p>
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
                  <Td className="font-700">{formatIDR(item.amount || item.loan_amount)}</Td>
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

        {/* Detail Modal */}
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
                      <p className="text-xs font-700 text-amber-700">Revisi Limit oleh Staff</p>
                    </div>
                    <p className="text-xs text-amber-600">{selected.revision_note || selected.staff_notes}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-500 line-through">{formatIDR(selected.amount || selected.loan_amount)}</span>
                      <span className="text-sm font-800 text-amber-800">→ {formatIDR(selected.suggested_amount)}</span>
                    </div>
                  </div>
                )}

                <div className="mb-5">
                  <InfoRow label={isLoan ? 'Jumlah Diajukan' : 'Nilai Gadai'} value={formatIDR(selected.amount || selected.loan_amount)} />
                  {selected.suggested_amount && <InfoRow label="Limit Disarankan Staff" value={<span className="text-amber-700 font-800">{formatIDR(selected.suggested_amount)}</span>} />}
                  {isLoan && <InfoRow label="Tenor" value={`${selected.tenor} bulan`} />}
                  {isLoan && <InfoRow label="Bunga (5%/bln)" value={formatIDR((selected.amount || 0) * 0.05 * (selected.tenor || 1))} />}
                  <InfoRow label="Dana Bersih" value={<span className="text-emerald-700 font-800">{formatIDR(selected.net_disbursement || selected.amount)}</span>} />
                  <InfoRow label="Rekening Tujuan" value={`${selected.bank_code} · ${selected.account_number} (${selected.account_name || '-'})`} />
                  {!isLoan && <InfoRow label="Nama Barang" value={selected.item_name || '-'} />}
                  <InfoRow label="Tanggal Pengajuan" value={formatDateTime(selected.created_at)} />
                </div>

                {/* Documents */}
                {(() => {
                  const docs = [
                    { label: 'Foto KTP', url: selected.ktp_photo_url },
                    { label: 'Selfie + KTP', url: selected.selfie_ktp_url },
                    { label: 'Foto Wajah', url: selected.selfie_url },
                    { label: 'Kartu Keluarga', url: selected.kk_url },
                    { label: 'KTM', url: selected.ktm_url },
                    { label: 'Bukti PDDIKTI', url: selected.pddikti_url },
                    !isLoan && { label: 'Foto Barang', url: selected.item_photo_url },
                  ].filter(d => d && d.url)
                  if (!docs.length) return null
                  return (
                    <div className="mb-4">
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

        {/* Disburse Modal */}
        <Modal isOpen={disburseOpen} onClose={() => setDisburseOpen(false)} title="Konfirmasi Pencairan Dana" size="sm">
          {selected && (
            <>
              <ModalBody>
                <div className="bg-emerald-50 rounded-xl p-4 mb-5">
                  <p className="text-xs text-emerald-600 mb-1">Penerima</p>
                  <p className="font-800 text-emerald-900">{selected.profiles?.full_name}</p>
                  <p className="text-sm text-emerald-700 mt-1">{selected.bank_code} · {selected.account_number}</p>
                  <p className="text-xs text-emerald-600">{selected.account_name}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label-field">Jumlah yang Dicairkan (Rp) <span className="text-red-400">*</span></label>
                    <input type="number" className="input-field" value={disburseAmount}
                      onChange={e => setDisburseAmount(e.target.value)}
                      placeholder="Masukkan jumlah pencairan" />
                    {selected.suggested_amount && (
                      <p className="text-xs text-amber-600 mt-1">
                        Limit revisi staff: {formatIDR(selected.suggested_amount)}
                      </p>
                    )}
                    {!selected.suggested_amount && selected.net_disbursement && (
                      <p className="text-xs text-slate-400 mt-1">
                        Dana bersih dihitung: {formatIDR(selected.net_disbursement)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="label-field">Nomor Referensi Transfer (opsional)</label>
                    <input className="input-field" value={disburseRef}
                      onChange={e => setDisburseRef(e.target.value)}
                      placeholder="Ref transfer bank / Midtrans disbursement ID" />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs text-amber-700 font-600">
                    ⚠ Pastikan transfer sudah dilakukan ke rekening di atas sebelum menekan tombol konfirmasi. Tindakan ini tidak bisa dibatalkan.
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
