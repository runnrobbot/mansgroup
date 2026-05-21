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
import { Eye, CheckCircle, XCircle, Banknote, CreditCard, Package, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-600 text-slate-900 text-right max-w-48">{value}</span>
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

  const loadCounts = async () => {
    const [l, g] = await Promise.all([
      loanService.listAll({ status: 'review', limit: 1 }),
      gadaiService.listAll({ status: 'review', limit: 1 }),
    ])
    setCounts({ loans: l.count || 0, gadai: g.count || 0 })
  }

  const load = async () => {
    setLoading(true)
    if (tab === 'loans') {
      const { data } = await loanService.listAll({ status: 'review', limit: 50 })
      setItems(data || [])
    } else {
      const { data } = await gadaiService.listAll({ status: 'review', limit: 50 })
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { load() }, [tab])

  const handleAction = async (action) => {
    if (!selected) return

    const isApprove = action === 'approve'
    const isDisburse = action === 'disburse'

    let title, message, variant, confirmLabel
    if (isApprove) {
      title = 'Setujui Pengajuan?'
      message = `Pengajuan dari ${selected.profiles?.full_name} akan disetujui. Notifikasi akan dikirim ke pemohon.`
      variant = 'info'
      confirmLabel = 'Ya, Setujui'
    } else if (isDisburse) {
      title = 'Konfirmasi Pencairan Dana?'
      message = `Dana sebesar ${formatIDR(selected.net_disbursement || selected.amount)} akan dicairkan ke rekening ${selected.profiles?.full_name}. Pastikan dana sudah ditransfer sebelum konfirmasi.`
      variant = 'warning'
      confirmLabel = 'Konfirmasi Pencairan'
    } else {
      title = 'Tolak Pengajuan?'
      message = `Pengajuan dari ${selected.profiles?.full_name} akan ditolak.${notes ? '' : ' Pastikan Anda menambahkan alasan penolakan.'}`
      variant = 'danger'
      confirmLabel = 'Ya, Tolak'
    }

    const ok = await confirm({ title, message, variant, confirmLabel })
    if (!ok) return

    setActionLoading(true)
    let status = isApprove ? 'approved' : isDisburse ? 'disbursed' : 'rejected'
    let error

    if (tab === 'loans') {
      const r = await loanService.updateStatus(selected.id, status, notes, profile?.id)
      error = r.error
    } else {
      const newStatus = isApprove ? 'approved' : isDisburse ? 'active' : 'rejected'
      const r = await gadaiService.updateStatus(selected.id, newStatus, notes, profile?.id)
      error = r.error
    }

    if (!error && selected.user_id) {
      const msgs = {
        approved: { title: 'Pengajuan Disetujui ✓', message: 'Pengajuan Anda telah disetujui. Dana akan segera dicairkan.' },
        disbursed: { title: 'Dana Dicairkan ✓', message: `Dana sebesar ${formatIDR(selected.net_disbursement)} telah dicairkan ke rekening Anda.` },
        rejected: { title: 'Pengajuan Ditolak', message: `Pengajuan Anda ditolak. ${notes || 'Silakan hubungi layanan pelanggan.'}` },
      }
      const msg = msgs[status]
      if (msg) await notificationService.send({ userId: selected.user_id, type: status, ...msg })
    }

    setActionLoading(false)
    if (!error) {
      const successMsgs = { approved: 'Pengajuan berhasil disetujui', disbursed: 'Dana berhasil dicairkan', rejected: 'Pengajuan ditolak' }
      toast.success(successMsgs[status])
      setSelected(null)
      setNotes('')
      load()
      loadCounts()
    } else {
      toast.error('Gagal memproses. Silakan coba lagi.')
    }
  }

  const tabs = [
    { id: 'loans', label: 'Pinjaman', icon: CreditCard, count: counts.loans },
    { id: 'gadai', label: 'Gadai', icon: Package, count: counts.gadai },
  ]

  const isLoan = tab === 'loans'

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Final Approval</h1>
          <p className="text-sm text-slate-500 mt-0.5">Setujui atau tolak pengajuan yang sudah direview staff</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {tabs.map(({ id, label, icon: Icon, count }) => (
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
              <Th>Ref</Th>
              <Th>Pemohon</Th>
              <Th>Jumlah</Th>
              {isLoan && <Th>Tenor</Th>}
              {!isLoan && <Th>Barang</Th>}
              <Th>Bank</Th>
              <Th>Dana Bersih</Th>
              <Th>Tanggal</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={8} message="Tidak ada pengajuan untuk disetujui" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-600 text-xs font-mono">{item.ref_number}</span></Td>
                  <Td>
                    <p className="font-600 text-sm text-slate-900">{item.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-slate-400">{item.profiles?.email}</p>
                  </Td>
                  <Td className="font-700">{formatIDR(item.amount || item.loan_amount)}</Td>
                  {isLoan && <Td className="text-sm">{item.tenor} bln</Td>}
                  {!isLoan && <Td className="text-sm">{item.item_name || '-'}</Td>}
                  <Td className="text-xs">{item.bank_name || '-'}</Td>
                  <Td className="font-600 text-emerald-700">{formatIDR(item.net_disbursement)}</Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.created_at)}</Td>
                  <Td align="center">
                    <button onClick={() => { setSelected(item); setNotes('') }}
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
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Final Approval" size="md">
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

                <div className="mb-5">
                  <InfoRow label={isLoan ? 'Jumlah Pinjaman' : 'Nilai Gadai'} value={formatIDR(selected.amount || selected.loan_amount)} />
                  {isLoan && <InfoRow label="Tenor" value={`${selected.tenor} bulan`} />}
                  {isLoan && <InfoRow label="Total Bunga (5%/bln)" value={formatIDR((selected.amount || 0) * 0.05 * (selected.tenor || 1))} />}
                  <InfoRow label="Platform Fee" value={formatIDR((selected.amount || selected.loan_amount || 0) * (selected.bank_code === 'BCA' || selected.bank_code === 'MANDIRI' ? 0.025 : 0.05))} />
                  <InfoRow label="Dana Bersih Diterima" value={<span className="text-emerald-700 font-800">{formatIDR(selected.net_disbursement)}</span>} />
                  <InfoRow label="Bank Tujuan" value={`${selected.bank_name || '-'} · ${selected.bank_account_number || '-'}`} />
                  {!isLoan && <InfoRow label="Nama Barang" value={selected.item_name || '-'} />}
                  {!isLoan && <InfoRow label="Pickup Address" value={selected.pickup_address || '-'} />}
                  <InfoRow label="Pengajuan" value={formatDateTime(selected.created_at)} />
                </div>

                {/* Document links */}
                {(() => {
                  const docs = [
                    { label: 'Foto KTP', url: selected.ktp_photo_url || selected.ktp_url },
                    { label: 'Selfie + KTP', url: selected.selfie_ktp_url },
                    { label: 'Foto Wajah', url: selected.selfie_url },
                    { label: 'Kartu Keluarga', url: selected.kk_url },
                    { label: 'KTM', url: selected.ktm_url },
                    { label: 'Bukti PDDIKTI', url: selected.pddikti_url },
                    { label: 'Foto Barang', url: selected.item_photo_url || selected.item_photos },
                  ].filter(d => d.url)
                  if (docs.length === 0) return null
                  return (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2 font-600 uppercase tracking-wide">
                        Dokumen ({docs.length} file)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {docs.map(({ label, url }) => (
                          <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-600 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                            <ExternalLink size={11} />
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {selected.staff_notes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs font-700 text-blue-700">Catatan Staff</p>
                    <p className="text-xs text-blue-600 mt-0.5">{selected.staff_notes}</p>
                  </div>
                )}

                <div>
                  <label className="label-field">Catatan Admin</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="input-field resize-none" placeholder="Catatan persetujuan atau alasan penolakan..." />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setSelected(null)}>Tutup</Button>
                <Button variant="danger" icon={XCircle} loading={actionLoading} onClick={() => handleAction('reject')}>Tolak</Button>
                {selected.status === 'review' && (
                  <Button icon={CheckCircle} loading={actionLoading} onClick={() => handleAction('approve')}>Setujui</Button>
                )}
                {selected.status === 'approved' && (
                  <Button icon={Banknote} loading={actionLoading} onClick={() => handleAction('disburse')}
                    className="bg-emerald-600 hover:bg-emerald-700">
                    Cairkan Dana
                  </Button>
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
