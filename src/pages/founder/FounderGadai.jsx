import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody } from '../../components/ui/Modal'
import { gadaiService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_OPTIONS = ['', 'pending', 'reviewing', 'approved', 'rejected', 'active', 'stored', 'redeemed', 'forfeited']

export default function FounderGadai() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)
  const LIMIT = 15

  const load = useCallback(async () => {
    setLoading(true)
    const res = await gadaiService.listAll({ page, limit: LIMIT, status })
    setItems(res.data || [])
    setTotal(res.count || 0)
    setLoading(false)
  }, [page, status])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [status])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <DashboardLayout role="founder">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-800 text-slate-900">Monitor Gadai</h1>
          <p className="text-sm text-slate-500 mt-0.5">Semua pengajuan MansGadai — {total} total</p>
        </div>

        <div className="flex gap-3">
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

        <Card>
          <Table>
            <TableHead>
              <Th>Ref</Th>
              <Th>Pemohon</Th>
              <Th>Barang</Th>
              <Th>Nilai Pinjaman</Th>
              <Th>Status</Th>
              <Th>Jatuh Tempo</Th>
              <Th align="center">Detail</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : items.length === 0 ? (
                <EmptyRow colSpan={7} message="Tidak ada data gadai" />
              ) : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className="font-600 text-xs text-emerald-700">{item.ref_number || '-'}</span></Td>
                  <Td>
                    <div>
                      <p className="font-500 text-sm">{item.profiles?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{item.profiles?.email || '-'}</p>
                    </div>
                  </Td>
                  <Td>
                    <div>
                      <p className="text-sm font-500">{item.item_name || '-'}</p>
                      <p className="text-xs text-slate-400">{item.item_category || '-'}</p>
                    </div>
                  </Td>
                  <Td className="font-600">{formatIDR(item.loan_amount)}</Td>
                  <Td><StatusBadge status={item.status} /></Td>
                  <Td className="text-xs text-slate-400">{item.due_date ? formatDate(item.due_date) : '-'}</Td>
                  <Td align="center">
                    <button
                      onClick={() => setSelected(item)}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto"
                    >
                      <Eye size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 mt-2">
              <p className="text-xs text-slate-400">{(page-1)*LIMIT+1}–{Math.min(page*LIMIT, total)} dari {total}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={13} /></button>
                <span className="px-3 py-1 text-xs font-600 text-slate-700">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={13} /></button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Detail Gadai" size="md">
        {selected && (
          <ModalBody>
            <div className="space-y-3">
              {[
                { label: 'Ref Number', value: selected.ref_number },
                { label: 'Pemohon', value: selected.profiles?.full_name || '-' },
                { label: 'Email', value: selected.profiles?.email || '-' },
                { label: 'Nama Barang', value: selected.item_name || '-' },
                { label: 'Kategori', value: selected.item_category || '-' },
                { label: 'Deskripsi', value: selected.item_description || '-' },
                { label: 'Nilai Pinjaman', value: formatIDR(selected.loan_amount) },
                { label: 'Bunga', value: formatIDR(selected.interest) },
                { label: 'Biaya Admin', value: formatIDR(selected.platform_fee) },
                { label: 'Dana Bersih', value: formatIDR(selected.net_disbursement) },
                { label: 'Total Bayar', value: formatIDR(selected.total_repayment) },
                { label: 'Status', value: <StatusBadge status={selected.status} /> },
                { label: 'Jatuh Tempo', value: selected.due_date ? formatDate(selected.due_date) : '-' },
                { label: 'Tanggal Pengajuan', value: formatDate(selected.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-600 text-slate-800 text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          </ModalBody>
        )}
      </Modal>
    </DashboardLayout>
  )
}
