import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Clock, Shield, Award } from 'lucide-react'
import { LoanSimulator } from '../components/features/LoanSimulator'

export default function MansLaterPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(52,183,136,0.07),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div className="max-w-2xl mx-auto text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-xs font-600 mb-5">
              <Zap size={12} fill="currentColor" /> MansLater — Pinjaman Online
            </div>
            <h1 className="text-4xl sm:text-5xl font-900 text-slate-900 tracking-tight mb-5">
              Pinjaman Cepat,<br /><span className="text-gradient-primary">Proses Digital Penuh</span>
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Ajukan pinjaman online hingga Rp 50 juta. Tenor fleksibel 1–9 bulan dengan bunga transparan tanpa biaya tersembunyi.
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
      <section className="py-16 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Zap, title: 'Proses < 24 Jam', desc: 'Pengajuan digital, verifikasi cepat, dana langsung cair ke rekening.' },
              { icon: Clock, title: 'Tenor 1–9 Bulan', desc: 'Pilih tenor yang sesuai kemampuan bayar Anda.' },
              { icon: Shield, title: 'Bunga Transparan', desc: '5%/bulan, tanpa biaya tersembunyi, semua tertera jelas.' },
              { icon: Award, title: 'Reward User Loyal', desc: 'Bayar tepat waktu, bunga turun jadi 2.5%/bulan.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-premium p-5">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                  <Icon size={17} className="text-emerald-600" />
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
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 rounded-3xl p-10 text-center">
            <h2 className="text-2xl font-800 text-white mb-3">Siap Ajukan Pinjaman?</h2>
            <p className="text-slate-400 text-sm mb-6">Daftar gratis dan proses pengajuan sepenuhnya online.</p>
            <Link to="/auth/register" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-700 text-sm px-7 py-3 rounded-xl transition-colors">
              Mulai Sekarang <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
