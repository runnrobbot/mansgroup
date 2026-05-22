import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody } from '../../components/ui/Modal'
import { loanService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_OPTIONS = ['', 'pending', 'reviewing', 'approved', 'rejected', 'disbursed', 'active', 'overdue', 'completed']

const stagger = { visible: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28 } } }

export default function FounderLoans() {
  const [loans, setLoans] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const LIMIT = 15

  const load = useCallback(async () => {
    setLoading(true)
    const res = await loanService.listAll({ page, limit: LIMIT, status, search })
    setLoans(res.data || [])
    setTotal(res.count || 0)
    setLoading(false)
  }, [page, status, search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [status, search])

  // Summary stats from current dataset
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <DashboardLayout role="founder">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Monitor Pinjaman</h1>
          <p className="text-sm text-slate-500 mt-0.5">Semua pengajuan MansLater — {total} total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input-field pl-8 text-sm w-52"
              placeholder="Cari ref / nama..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="input-field text-sm w-44"
          >
            <option value="">Semua Status</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHead>
              <Th>Ref</Th>
              <Th>Pemohon</Th>
              <Th>Jumlah</Th>
              <Th>Tenor</Th>
              <Th>Status</Th>
              <Th>Tanggal</Th>
              <Th align="center">Detail</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : loans.length === 0 ? (
                <EmptyRow colSpan={7} message="Tidak ada data pinjaman" />
              ) : loans.map(loan => (
                <Tr key={loan.id}>
                  <Td><span className="font-600 text-xs text-emerald-700">{loan.ref_number || '-'}</span></Td>
                  <Td>
                    <div>
                      <p className="font-500 text-sm">{loan.profiles?.full_name || loan.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{loan.profiles?.email || '-'}</p>
                    </div>
                  </Td>
                  <Td className="font-600">{formatIDR(loan.amount)}</Td>
                  <Td className="text-slate-500">{loan.tenor} bln</Td>
                  <Td><StatusBadge status={loan.status} /></Td>
                  <Td className="text-xs text-slate-400">{formatDate(loan.created_at)}</Td>
                  <Td align="center">
                    <button
                      onClick={() => setSelected(loan)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto"
                    >
                      <Eye size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-2">
              <p className="text-xs text-slate-400">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} dari {total}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="px-3 py-1 text-xs font-600 text-slate-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detail Pinjaman" size="md">
        {selected && (
          <ModalBody>
            <div className="space-y-3">
              {[
                { label: 'Ref Number', value: selected.ref_number },
                { label: 'Pemohon', value: selected.profiles?.full_name || selected.full_name || '-' },
                { label: 'Email', value: selected.profiles?.email || '-' },
                { label: 'Jumlah', value: formatIDR(selected.amount) },
                { label: 'Tenor', value: `${selected.tenor} bulan` },
                { label: 'Bunga', value: `${(selected.interest_rate * 100).toFixed(1)}%/bulan` },
                { label: 'Biaya Admin', value: formatIDR(selected.platform_fee) },
                { label: 'Dana Bersih', value: formatIDR(selected.net_disbursement) },
                { label: 'Total Bayar', value: formatIDR(selected.total_repayment) },
                { label: 'Cicilan/Bulan', value: formatIDR(selected.monthly_installment) },
                { label: 'Bank', value: selected.bank_code },
                { label: 'Status', value: <StatusBadge status={selected.status} /> },
                { label: 'Tanggal Pengajuan', value: formatDate(selected.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-600 text-slate-800 text-right">{value}</span>
                </div>
              ))}
            </div>
          </ModalBody>
        )}
      </Modal>
    </DashboardLayout>
  )
}
