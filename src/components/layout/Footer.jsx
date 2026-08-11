import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Building2, Lock, ShieldCheck } from 'lucide-react'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <img src="/mansgroup.png" alt="MansGroup" className="h-9 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed mb-5">
              Platform fintech Indonesia yang menghadirkan layanan pinjaman dan gadai online modern, aman, dan terpercaya.
            </p>
            <div className="flex items-center gap-2">
              <a
                href="https://instagram.com/mans.group.official"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-pink-600 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Layanan */}
          <div>
            <h4 className="text-sm font-700 text-white mb-4">Layanan</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'MansLater — Pinjaman Online', href: '/manslater' },
                { label: 'MansGadai — Gadai Online', href: '/mansgadai' },
                { label: 'Simulasi Pinjaman', href: '/#simulasi' },
                { label: 'Simulasi Gadai', href: '/#gadai-simulasi' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-sm hover:text-emerald-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="text-sm font-700 text-white mb-4">Hubungi Kami</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm">
                <MapPin size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Jakarta Selatan, DKI Jakarta, Indonesia</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Mail size={14} className="text-emerald-500 flex-shrink-0" />
                <a href="mailto:mans.group.official@gmail.com" className="hover:text-emerald-400 transition-colors">
                  mans.group.official@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2.5 text-sm">
                <Phone size={14} className="text-emerald-500 flex-shrink-0" />
                <a href="tel:+6281234567890" className="hover:text-emerald-400 transition-colors">
                  +62 812-3456-7890
                </a>
              </li>
            </ul>

            <div className="mt-5 p-3.5 bg-slate-800 rounded-xl">
              <p className="text-xs font-600 text-white mb-0.5">Jam Operasional</p>
              <p className="text-xs">Senin – Jumat: 08.00 – 17.00 WIB</p>
            </div>
          </div>
        </div>

        {/* Legal badges */}
        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700">
                <Building2 size={11} className="text-emerald-400" /> Terdaftar OJK
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700">
                <Lock size={11} className="text-emerald-400" /> SSL Secured
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700">
                <ShieldCheck size={11} className="text-emerald-400" /> Data Terenkripsi
              </span>
            </div>
            <p className="text-xs">
              © {year} PT MansGroup Finansial Indonesia. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
