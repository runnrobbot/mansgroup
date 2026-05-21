import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { Modal, ModalBody, ModalFooter } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { loanService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminApprovals() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = () => {
    setLoading(true)
    loanService.listAll({ status: 'review', limit: 50 }).then(({ data }) => { setItems(data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const handleAction = async action => {
    if (!selected) return
    setActionLoading(true)
    const status = action === 'approve' ? 'approved' : 'rejected'
    const { error } = await loanService.updateStatus(selected.id, status, notes, profile?.id)
    setActionLoading(false)
    if (!error) { toast.success(action === 'approve' ? 'Pinjaman disetujui' : 'Pinjaman ditolak'); setSelected(null); setNotes(''); load() }
    else toast.error('Gagal memproses')
  }

  return (
    <DashboardLayout role='admin'>
      <div className='space-y-5'>
        <h1 className='text-xl font-800 text-slate-900'>Final Approval Pinjaman</h1>
        <Card>
          <Table>
            <TableHead><Th>Ref</Th><Th>Pemohon</Th><Th>Jumlah</Th><Th>Tenor</Th><Th>Status</Th><Th align='center'>Aksi</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={6} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : items.length === 0 ? <EmptyRow colSpan={6} message='Tidak ada pengajuan untuk disetujui' />
              : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className='font-600 text-xs'>{item.ref_number}</span></Td>
                  <Td><div><p className='font-500 text-sm'>{item.profiles?.full_name}</p><p className='text-xs text-slate-400'>{item.profiles?.email}</p></div></Td>
                  <Td className='font-600'>{formatIDR(item.amount)}</Td>
                  <Td>{item.tenor} bulan</Td>
                  <Td><StatusBadge status={item.status} /></Td>
                  <Td align='center'><button onClick={() => setSelected(item)} className='w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto'><Eye size={14} /></button></Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title='Final Approval' size='md'>
          {selected && (<>
            <ModalBody>
              <div className='space-y-3 mb-4'>
                {[['Pemohon', selected.profiles?.full_name],['Jumlah', formatIDR(selected.amount)],['Tenor', selected.tenor + ' bulan'],['Dana Bersih', formatIDR(selected.net_disbursement)]].map(([l,v]) => (
                  <div key={l} className='flex justify-between text-sm'><span className='text-slate-500'>{l}</span><span className='font-600'>{v}</span></div>
                ))}
              </div>
              <label className='label-field'>Catatan Admin</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className='input-field resize-none' placeholder='Catatan persetujuan...' />
            </ModalBody>
            <ModalFooter>
              <Button variant='ghost' onClick={() => setSelected(null)}>Batal</Button>
              <Button variant='danger' icon={XCircle} loading={actionLoading} onClick={() => handleAction('reject')}>Tolak</Button>
              <Button icon={CheckCircle} loading={actionLoading} onClick={() => handleAction('approve')}>Setujui</Button>
            </ModalFooter>
          </>)}
        </Modal>
      </div>
    </DashboardLayout>
  )
}
