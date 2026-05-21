import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { RoleBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { profileService } from '../../services'
import { formatDate } from '../../lib/utils'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  useEffect(() => {
    profileService.listAll({ search, limit: 30 }).then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [search])
  return (
    <DashboardLayout role='admin'>
      <div className='space-y-5'>
        <h1 className='text-xl font-800 text-slate-900'>Kelola User</h1>
        <div className='flex gap-3'><input className='input-field max-w-xs text-sm' placeholder='Cari nama user...' value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Card>
          <Table>
            <TableHead><Th>Nama</Th><Th>Email</Th><Th>Role</Th><Th>KYC</Th><Th>Terdaftar</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={5} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : users.length === 0 ? <EmptyRow colSpan={5} message='Tidak ada user' />
              : users.map(u => (
                <Tr key={u.id}>
                  <Td className='font-500'>{u.full_name || '-'}</Td>
                  <Td className='text-xs text-slate-500'>{u.email || '-'}</Td>
                  <Td><RoleBadge role={u.role} /></Td>
                  <Td><span className={'badge ' + (u.kyc_status === 'verified' ? 'badge-success' : 'badge-gray')}>{u.kyc_status || 'unverified'}</span></Td>
                  <Td className='text-xs text-slate-500'>{formatDate(u.created_at)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
