import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { useAuth } from '../../contexts/AuthContext'
import { loanService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'
import { Plus, Eye } from 'lucide-react'

export default function MyLoansPage() {
  const { profile } = useAuth()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!profile) return
    loanService.getByUserId(profile.id).then(({ data }) => { setLoans(data || []); setLoading(false) })
  }, [profile])
  return (
    <DashboardLayout role='user'>
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <div><h1 className='text-xl font-800 text-slate-900'>Pinjaman Saya</h1><p className='text-sm text-slate-500 mt-0.5'>{loans.length} total pengajuan</p></div>
          <Link to='/dashboard/loans/apply' className='btn-primary text-sm py-2 px-4 rounded-lg'><Plus size={14} />Ajukan Baru</Link>
        </div>
        <Card>
          <Table>
            <TableHead>
              <Th>Ref. Nomor</Th><Th>Jumlah</Th><Th>Tenor</Th><Th>Status</Th><Th>Tanggal</Th><Th align='center'>Detail</Th>
            </TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={6} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : loans.length === 0 ? <EmptyRow colSpan={6} message='Belum ada pinjaman' />
              : loans.map(l => (
                <Tr key={l.id}>
                  <Td><span className='font-600 text-xs'>{l.ref_number || '-'}</span></Td>
                  <Td className='font-600'>{formatIDR(l.amount)}</Td>
                  <Td>{l.tenor} bulan</Td>
                  <Td><StatusBadge status={l.status} /></Td>
                  <Td className='text-xs text-slate-500'>{formatDate(l.created_at)}</Td>
                  <Td align='center'><Link to={'/dashboard/loans/' + l.id} className='w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto'><Eye size={14} /></Link></Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
