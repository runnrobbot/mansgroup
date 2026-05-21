import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { blacklistService } from '../../services'
import { formatDate } from '../../lib/utils'

export default function AdminBlacklist() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    blacklistService.listAll().then(({ data }) => { setList(data || []); setLoading(false) })
  }, [])
  return (
    <DashboardLayout role='admin'>
      <div className='space-y-5'>
        <h1 className='text-xl font-800 text-slate-900'>Blacklist Management</h1>
        <Card>
          <Table>
            <TableHead><Th>User</Th><Th>Alasan</Th><Th>Tipe</Th><Th>Tanggal</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={4} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : list.length === 0 ? <EmptyRow colSpan={4} message='Tidak ada user dalam blacklist' />
              : list.map(item => (
                <Tr key={item.id}>
                  <Td><div><p className='font-500 text-sm'>{item.profiles?.full_name}</p><p className='text-xs text-slate-400'>{item.profiles?.email}</p></div></Td>
                  <Td className='text-sm text-slate-600 max-w-48 truncate'>{item.reason}</Td>
                  <Td><span className='badge badge-danger'>{item.type}</span></Td>
                  <Td className='text-xs text-slate-500'>{formatDate(item.added_at)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
