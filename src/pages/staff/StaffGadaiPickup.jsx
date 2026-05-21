import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { gadaiService } from '../../services'
import { formatDate } from '../../lib/utils'

export default function StaffGadaiPickup() {
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    gadaiService.listAll({ status: 'waiting_pickup', limit: 50 }).then(({ data }) => { setGadais(data || []); setLoading(false) })
  }, [])
  return (
    <DashboardLayout role='staff'>
      <div className='space-y-5'>
        <h1 className='text-xl font-800 text-slate-900'>Jadwal Penjemputan Gadai</h1>
        <Card>
          <Table>
            <TableHead><Th>Ref</Th><Th>Pemohon</Th><Th>Barang</Th><Th>Jadwal Pickup</Th><Th>Alamat</Th><Th>Status</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={6} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : gadais.length === 0 ? <EmptyRow colSpan={6} message='Tidak ada jadwal penjemputan' />
              : gadais.map(g => (
                <Tr key={g.id}>
                  <Td><span className='font-600 text-xs'>{g.ref_number}</span></Td>
                  <Td>{g.profiles?.full_name || '-'}</Td>
                  <Td>{g.item_name || '-'}</Td>
                  <Td className='text-xs'>{g.pickup_schedule ? new Date(g.pickup_schedule).toLocaleString('id-ID') : '-'}</Td>
                  <Td className='text-xs max-w-40 truncate'>{g.pickup_address || '-'}</Td>
                  <Td><StatusBadge status={g.status} /></Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
