import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { ConfirmModal, useConfirm } from '../../components/ui/ConfirmModal'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { loanService, gadaiService, kycService } from '../../services'
import { formatIDR, formatDate, formatDateTime, calculateCreditScore } from '../../lib/utils'
import { Eye, CheckCircle, XCircle, ClipboardList, ShieldCheck, Package, ExternalLink, Info } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

function CreditBadge({ score, category }) {
  const map = {
    excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    good: 'bg-blue-50 text-blue-700 border-blue-200',
    fair: 'bg-amber-50 text-amber-700 border-amber-200',
    poor: 'bg-red-50 text-red-700 border-red-200',
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

  const loadCounts = async () => {
    const [l, g, k] = await Promise.all([
      loanService.listAll({ status: 'pending', limit: 1 }),
      gadaiService.listAll({ status: 'pending', limit: 1 }),
      kycService.listPending(),
    ])
    setCounts({
      loans: l.count || l.data?.length || 0,
      gadai: g.count || g.data?.length || 0,
      kyc: k.data?.length || 0,
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

  const handleAction = async (action) => {
    if (!selected) return

    const label = action === 'approve' ? 'teruskan ke admin' : 'tolak'
    const ok = await confirm({
      title: action === 'approve' ? 'Teruskan ke Admin?' : 'Tolak Pengajuan?',
      message: action === 'approve'
        ? `Pengajuan dari ${selected.profiles?.full_name} akan diteruskan ke admin untuk final approval.`
        : `Pengajuan dari ${selected.profiles?.full_name} akan ditolak. Tindakan ini tidak bisa dibatalkan.`,
      variant: action === 'approve' ? 'info' : 'danger',
      confirmLabel: action === 'approve' ? 'Ya, Teruskan' : 'Ya, Tolak',
    })
    if (!ok) return

    setActionLoading(true)
    const newStatus = action === 'approve' ? 'review' : 'rejected'

    let error
    if (tab === 'loans') {
      const r = await loanService.updateStatus(selected.id, newStatus, notes, profile?.id)
      error = r.error
    } else if (tab === 'gadai') {
      const r = await gadaiService.updateStatus(selected.id, newStatus, notes, profile?.id)
      error = r.error
    } else {
      const r = await kycService.updateStatus(selected.id, newStatus === 'review' ? 'verified' : 'rejected', notes)
      error = r.error
    }

    setActionLoading(false)
    if (!error) {
      toast.success(action === 'approve' ? 'Pengajuan diteruskan ke admin' : 'Pengajuan ditolak')
      setModalOpen(false)
      setSelected(null)
      setNotes('')
      load()
      loadCounts()
    } else {
      toast.error('Gagal memproses. Silakan coba lagi.')
    }
  }

  const openDetail = (item) => {
    setSelected(item)
    setNotes('')
    setModalOpen(true)
  }

  const creditScore = selected ? calculateCreditScore({
    income: selected.monthly_income || 0,
    loanAmount: selected.amount || selected.loan_amount || 0,
    repaymentHistory: 'good',
    hasOverdue: false,
    loanCount: 1,
  }) : null

  const tabs = [
    { id: 'loans', label: 'Pinjaman', icon: ClipboardList, count: counts.loans },
    { id: 'gadai', label: 'Gadai', icon: Package, count: counts.gadai },
    { id: 'kyc', label: 'KYC', icon: ShieldCheck, count: counts.kyc },
  ]

  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Antrian Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">Verifikasi dokumen dan teruskan pengajuan ke admin</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-fit">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              {label}
              {count > 0 && (
                <span className={`text-xs font-700 px-1.5 py-0.5 rounded-full leading-none ${
                  tab === id ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>Ref. / ID</Th>
              <Th>Pemohon</Th>
              <Th>{tab === 'kyc' ? 'NIK' : 'Jumlah'}</Th>
              {tab !== 'kyc' && <Th>Tenor</Th>}
              <Th>Tanggal</Th>
              <Th>Status</Th>
              <Th align="center">Aksi</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={7} message="Tidak ada antrian review" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-600 text-xs font-mono">{item.ref_number || item.id?.slice(0, 8).toUpperCase()}</span></Td>
                  <Td>
                    <div>
                      <p className="font-600 text-slate-900 text-sm">{item.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{item.profiles?.email || item.email}</p>
                    </div>
                  </Td>
                  <Td className="font-600">
                    {tab === 'kyc' ? (item.nik || '-') : formatIDR(item.amount || item.loan_amount)}
                  </Td>
                  {tab !== 'kyc' && <Td className="text-sm">{item.tenor ? `${item.tenor} bln` : '-'}</Td>}
                  <Td className="text-xs text-slate-500">{formatDate(item.created_at || item.submitted_at)}</Td>
                  <Td><StatusBadge status={item.status} /></Td>
                  <Td align="center">
                    <button
                      onClick={() => openDetail(item)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 mx-auto transition-colors"
                    >
                      <Eye size={15} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Detail Modal */}
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Detail Pengajuan" size="lg">
          {selected && (
            <>
              <ModalBody>
                {/* Header info */}
                <div className="flex items-start justify-between mb-5 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-base font-700 text-slate-900">{selected.profiles?.full_name || selected.full_name || '-'}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.profiles?.email || '-'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={selected.status} />
                    {creditScore && tab !== 'kyc' && <CreditBadge score={creditScore.score} category={creditScore.category} />}
                  </div>
                </div>

                {/* Data grid */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                  {[
                    { label: 'Ref. Nomor', value: selected.ref_number || '-' },
                    { label: 'Tanggal Pengajuan', value: formatDateTime(selected.created_at || selected.submitted_at) },
                    ...(tab !== 'kyc' ? [
                      { label: 'Jumlah Pinjaman', value: formatIDR(selected.amount || selected.loan_amount) },
                      { label: 'Tenor', value: selected.tenor ? `${selected.tenor} bulan` : '-' },
                      { label: 'Pekerjaan', value: selected.occupation || '-' },
                      { label: 'Penghasilan', value: formatIDR(selected.monthly_income) },
                    ] : [
                      { label: 'NIK', value: selected.nik || '-' },
                      { label: 'Tempat Lahir', value: selected.birth_place || '-' },
                    ]),
                    ...(tab === 'gadai' ? [
                      { label: 'Nama Barang', value: selected.item_name || '-' },
                      { label: 'Kategori', value: selected.item_category || '-' },
                      { label: 'Jadwal Pickup', value: selected.pickup_schedule ? formatDateTime(selected.pickup_schedule) : '-' },
                    ] : []),
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm font-600 text-slate-900">{value}</p>
                    </div>
                  ))}
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
                            className="flex items-center gap-1.5 text-xs font-600 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-100 transition-colors">
                            <ExternalLink size={11} />
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Notes by previous staff */}
                {selected.staff_notes && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-700 text-amber-700">Catatan Sebelumnya</p>
                        <p className="text-xs text-amber-600 mt-0.5">{selected.staff_notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff note input */}
                <div>
                  <label className="label-field">Catatan Staff <span className="text-slate-400 font-400">(opsional)</span></label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Tambahkan catatan verifikasi..."
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Tutup</Button>
                <Button
                  variant="danger"
                  icon={XCircle}
                  loading={actionLoading}
                  onClick={() => handleAction('reject')}
                >
                  Tolak
                </Button>
                <Button
                  icon={CheckCircle}
                  loading={actionLoading}
                  onClick={() => handleAction('approve')}
                >
                  Teruskan ke Admin
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
