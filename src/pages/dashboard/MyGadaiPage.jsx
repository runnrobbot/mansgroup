import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { useAuth } from '../../contexts/AuthContext'
import { gadaiService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { Plus } from 'lucide-react'

export default function MyGadaiPage() {
  const { profile } = useAuth()
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!profile) return
    gadaiService.getByUserId(profile.id).then(({ data }) => { setGadais(data || []); setLoading(false) })
  }, [profile])
  return (
    <DashboardLayout role='user'>
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <div><h1 className='text-xl font-800 text-slate-900'>Gadai Saya</h1></div>
          <Link to='/dashboard/gadai/apply' className='btn-primary text-sm py-2 px-4 rounded-lg'><Plus size={14} />Ajukan Gadai</Link>
        </div>
        <Card>
          <Table>
            <TableHead><Th>Ref</Th><Th>Barang</Th><Th>Nilai Pinjaman</Th><Th>Status</Th><Th>Jatuh Tempo</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={5} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : gadais.length === 0 ? <EmptyRow colSpan={5} message='Belum ada gadai' />
              : gadais.map(g => (
                <Tr key={g.id}>
                  <Td><span className='font-600 text-xs'>{g.ref_number || '-'}</span></Td>
                  <Td>{g.item_name || '-'}</Td>
                  <Td className='font-600'>{formatIDR(g.loan_amount)}</Td>
                  <Td><StatusBadge status={g.status} /></Td>
                  <Td className='text-xs text-slate-500'>{formatDate(g.due_date)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
