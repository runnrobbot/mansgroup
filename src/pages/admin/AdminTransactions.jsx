import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { loanService, gadaiService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { CreditCard, Package, ArrowDownCircle, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pending:   'bg-slate-100 text-slate-600',
  review:    'bg-blue-50 text-blue-700',
  approved:  'bg-violet-50 text-violet-700',
  disbursed: 'bg-emerald-50 text-emerald-700',
  active:    'bg-emerald-50 text-emerald-700',
  overdue:   'bg-red-50 text-red-700',
  completed: 'bg-slate-100 text-slate-500',
  rejected:  'bg-red-50 text-red-600',
  forfeited: 'bg-orange-50 text-orange-700',
}

const STATUS_LABELS = {
  pending: 'Pending', review: 'Review', approved: 'Disetujui',
  disbursed: 'Dicairkan', active: 'Aktif', overdue: 'Overdue',
  completed: 'Selesai', rejected: 'Ditolak', forfeited: 'Disita',
}

export default function AdminTransactions() {
  const [tab, setTab] = useState('loans')
  const [loans, setLoans] = useState([])
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)
  const [loanCount, setLoanCount] = useState(0)
  const [gadaiCount, setGadaiCount] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')

  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    if (tab === 'loans') {
      const res = await loanService.listAll({ page, limit: LIMIT, status: filter })
      setLoans(res.data || [])
      setLoanCount(res.count || 0)
    } else {
      const res = await gadaiService.listAll({ page, limit: LIMIT, status: filter })
      setGadais(res.data || [])
      setGadaiCount(res.count || 0)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab, page, filter])

  const loanStatuses = ['', 'pending', 'review', 'approved', 'disbursed', 'overdue', 'completed', 'rejected']
  const gadaiStatuses = ['', 'pending', 'waiting_pickup', 'picked_up', 'received', 'active', 'overdue', 'completed', 'forfeited', 'rejected']

  const statuses = tab === 'loans' ? loanStatuses : gadaiStatuses
  const items = tab === 'loans' ? loans : gadais
  const total = tab === 'loans' ? loanCount : gadaiCount

  const totalDisbursed = loans.filter(l => l.status === 'disbursed').reduce((s, l) => s + (l.amount || 0), 0)
  const totalActive = loans.filter(l => l.status === 'disbursed').length

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Transaksi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Riwayat seluruh pinjaman dan gadai di platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={14} className="text-emerald-600" />
              <p className="text-xs text-slate-400">Total Pinjaman</p>
            </div>
            <p className="text-2xl font-800 text-slate-900">{loanCount}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-violet-600" />
              <p className="text-xs text-slate-400">Total Gadai</p>
            </div>
            <p className="text-2xl font-800 text-slate-900">{gadaiCount}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle size={14} className="text-blue-600" />
              <p className="text-xs text-slate-400">Pinjaman Aktif</p>
            </div>
            <p className="text-2xl font-800 text-blue-700">{totalActive}</p>
          </div>
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={14} className="text-emerald-600" />
              <p className="text-xs text-slate-400">Total Disalurkan</p>
            </div>
            <p className="text-lg font-800 text-emerald-700">{formatIDR(totalDisbursed)}</p>
          </div>
        </div>

        {/* Tabs + Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl">
            {[
              { value: 'loans', label: 'Pinjaman', icon: CreditCard },
              { value: 'gadai', label: 'Gadai', icon: Package },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => { setTab(value); setPage(1); setFilter('') }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-600 transition-all ${
                  tab === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <select className="input-field !w-auto !py-2 text-sm"
            value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }}>
            <option value="">Semua Status</option>
            {statuses.filter(s => s).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
            ))}
          </select>
          <span className="text-xs text-slate-400 ml-auto">{total} data</span>
        </div>

        <Card>
          <Table>
            <TableHead>
              <Th>No. Ref</Th>
              <Th>Pemohon</Th>
              <Th>{tab === 'loans' ? 'Jumlah Pinjaman' : 'Nilai Gadai'}</Th>
              {tab === 'loans' && <Th>Tenor</Th>}
              <Th>Status</Th>
              <Th>Tanggal</Th>
              {tab === 'loans' && <Th>Cair</Th>}
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={7} message="Tidak ada transaksi" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-700 text-xs font-mono text-emerald-700">{item.ref_number || '-'}</span></Td>
                  <Td>
                    <p className="font-600 text-sm text-slate-900">{item.profiles?.full_name || '-'}</p>
                    <p className="text-xs text-slate-400">{item.profiles?.email || ''}</p>
                  </Td>
                  <Td className="font-700">{formatIDR(item.amount || item.loan_amount || 0)}</Td>
                  {tab === 'loans' && <Td className="text-xs">{item.tenor} bulan</Td>}
                  <Td>
                    <span className={`text-xs font-600 px-2 py-1 rounded-lg ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(item.created_at)}</Td>
                  {tab === 'loans' && (
                    <Td className="text-xs text-slate-500">{item.disbursed_at ? formatDate(item.disbursed_at) : '-'}</Td>
                  )}
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm font-600 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              ← Prev
            </button>
            <span className="px-4 py-2 text-sm text-slate-500">
              Hal {page} / {Math.ceil(total / LIMIT)}
            </span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}
              className="px-4 py-2 rounded-lg text-sm font-600 bg-white border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
              Next →
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
