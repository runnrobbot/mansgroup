import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DashboardLayout } from '../../components/layout/DashboardLayout'
import { Card } from '../../components/ui/Card'
import { StatusBadge } from '../../components/ui/Badge'
import { Table, TableHead, Th, TableBody, Tr, Td, EmptyRow } from '../../components/ui/Table'
import { useAuth } from '../../contexts/AuthContext'
import { loanService } from '../../services'
import { supabase } from '../../lib/supabase'
import { formatIDR, formatDate, getEffectiveAmount, isRevised } from '../../lib/utils'
import { Plus, Eye, Clock, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MyLoansPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (!profile || loadingRef.current) return
    loadingRef.current = true
    try {
      const { data } = await loanService.getByUserId(profile.id)
      setLoans(data || [])
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { load() }, [load])

  // Realtime — sync ketika loan status berubah (misal setelah pembayaran lunas)
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel(`myloans-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'loans',
        filter: `user_id=eq.${profile.id}`,
      }, () => { load() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, load])

  // ── Status logic ─────────────────────────────────────────────────────────
  const isProfileComplete = !!(
    profile?.full_name && profile?.nik && profile?.phone &&
    profile?.birth_date && profile?.address && profile?.occupation && profile?.income
  )
  const isKycVerified = profile?.kyc_status === 'verified'

  // Pinjaman yang sedang aktif / dalam proses
  const activeLoan = loans.find(l =>
    ['disbursed', 'overdue'].includes(l.status)
  )
  // Semua status yang belum final (termasuk approved dan revision)
  const pendingLoan = loans.find(l =>
    ['pending', 'review', 'revision', 'approved'].includes(l.status)
  )

  // Tombol "Ajukan Baru" — 4 kondisi
  const getApplyButton = () => {
    // Kondisi 1: profil belum lengkap / KYC belum verified
    if (!isProfileComplete || !isKycVerified) {
      return (
        <button
          onClick={() => {
            toast.error(
              !isProfileComplete
                ? 'Lengkapi data profil terlebih dahulu'
                : 'Verifikasi KYC diperlukan sebelum pengajuan'
            )
            navigate('/dashboard/profile')
          }}
          className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 bg-slate-200 text-slate-500 cursor-pointer transition-all hover:bg-slate-300"
        >
          <Lock size={14} /> Ajukan Baru
        </button>
      )
    }

    // Kondisi 2: ada pinjaman aktif (disbursed/overdue) → tidak boleh ajukan baru
    if (activeLoan) {
      return (
        <button
          onClick={() =>
            toast.error('Selesaikan pinjaman aktif terlebih dahulu sebelum mengajukan pinjaman baru')
          }
          className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 bg-slate-200 text-slate-500 cursor-pointer transition-all hover:bg-slate-300"
        >
          <Lock size={14} /> Ajukan Baru
        </button>
      )
    }

    // Kondisi 3: ada pengajuan yang masih pending/review/approved → arahkan ke pengajuan itu
    if (pendingLoan) {
      return (
        <Link
          to={`/dashboard/loans/${pendingLoan.id}`}
          className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer transition-all hover:bg-amber-100"
        >
          <Clock size={14} /> Lihat Pengajuan
        </Link>
      )
    }

    // Kondisi 4: bebas ajukan → tombol normal
    return (
      <Link
        to="/dashboard/loans/apply"
        className="inline-flex items-center gap-1.5 text-sm py-2 px-4 rounded-lg font-600 btn-primary"
      >
        <Plus size={14} /> Ajukan Baru
      </Link>
    )
  }

  // ── Info banner ───────────────────────────────────────────────────────────
  const getBanner = () => {
    if (!isProfileComplete) {
      return (
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-700 text-blue-800">Profil belum lengkap</p>
            <p className="text-xs text-blue-600 mt-0.5">Isi data diri, NIK, dan verifikasi KYC terlebih dahulu sebelum dapat mengajukan pinjaman.</p>
          </div>
          <Link to="/dashboard/profile" className="ml-auto text-xs font-600 text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap">
            Lengkapi <ArrowRight size={12} />
          </Link>
        </div>
      )
    }
    if (!isKycVerified) {
      return (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-700 text-amber-800">KYC belum diverifikasi</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {profile?.kyc_status === 'pending'
                ? 'Dokumen KYC kamu sedang dalam proses review oleh tim kami.'
                : 'Upload KTP dan selfie untuk memulai proses verifikasi.'}
            </p>
          </div>
          <Link to="/dashboard/profile" className="ml-auto text-xs font-600 text-amber-600 hover:text-amber-700 flex items-center gap-1 whitespace-nowrap">
            {profile?.kyc_status === 'pending' ? 'Cek Status' : 'Verifikasi'} <ArrowRight size={12} />
          </Link>
        </div>
      )
    }
    if (activeLoan) {
      const eff = getEffectiveAmount(activeLoan, true)
      const wasRevised = isRevised(activeLoan, true)
      return (
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <Lock size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-700 text-slate-700">Sudah ada pinjaman aktif</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Pinjaman <span className="font-600">{activeLoan.ref_number}</span> ({formatIDR(eff)}{wasRevised && ' · direvisi'}) sedang aktif.
              Selesaikan terlebih dahulu sebelum mengajukan pinjaman baru.
            </p>
          </div>
          <Link to={`/dashboard/loans/${activeLoan.id}`} className="ml-auto text-xs font-600 text-slate-600 hover:text-slate-700 flex items-center gap-1 whitespace-nowrap">
            Detail <ArrowRight size={12} />
          </Link>
        </div>
      )
    }
    if (pendingLoan) {
      const eff = getEffectiveAmount(pendingLoan, true)
      const wasRevised = isRevised(pendingLoan, true)
      const isApproved = pendingLoan.status === 'approved'
      return (
        <div className={`flex items-start gap-3 p-4 rounded-2xl ${
          isApproved ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
        }`}>
          <Clock size={16} className={`flex-shrink-0 mt-0.5 ${isApproved ? 'text-emerald-500' : 'text-amber-500'}`} />
          <div className="flex-1">
            <p className={`text-sm font-700 ${isApproved ? 'text-emerald-800' : 'text-amber-800'}`}>
              {isApproved ? 'Pengajuan Disetujui — Menunggu Pencairan' : 'Ada pengajuan yang sedang diproses'}
            </p>
            <p className={`text-xs mt-0.5 ${isApproved ? 'text-emerald-700' : 'text-amber-600'}`}>
              {wasRevised ? (
                <>
                  Pengajuan <span className="font-600">{pendingLoan.ref_number}</span> {isApproved ? 'disetujui' : 'sedang direview'} dengan nilai{' '}
                  <span className="font-700">{formatIDR(eff)}</span> (direvisi dari pengajuan asli {formatIDR(pendingLoan.amount)} oleh tim kami).
                </>
              ) : (
                <>
                  Pengajuan <span className="font-600">{pendingLoan.ref_number}</span> ({formatIDR(eff)}) {isApproved ? 'sudah disetujui, menunggu pencairan dana.' : 'sedang dalam review.'}
                </>
              )}
            </p>
          </div>
          <Link to={`/dashboard/loans/${pendingLoan.id}`} className={`ml-auto text-xs font-600 flex items-center gap-1 whitespace-nowrap ${
            isApproved ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-600 hover:text-amber-700'
          }`}>
            Lihat <ArrowRight size={12} />
          </Link>
        </div>
      )
    }
    return null
  }

  return (
    <DashboardLayout role="user">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-800 text-slate-900">Pinjaman Saya</h1>
            <p className="text-sm text-slate-500 mt-0.5">{loans.length} total pengajuan</p>
          </div>
          {getApplyButton()}
        </div>

        {/* Banner info */}
        {!loading && getBanner()}

        {/* Table */}
        <Card>
          <Table>
            <TableHead>
              <Th>Ref. Nomor</Th>
              <Th>Jumlah</Th>
              <Th>Tenor</Th>
              <Th>Status</Th>
              <Th>Tanggal</Th>
              <Th align="center">Detail</Th>
            </TableHead>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Memuat...</td></tr>
              ) : loans.length === 0 ? (
                <EmptyRow colSpan={6} message="Belum ada pinjaman" />
              ) : (
                loans.map(l => {
                  const eff = getEffectiveAmount(l, true)
                  const revised = isRevised(l, true)
                  return (
                    <Tr key={l.id}>
                      <Td><span className="font-600 text-xs">{l.ref_number || '-'}</span></Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className="font-600">{formatIDR(eff)}</span>
                          {revised && (
                            <span className="text-[10px] text-amber-600 mt-0.5">
                              direvisi dari {formatIDR(l.amount)}
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td>{l.tenor} bulan</Td>
                      <Td><StatusBadge status={l.status} /></Td>
                      <Td className="text-xs text-slate-500">{formatDate(l.created_at)}</Td>
                      <Td align="center">
                        <Link
                          to={`/dashboard/loans/${l.id}`}
                          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 mx-auto"
                        >
                          <Eye size={14} />
                        </Link>
                      </Td>
                    </Tr>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  )
}