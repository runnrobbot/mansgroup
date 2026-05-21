import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { loanService } from '../../services'
import { formatIDR, formatDate, formatDateTime } from '../../lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function LoanDetailPage() {
  const { id } = useParams()
  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    loanService.getById(id).then(({ data }) => { setLoan(data); setLoading(false) })
  }, [id])

  if (loading) return <DashboardLayout role='user'><div className='text-center py-20 text-slate-400'>Memuat...</div></DashboardLayout>
  if (!loan) return <DashboardLayout role='user'><div className='text-center py-20 text-slate-400'>Pinjaman tidak ditemukan</div></DashboardLayout>

  return (
    <DashboardLayout role='user'>
      <div className='max-w-2xl space-y-5'>
        <div>
          <Link to='/dashboard/loans' className='flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3'><ArrowLeft size={13} />Kembali</Link>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl font-800 text-slate-900'>{loan.ref_number}</h1>
            <StatusBadge status={loan.status} />
          </div>
        </div>
        <Card>
          <h2 className='text-sm font-700 text-slate-900 mb-4'>Detail Pinjaman</h2>
          <div className='grid grid-cols-2 gap-4'>
            {[
              { label: 'Jumlah Pinjaman', value: formatIDR(loan.amount) },
              { label: 'Tenor', value: loan.tenor + ' bulan' },
              { label: 'Dana Diterima', value: formatIDR(loan.net_disbursement) },
              { label: 'Cicilan / Bulan', value: formatIDR(loan.monthly_installment) },
              { label: 'Total Bunga', value: formatIDR(loan.total_interest) },
              { label: 'Total Bayar', value: formatIDR(loan.total_repayment) },
              { label: 'Tanggal Pengajuan', value: formatDate(loan.created_at) },
              { label: 'Bank', value: loan.bank_code },
            ].map(({ label, value }) => (
              <div key={label}><p className='text-xs text-slate-400 mb-0.5'>{label}</p><p className='text-sm font-600 text-slate-900'>{value}</p></div>
            ))}
          </div>
        </Card>
        {loan.loan_schedules?.length > 0 && (
          <Card>
            <h2 className='text-sm font-700 text-slate-900 mb-4'>Jadwal Cicilan</h2>
            <div className='space-y-2'>
              {loan.loan_schedules.map(s => (
                <div key={s.id} className='flex justify-between py-2 border-b border-slate-50 last:border-0 text-sm'>
                  <span className='text-slate-500'>Bulan {s.month} · {formatDate(s.due_date)}</span>
                  <span className='font-600 text-slate-900'>{formatIDR(s.total)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
