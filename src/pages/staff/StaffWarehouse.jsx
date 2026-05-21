import { useEffect, useState } from 'react'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { warehouseService } from '../../services'
import { formatDate, formatIDR } from '../../lib/utils'
import { Warehouse } from 'lucide-react'

export default function StaffWarehouse() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    warehouseService.listAll({ limit: 50 }).then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [])
  return (
    <DashboardLayout role='staff'>
      <div className='space-y-5'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center'>
            <Warehouse size={18} className='text-emerald-600' />
          </div>
          <h1 className='text-xl font-800 text-slate-900'>Warehouse Collateral</h1>
        </div>
        <Card>
          <Table>
            <TableHead><Th>Kode Inventory</Th><Th>Barang</Th><Th>Kategori</Th><Th>Kondisi</Th><Th>Est. Nilai</Th><Th>Masuk</Th></TableHead>
            <TableBody>
              {loading ? (<tr><td colSpan={6} className='py-8 text-center text-sm text-slate-400'>Memuat...</td></tr>)
              : items.length === 0 ? <EmptyRow colSpan={6} message='Warehouse kosong' />
              : items.map(item => (
                <Tr key={item.id}>
                  <Td><span className='font-600 text-xs'>{item.inventory_code || '-'}</span></Td>
                  <Td>{item.item_name || '-'}</Td>
                  <Td className='text-xs'>{item.category || '-'}</Td>
                  <Td className='text-xs'>{item.condition || '-'}</Td>
                  <Td className='font-600'>{formatIDR(item.estimated_value)}</Td>
                  <Td className='text-xs text-slate-500'>{formatDate(item.received_at)}</Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}
