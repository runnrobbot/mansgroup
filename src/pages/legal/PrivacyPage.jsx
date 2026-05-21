import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className='min-h-screen bg-white'>
      <Navbar />
      <div className='max-w-3xl mx-auto px-4 sm:px-6 py-28'>
        <h1 className='text-3xl font-800 text-slate-900 mb-2'>Kebijakan Privasi</h1>
        <p className='text-slate-400 text-sm mb-8'>Terakhir diperbarui: 1 Januari 2026</p>
        <div className='space-y-6 text-sm text-slate-600 leading-relaxed'>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>1. Data yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan data identitas (nama, NIK, KTP), data kontak (email, nomor HP), data finansial (rekening bank, penghasilan), dan data dokumen (foto KTP, selfie).</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>2. Penggunaan Data</h2>
            <p>Data digunakan untuk verifikasi identitas, proses pengajuan pinjaman/gadai, pencegahan penipuan, dan peningkatan layanan kami.</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>3. Keamanan Data</h2>
            <p>Seluruh data dienkripsi menggunakan standar industri. Kami tidak pernah menjual atau membagikan data pribadi Anda kepada pihak ketiga tanpa persetujuan.</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>4. Hak Pengguna</h2>
            <p>Anda berhak mengakses, memperbaiki, atau menghapus data pribadi Anda dengan menghubungi tim kami di cs@mansgroup.id.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
