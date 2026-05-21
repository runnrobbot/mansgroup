import { Navbar } from '../../components/layout/Navbar'
import { Footer } from '../../components/layout/Footer'

export default function TermsPage() {
  return (
    <div className='min-h-screen bg-white'>
      <Navbar />
      <div className='max-w-3xl mx-auto px-4 sm:px-6 py-28'>
        <h1 className='text-3xl font-800 text-slate-900 mb-2'>Syarat & Ketentuan</h1>
        <p className='text-slate-400 text-sm mb-8'>Terakhir diperbarui: 1 Januari 2026</p>
        <div className='prose prose-slate max-w-none space-y-6 text-sm text-slate-600 leading-relaxed'>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>1. Penerimaan Syarat</h2>
            <p>Dengan menggunakan layanan MansGroup, Anda menyetujui syarat dan ketentuan yang berlaku. Harap baca dengan cermat sebelum menggunakan platform kami.</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>2. Layanan</h2>
            <p>MansGroup menyediakan layanan pinjaman online melalui MansLater dan gadai online melalui MansGadai. Kami beroperasi sesuai regulasi OJK yang berlaku.</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>3. Ketentuan Pengguna</h2>
            <p>Pengguna wajib berusia minimal 18 tahun, memiliki KTP yang valid, dan memberikan data yang benar serta dapat dipertanggungjawabkan.</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>4. Bunga & Denda</h2>
            <p>Bunga pinjaman/gadai adalah 5% per bulan. Keterlambatan pembayaran dikenakan denda 2% per hari pada minggu pertama, dan bertambah 1% setiap minggu berikutnya.</p>
          </section>
          <section>
            <h2 className='text-base font-700 text-slate-900 mb-2'>5. Privasi Data</h2>
            <p>Seluruh data pengguna dikelola sesuai Kebijakan Privasi MansGroup dan regulasi perlindungan data yang berlaku di Indonesia.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
