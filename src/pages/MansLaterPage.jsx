import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Shield, Award } from 'lucide-react'
import { LoanSimulator } from '../components/features/LoanSimulator'

export default function MansLaterPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="max-w-2xl mx-auto text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 mb-5">
              <img src="/manslater.png" alt="MansLater" className="h-7 w-auto" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-900 text-slate-900 tracking-tight mb-5">
              Pinjaman Online<br />
              <span className="text-emerald-700">Tanpa Jaminan Fisik</span>
            </h1>
            <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-lg mx-auto">
              Ajukan pinjaman digital hingga Rp 50 juta. Tenor fleksibel 1–9 bulan dengan bunga transparan mulai 5% per bulan tanpa biaya tersembunyi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth/register" className="btn-primary px-7 py-3 rounded-xl text-sm font-700">
                Ajukan Sekarang <ArrowRight size={15} />
              </Link>
              <a href="#simulasi" className="btn-secondary px-7 py-3 rounded-xl text-sm font-600">Simulasi Cicilan</a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Clock, title: 'Proses < 24 Jam', desc: 'Pengajuan digital, verifikasi cepat, dana langsung cair ke rekening.' },
              { icon: Shield, title: 'Bunga Transparan', desc: '5%/bulan, tanpa biaya tersembunyi, semua tertera jelas.' },
              { icon: Award, title: 'Reward User Loyal', desc: 'Bayar tepat waktu, bunga turun jadi 2.5%/bulan.' },
              { icon: Shield, title: 'Aman & Terdaftar', desc: 'Diawasi OJK dengan enkripsi data end-to-end.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                  <Icon size={17} className="text-emerald-700" />
                </div>
                <h3 className="text-sm font-700 text-slate-900 mb-1">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section className="py-16" id="simulasi">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-800 text-slate-900 tracking-tight">Simulasi Pinjaman</h2>
            <p className="text-slate-500 text-sm mt-2">Hitung total cicilan & biaya secara real-time</p>
          </div>
          <LoanSimulator />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-800 text-white mb-3">Siap Ajukan Pinjaman?</h2>
            <p className="text-slate-400 text-sm mb-6">Daftar gratis dan proses pengajuan sepenuhnya online.</p>
            <Link to="/auth/register" className="btn-primary text-sm px-7 py-3 rounded-xl font-700">
              Mulai Sekarang <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
