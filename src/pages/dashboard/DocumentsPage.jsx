import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../contexts/AuthContext'
import { loanService, gadaiService } from '../../services'
import { formatDate } from '../../lib/utils'
import { FileText, Upload, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

function StatusIcon({ status }) {
  const map = {
    pending: <Clock size={14} className="text-amber-500" />,
    reviewing: <AlertCircle size={14} className="text-blue-500" />,
    approved: <CheckCircle size={14} className="text-emerald-500" />,
    rejected: <XCircle size={14} className="text-red-500" />,
    disbursed: <CheckCircle size={14} className="text-emerald-600" />,
  }
  return map[status] || <Clock size={14} className="text-slate-400" />
}

function StatusLabel({ status }) {
  const map = {
    pending: 'Menunggu Review',
    reviewing: 'Sedang Direview',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    disbursed: 'Dana Dicairkan',
    active: 'Aktif',
    repaid: 'Lunas',
    defaulted: 'Macet',
    stored: 'Disimpan',
    redeemed: 'Ditebus',
    forfeited: 'Dilelang',
  }
  return <span className="text-xs text-slate-600">{map[status] || status}</span>
}

export default function DocumentsPage() {
  const { profile } = useAuth()
  const [loans, setLoans] = useState([])
  const [gadais, setGadais] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    Promise.all([
      loanService.getByUserId(profile.id),
      gadaiService.getByUserId(profile.id),
    ]).then(([loanRes, gadaiRes]) => {
      setLoans(loanRes.data || [])
      setGadais(gadaiRes.data || [])
      setLoading(false)
    })
  }, [profile])

  const hasAny = loans.length > 0 || gadais.length > 0

  if (loading) {
    return (
      <DashboardLayout role="user">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!hasAny) {
    return (
      <DashboardLayout role="user">
        <div className="max-w-lg mx-auto mt-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
            <FileText size={28} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-800 text-slate-900">Belum Ada Dokumen</h1>
            <p className="text-sm text-slate-500 mt-2">
              Anda belum memiliki pengajuan pinjaman atau gadai. Mulai pengajuan untuk mengunggah dokumen Anda.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard/loans/apply"
              className="btn-primary text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 justify-center"
            >
              <Upload size={14} />
              Ajukan Pinjaman
            </Link>
            <Link
              to="/dashboard/gadai/apply"
              className="btn-secondary text-sm py-2.5 px-5 rounded-xl flex items-center gap-2 justify-center"
            >
              <Upload size={14} />
              Ajukan Gadai
            </Link>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="user">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Dokumen Saya</h1>
            <p className="text-sm text-slate-500 mt-0.5">Riwayat pengajuan dan dokumen Anda</p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/loans/apply" className="btn-secondary text-xs py-2 px-3 rounded-lg flex items-center gap-1.5">
              <Upload size={12} /> Pinjaman Baru
            </Link>
            <Link to="/dashboard/gadai/apply" className="btn-primary text-xs py-2 px-3 rounded-lg flex items-center gap-1.5">
              <Upload size={12} /> Gadai Baru
            </Link>
          </div>
        </div>

        {loans.length > 0 && (
          <div>
            <h2 className="text-sm font-700 text-slate-700 mb-3">Pengajuan MansLater (Pinjaman)</h2>
            <div className="space-y-3">
              {loans.map(loan => (
                <Card key={loan.id} className="hover:shadow-md transition-shadow">
                  <Link to={`/dashboard/loans/${loan.id}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <FileText size={18} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-700 text-slate-900">{loan.ref_number || 'Pinjaman'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusIcon status={loan.status} />
                          <StatusLabel status={loan.status} />
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-400">{formatDate(loan.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-700 text-slate-900">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(loan.amount)}
                        </p>
                        <p className="text-xs text-slate-400">{loan.tenor} bulan</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300" />
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {gadais.length > 0 && (
          <div>
            <h2 className="text-sm font-700 text-slate-700 mb-3">Pengajuan MansGadai</h2>
            <div className="space-y-3">
              {gadais.map(gadai => (
                <Card key={gadai.id} className="hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <FileText size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-700 text-slate-900">{gadai.item_name || gadai.ref_number || 'Gadai'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusIcon status={gadai.status} />
                          <StatusLabel status={gadai.status} />
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-400">{formatDate(gadai.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-700 text-slate-900">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(gadai.loan_amount)}
                      </p>
                      <p className="text-xs text-slate-400">{gadai.item_category || '-'}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}