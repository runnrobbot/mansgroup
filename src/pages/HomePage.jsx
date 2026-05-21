import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Zap, Clock, Star, ChevronDown, TrendingUp, Lock, Award } from 'lucide-react'
import { useState } from 'react'
import { Navbar } from '../components/layout/Navbar'
import { Footer } from '../components/layout/Footer'
import { LoanSimulator } from '../components/features/LoanSimulator'
import { GadaiSimulator } from '../components/features/GadaiSimulator'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

const STATS = [
  { value: '50K+', label: 'Pengguna Aktif' },
  { value: 'Rp 200M+', label: 'Total Disalurkan' },
  { value: '98%', label: 'Tingkat Kepuasan' },
  { value: '< 24 Jam', label: 'Waktu Pencairan' },
]

const FEATURES = [
  { icon: Zap, title: 'Proses Cepat', desc: 'Pengajuan online dalam hitungan menit, pencairan dalam 24 jam kerja.' },
  { icon: Shield, title: 'Aman & Terpercaya', desc: 'Data terenkripsi end-to-end, diawasi OJK, dan perlindungan penuh.' },
  { icon: Clock, title: 'Fleksibel', desc: 'Tenor pilihan 1–9 bulan, cocok untuk berbagai kebutuhan finansial Anda.' },
  { icon: TrendingUp, title: 'Reward Loyal', desc: 'Bayar tepat waktu, dapatkan bunga lebih rendah untuk pinjaman berikutnya.' },
  { icon: Lock, title: 'Privasi Terjaga', desc: 'Keamanan data pribadi Anda adalah prioritas utama kami.' },
  { icon: Award, title: 'No Hidden Fee', desc: 'Transparan tanpa biaya tersembunyi. Semua biaya tertera sejelas mungkin.' },
]

const TESTIMONIALS = [
  { name: 'Andi Pratama', role: 'Wirausahawan', rating: 5, text: 'Prosesnya sangat cepat dan mudah. Dalam 1 hari dana sudah cair ke rekening saya. Recommended!' },
  { name: 'Siti Rahayu', role: 'Karyawan Swasta', rating: 5, text: 'MansGadai sangat membantu saat butuh dana mendesak. Staff-nya ramah dan profesional.' },
  { name: 'Budi Santoso', role: 'Mahasiswa', rating: 5, text: 'Sebagai mahasiswa, MansLater benar-benar solusi terbaik. Tenor fleksibel dan bunga transparan.' },
]

const FAQS = [
  { q: 'Apa itu MansLater?', a: 'MansLater adalah layanan pinjaman online MansGroup dengan proses pengajuan digital, tenor 1–9 bulan, dan bunga transparan mulai 5% per bulan.' },
  { q: 'Apa itu MansGadai?', a: 'MansGadai adalah layanan gadai online modern. Anda menggadaikan aset berharga, kami menjemput barang dan mencairkan dana dalam 24 jam.' },
  { q: 'Dokumen apa yang diperlukan?', a: 'KTP, foto selfie dengan KTP, dan data diri lengkap. Untuk karyawan atau wirausaha, mungkin diperlukan slip gaji atau bukti usaha.' },
  { q: 'Berapa lama proses pencairan?', a: 'Setelah dokumen lengkap dan diverifikasi, dana dicairkan dalam 1x24 jam kerja.' },
  { q: 'Apakah data saya aman?', a: 'Ya, seluruh data dienkripsi dan sistem kami menggunakan Row Level Security (RLS) berbasis Supabase. Kami tidak pernah membagikan data ke pihak ketiga.' },
  { q: 'Bagaimana sistem reward bekerja?', a: 'Jika Anda membayar pinjaman pertama tepat waktu tanpa keterlambatan, bunga pinjaman berikutnya otomatis turun dari 5% menjadi 2.5% per bulan.' },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-600 text-slate-900">{q}</span>
        <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 ml-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
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
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(52,183,136,0.08),transparent)]" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-64 bg-slate-50 rounded-full blur-3xl opacity-80 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-700 text-xs font-600 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Platform Fintech Modern Indonesia 2026
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-900 text-slate-900 tracking-tight leading-[1.1] mb-6">
              Solusi Finansial{' '}
              <span className="text-gradient-primary">Cepat, Aman</span>
              {' '}& Terpercaya
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto">
              MansGroup menghadirkan pinjaman online dan gadai online dengan proses digital penuh, transparan, dan dapat diandalkan.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth/register" className="btn-primary text-sm px-6 py-3 rounded-xl font-700">
                Mulai Sekarang <ArrowRight size={16} />
              </Link>
              <Link to="/#simulasi" className="btn-secondary text-sm px-6 py-3 rounded-xl font-600">
                Coba Simulasi
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            {STATS.map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="text-center p-5 bg-white border border-slate-100 rounded-2xl shadow-card">
                <p className="text-2xl font-900 text-slate-900 tracking-tight">{s.value}</p>
                <p className="text-xs text-slate-500 font-500 mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-slate-50/60" id="layanan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-700 text-emerald-600 uppercase tracking-widest mb-2">Layanan Kami</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-800 text-slate-900 tracking-tight">Dua Solusi, Satu Platform</motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* MansLater */}
            <motion.div
              className="relative bg-white rounded-3xl p-8 border border-slate-100 shadow-card overflow-hidden group hover:shadow-premium transition-shadow duration-300"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-50 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full text-emerald-700 text-xs font-700 mb-5">
                  <Zap size={12} fill="currentColor" />
                  MansLater
                </div>
                <h3 className="text-2xl font-800 text-slate-900 tracking-tight mb-3">Pinjaman Online Cepat</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Ajukan pinjaman online hingga Rp 50 juta. Proses digital penuh, tenor fleksibel 1–9 bulan, tanpa agunan fisik.
                </p>
                <ul className="space-y-2.5 mb-7">
                  {['Bunga transparan mulai 5%/bulan', 'Tenor 1, 3, 6, 9 bulan', 'Pencairan 1x24 jam kerja', 'Reward bunga turun untuk pelanggan loyal'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/manslater" className="btn-primary text-sm px-5 py-2.5 inline-flex rounded-xl">
                  Ajukan Pinjaman <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>

            {/* MansGadai */}
            <motion.div
              className="relative bg-slate-900 rounded-3xl p-8 overflow-hidden group hover:shadow-premium transition-shadow duration-300"
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-900/30 to-transparent rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-900/50 rounded-full text-emerald-400 text-xs font-700 mb-5">
                  <Shield size={12} />
                  MansGadai
                </div>
                <h3 className="text-2xl font-800 text-white tracking-tight mb-3">Gadai Online Profesional</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Gadaikan aset berharga Anda secara online. Kami jemput barang ke lokasi Anda dan cairkan dana dalam 24 jam.
                </p>
                <ul className="space-y-2.5 mb-7">
                  {['Jemput barang ke lokasi Anda', 'Aset tersimpan aman di warehouse', 'Bisa diperpanjang kapan saja', 'Barang kembali setelah lunas'].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-800/50 flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/mansgadai" className="inline-flex items-center gap-2 text-sm font-700 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors">
                  Ajukan Gadai <ArrowRight size={14} />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Loan Simulator */}
      <section className="py-20" id="simulasi">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-700 text-emerald-600 uppercase tracking-widest mb-2">Simulasi</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-800 text-slate-900 tracking-tight">Hitung Pinjaman Anda</motion.h2>
            <motion.p variants={fadeUp} className="text-slate-500 text-sm mt-2">Kalkulasi cicilan dan total biaya secara real-time</motion.p>
          </motion.div>
          <LoanSimulator />
        </div>
      </section>

      {/* Gadai Simulator */}
      <section className="py-20 bg-slate-50/60" id="gadai-simulasi">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-700 text-emerald-600 uppercase tracking-widest mb-2">Simulasi Gadai</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-800 text-slate-900 tracking-tight">Hitung Nilai Gadai</motion.h2>
          </motion.div>
          <GadaiSimulator />
        </div>
      </section>

      {/* Features */}
      <section className="py-20" id="keunggulan">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-700 text-emerald-600 uppercase tracking-widest mb-2">Keunggulan</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-800 text-slate-900 tracking-tight">Mengapa MansGroup?</motion.h2>
          </motion.div>
          <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fadeUp} className="card-premium p-6 group">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <Icon size={19} className="text-emerald-600" />
                </div>
                <h3 className="text-sm font-700 text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-700 text-emerald-600 uppercase tracking-widest mb-2">Testimoni</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-800 text-slate-900 tracking-tight">Apa Kata Mereka?</motion.h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <motion.div key={t.name} className="card-premium p-6" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400" fill="#FBBF24" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-xs font-700">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-700 text-slate-900">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-700 text-emerald-600 uppercase tracking-widest mb-2">FAQ</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl font-800 text-slate-900 tracking-tight">Pertanyaan Umum</motion.h2>
          </motion.div>
          <div className="space-y-3">
            {FAQS.map((item) => <FAQItem key={item.q} {...item} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,183,136,0.15),transparent)]" />
            <div className="relative">
              <p className="text-emerald-400 text-xs font-700 uppercase tracking-widest mb-4">Mulai Sekarang</p>
              <h2 className="text-3xl sm:text-4xl font-900 text-white tracking-tight mb-4">
                Siap Wujudkan Kebutuhan<br />Finansial Anda?
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                Daftar gratis, ajukan dalam menit, dan rasakan kemudahan fintech modern bersama MansGroup.
              </p>
              <Link to="/auth/register" className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-700 text-sm px-8 py-3.5 rounded-xl transition-colors">
                Daftar Gratis Sekarang <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
