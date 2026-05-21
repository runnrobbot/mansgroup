import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { useAuth } from '../../contexts/AuthContext'
import { paymentService } from '../../services'
import { formatIDR, formatDate } from '../../lib/utils'

export default function PaymentsPage() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!profile) return
    paymentService.getByUserId(profile.id).then(({ data }) => { setPayments(data || []); setLoading(false) })
  }, [profile])
  return (
    <DashboardLayout role='user'>
      <div className='space-y-5'>
        <h1 className='text-xl font-800 text-slate-900'>Riwayat Pembayaran</h1>
        <Card>
          <Table>
            <TableHead><Th>ID Pembayaran</Th><Th>Referensi</Th><Th>Jumlah</Th><Th>Status</Th><Th>Tanggal</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={5} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : payments.length === 0 ? <EmptyRow colSpan={5} message='Belum ada riwayat pembayaran' />
              : payments.map(p => (
                <Tr key={p.id}>
                  <Td><span className='font-600 text-xs'>{p.id?.slice(0,8)}</span></Td>
                  <Td className='text-xs'>{p.loans?.ref_number || p.gadai_applications?.ref_number || '-'}</Td>
                  <Td className='font-600'>{formatIDR(p.amount)}</Td>
                  <Td><StatusBadge status={p.status} /></Td>
                  <Td className='text-xs text-slate-500'>{formatDate(p.created_at)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
