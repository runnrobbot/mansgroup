import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Clock, TrendingUp, Lock, Award, ChevronDown, ArrowUpRight } from 'lucide-react'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { LoanSimulator } from '../components/features/LoanSimulator'
import { GadaiSimulator } from '../components/features/GadaiSimulator'

const FEATURES = [
  { icon: Clock, title: 'Proses Cepat', desc: 'Pengajuan online dalam hitungan menit, pencairan dalam 24 jam kerja.' },
  { icon: Shield, title: 'Aman & Terpercaya', desc: 'Data terenkripsi end-to-end, diawasi OJK, dan perlindungan penuh.' },
  { icon: TrendingUp, title: 'Bunga Transparan', desc: 'Tidak ada biaya tersembunyi. Semua biaya dihitung di awal dan ditunjukkan secara jelas.' },
  { icon: Lock, title: 'Privasi Terjaga', desc: 'Keamanan data pribadi Anda adalah prioritas utama dengan Row Level Security.' },
  { icon: Award, title: 'Tenor Fleksibel', desc: 'Pilih tenor 1, 3, 6, atau 9 bulan sesuai kemampuan cicilan Anda.' },
  { icon: Shield, title: 'Reward Loyalitas', desc: 'Bayar tepat waktu, dapatkan bunga lebih rendah untuk pengajuan berikutnya.' },
]

const FAQS = [
  { q: 'Apa itu MansLater?', a: 'MansLater adalah layanan pinjaman online MansGroup. Ajukan hingga Rp 50 juta tanpa jaminan fisik, tenor 1–9 bulan, bunga mulai 5% per bulan.' },
  { q: 'Apa itu MansGadai?', a: 'MansGadai adalah layanan gadai online. Gadaikan barang berharga Anda, tim kami menjemput barang dan mencairkan dana dalam 24 jam.' },
  { q: 'Dokumen apa yang diperlukan?', a: 'Cukup KTP dan foto selfie dengan KTP. Untuk verifikasi tambahan mungkin diperlukan slip gaji atau bukti usaha.' },
  { q: 'Berapa lama pencairan?', a: 'Setelah dokumen lengkap dan diverifikasi, dana dicairkan dalam 1x24 jam kerja ke rekening Anda.' },
  { q: 'Bagaimana jika terlambat bayar?', a: 'Denda keterlambatan dihitung per hari sesuai ketentuan. Kami akan kirim notifikasi pengingat sebelum jatuh tempo.' },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        className="w-full flex items-center justify-between py-5 text-left hover:text-emerald-700 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-600 text-slate-900 pr-6">{q}</span>
        <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-5 text-sm text-slate-600 leading-relaxed -mt-1">
          {a}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-slate-600 text-xs font-600 mb-6">
              PT MansGroup Finansial Indonesia
            </div>

            <h1 className="text-4xl sm:text-5xl font-900 text-slate-900 tracking-tight leading-[1.1] mb-5">
              Pinjaman & Gadai Online<br />
              <span className="text-emerald-700">Tanpa Riba, Sesuai Syariah</span>
            </h1>

            <p className="text-base text-slate-500 leading-relaxed mb-8 max-w-lg mx-auto">
              MansGroup menghadirkan layanan keuangan digital yang transparan, cepat, dan sesuai prinsip ekonomi Islam. Tersedia MansLater untuk pinjaman dan MansGadai untuk gadai barang.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth/register" className="btn-primary text-sm px-6 py-3 rounded-xl font-700">
                Mulai Sekarang <ArrowRight size={16} />
              </Link>
              <Link to="/#layanan" className="btn-secondary text-sm px-6 py-3 rounded-xl font-600">
                Lihat Layanan
              </Link>
            </div>
          </div>

          {/* Trust line */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 pt-10 border-t border-slate-100">
            {[
              'Terdaftar & Diawasi OJK',
              'Enkripsi Data End-to-End',
              'Proses 100% Digital',
              'Pencairan 1x24 Jam',
            ].map(item => (
              <div key={item} className="flex items-center gap-2 text-xs text-slate-500 font-500">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 bg-slate-50" id="layanan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-700 text-emerald-700 uppercase tracking-widest mb-2">Layanan Kami</p>
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Dua Pilihan, Satu Platform</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* MansLater */}
            <div className="bg-white rounded-xl p-8 border border-slate-200">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/manslater.png" alt="MansLater" className="h-6 w-auto" />
                  </div>
                  <h3 className="text-lg font-800 text-slate-900 tracking-tight">Pinjaman Online — MansLater</h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-600 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Tanpa Jaminan
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Ajukan pinjaman digital tanpa perlu memberikan barang fisik sebagai jaminan. Proses cepat, tenor fleksibel, dan bunga transparan.
              </p>

              <ul className="space-y-2.5 mb-7">
                {[
                  'Bunga mulai 5% per bulan',
                  'Tenor 1, 3, 6, atau 9 bulan',
                  'Plafon hingga Rp 50 juta',
                  'Pencairan 1x24 jam kerja',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3">
                <Link to="/manslater" className="btn-primary text-sm px-5 py-2.5 inline-flex rounded-xl">
                  Pelajari MansLater
                </Link>
                <Link to="/auth/register" className="text-sm font-600 text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                  Ajukan Sekarang <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            {/* MansGadai */}
            <div className="bg-slate-900 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/mansgadai.png" alt="MansGadai" className="h-6 w-auto" />
                  </div>
                  <h3 className="text-lg font-800 text-white tracking-tight">Gadai Online — MansGadai</h3>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-600 text-emerald-400 bg-emerald-900/50 px-2.5 py-1 rounded-full border border-emerald-800">
                  Ada Jaminan
                </span>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-6">
                Gadaikan barang berharga Anda tanpa harus datang ke tempat. Tim kami menjemput barang ke lokasi Anda dan mencairkan dana dengan cepat.
              </p>

              <ul className="space-y-2.5 mb-7">
                {[
                  'Jemput barang ke lokasi Anda',
                  'Barang tersimpan aman di warehouse',
                  'Bisa diperpanjang kapan saja',
                  'Barang kembali setelah lunas',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <div className="w-4 h-4 rounded-full bg-emerald-800/50 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3">
                <Link to="/mansgadai" className="btn-primary text-sm px-5 py-2.5 inline-flex rounded-xl">
                  Pelajari MansGadai
                </Link>
                <Link to="/auth/register" className="text-sm font-600 text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  Ajukan Sekarang <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loan Simulator */}
      <section className="py-16" id="simulasi">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-700 text-emerald-700 uppercase tracking-widest mb-2">Simulasi</p>
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Hitung Pinjaman Anda</h2>
            <p className="text-sm text-slate-500 mt-2">Kalkulasi cicilan dan total biaya secara real-time</p>
          </div>
          <LoanSimulator />
        </div>
      </section>

      {/* Gadai Simulator */}
      <section className="py-16 bg-slate-50" id="gadai-simulasi">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-700 text-emerald-700 uppercase tracking-widest mb-2">Simulasi Gadai</p>
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Hitung Nilai Gadai</h2>
          </div>
          <GadaiSimulator />
        </div>
      </section>

      {/* Features */}
      <section className="py-16" id="keunggulan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-700 text-emerald-700 uppercase tracking-widest mb-2">Keunggulan</p>
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Mengapa MansGroup?</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-4">
                  <Icon size={17} className="text-emerald-700" />
                </div>
                <h3 className="text-sm font-700 text-slate-900 mb-1.5">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50" id="faq">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-700 text-emerald-700 uppercase tracking-widest mb-2">FAQ</p>
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Pertanyaan Umum</h2>
          </div>
          <div className="bg-white rounded-xl px-6">
            {FAQS.map((item) => <FAQItem key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-2xl p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-800 text-white tracking-tight mb-3">
              Siap Mengajukan?
            </h2>
            <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
              Daftar gratis dan mulai pengajuan dalam hitungan menit. Tidak ada biaya pendaftaran.
            </p>
            <Link to="/auth/register" className="btn-primary text-sm px-8 py-3.5 rounded-xl font-700">
              Daftar Gratis Sekarang <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
