import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Package, Clock, Truck, Warehouse, RefreshCw } from 'lucide-react'
import { GadaiSimulator } from '../components/features/GadaiSimulator'

export default function MansGadaiPage() {
  const steps = [
    { icon: Package, title: 'Ajukan Online', desc: 'Isi form dan upload foto barang gadai dari rumah.' },
    { icon: Truck, title: 'Dijemput Tim Kami', desc: 'Tentukan jadwal, kurir kami menjemput barang ke lokasi Anda.' },
    { icon: Warehouse, title: 'Simpan di Warehouse', desc: 'Barang disimpan aman di warehouse berstandar keamanan tinggi.' },
    { icon: ArrowRight, title: 'Dana Cair', desc: 'Setelah barang diterima, dana langsung dicairkan ke rekening.' },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 mb-5">
              <img src="/mansgadai.png" alt="MansGadai" className="h-7 w-auto" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-900 text-slate-900 tracking-tight mb-5">
              Gadai Online<br />
              <span className="text-emerald-700">Barang Aman, Dana Cepat</span>
            </h1>
            <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-xl mx-auto">
              Gadaikan aset berharga Anda secara online. Tim kami menjemput barang ke lokasi Anda, menyimpan aman di warehouse, dan mencairkan dana dalam 24 jam.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth/register" className="btn-primary text-sm px-7 py-3 rounded-xl font-700">
                Gadai Sekarang <ArrowRight size={15} />
              </Link>
              <a href="#simulasi" className="btn-secondary text-sm px-7 py-3 rounded-xl font-600">
                Lihat Simulasi
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-700 text-emerald-700 uppercase tracking-widest mb-2">Cara Kerja</p>
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Gadai Dalam 4 Langkah</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-slate-200 text-center">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-3 relative">
                  <Icon size={18} className="text-emerald-700" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-700 rounded-full text-[10px] font-800 text-white flex items-center justify-center">{i + 1}</span>
                </div>
                <h3 className="text-sm font-700 text-slate-900 mb-1">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: 'Keamanan Terjamin', desc: 'Barang disimpan di warehouse berstandar keamanan tinggi dengan asuransi.' },
              { icon: RefreshCw, title: 'Bisa Diperpanjang', desc: 'Gadai bisa diperpanjang kapan saja dengan biaya perpanjangan 10%.' },
              { icon: Clock, title: 'Toleransi 7 Hari', desc: '7 hari toleransi setelah jatuh tempo sebelum barang diproses lebih lanjut.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center mb-3">
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
      <section className="py-16 bg-slate-50" id="simulasi">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-800 text-slate-900 tracking-tight">Simulasi Gadai</h2>
            <p className="text-slate-500 text-sm mt-2">Kalkulasi nilai gadai dan biaya secara real-time</p>
          </div>
          <GadaiSimulator />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-800 text-white mb-3">Siap Gadaikan Barang?</h2>
          <p className="text-slate-400 text-sm mb-6">Daftar gratis dan ajukan gadai dalam hitungan menit.</p>
          <Link to="/auth/register" className="btn-primary text-sm px-7 py-3 rounded-xl font-700">
            Mulai Sekarang <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
