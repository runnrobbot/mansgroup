import { useState } from 'react'
import { BANKS, MANSLATER_CONFIG } from '../../lib/constants'
import { CurrencyInput } from '../ui/Input'
import { calculateLoanSimulation, formatIDR } from '../../lib/utils'
import { motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'

export function LoanSimulator() {
  const [amount, setAmount] = useState(5000000)
  const [tenor, setTenor] = useState(3)
  const [bank, setBank] = useState('OTHER')

  const result = calculateLoanSimulation(amount, tenor, bank)

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      {/* Input */}
      <div className="card-premium p-7">
        <h3 className="text-base font-700 text-slate-900 mb-6">Konfigurasi Pinjaman</h3>
        <div className="space-y-6">
          <div>
            <label className="label-field">Jumlah Pinjaman</label>
            <CurrencyInput
              value={amount}
              onChange={v => setAmount(Math.max(MANSLATER_CONFIG.MIN_AMOUNT, Math.min(MANSLATER_CONFIG.MAX_AMOUNT, v)))}
              min={MANSLATER_CONFIG.MIN_AMOUNT}
              max={MANSLATER_CONFIG.MAX_AMOUNT}
            />
            <input
              type="range"
              min={500000}
              max={50000000}
              step={500000}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full mt-3 accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Rp 500K</span>
              <span className="font-600 text-emerald-700">{formatIDR(amount)}</span>
              <span>Rp 50Jt</span>
            </div>
          </div>

          <div>
            <label className="label-field">Tenor</label>
            <div className="grid grid-cols-4 gap-2">
              {MANSLATER_CONFIG.TENORS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTenor(t)}
                  className={`py-2.5 rounded-xl text-sm font-600 border transition-all ${tenor === t
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                >
                  {t} Bln
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-field">Bank Tujuan</label>
            <select value={bank} onChange={e => setBank(e.target.value)} className="input-field">
              {BANKS.map(b => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Result */}
      <motion.div
        className="card-premium p-7"
        key={`${amount}-${tenor}-${bank}`}
        initial={{ opacity: 0.7, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <h3 className="text-base font-700 text-slate-900 mb-6">Ringkasan Pinjaman</h3>
        <div className="space-y-3.5">
          {[
            { label: 'Jumlah Pinjaman', value: formatIDR(result.principal), emphasis: false },
            { label: 'Bunga per Bulan', value: `${result.interestRate}%`, emphasis: false },
            { label: 'Total Bunga', value: formatIDR(result.totalInterest), emphasis: false },
            { label: 'Biaya Admin', value: formatIDR(result.platformFee), emphasis: false },
            { label: 'Cicilan per Bulan', value: formatIDR(result.monthlyInstallment), emphasis: true },
            { label: 'Total yang Dibayar', value: formatIDR(result.totalRepayment), emphasis: false },
            { label: 'Dana Diterima (Bersih)', value: formatIDR(result.netDisbursement), emphasis: true, highlight: true },
          ].map(({ label, value, emphasis, highlight }) => (
            <div
              key={label}
              className={`flex items-center justify-between py-2.5 ${emphasis || highlight ? 'border-t border-slate-100 mt-1' : ''} ${highlight ? 'bg-emerald-50 -mx-3 px-3 rounded-xl' : ''}`}
            >
              <span className={`text-sm ${highlight ? 'text-emerald-800 font-700' : 'text-slate-500'}`}>{label}</span>
              <span className={`text-sm font-700 ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs text-amber-700 leading-relaxed flex items-start gap-2">
            <Lightbulb size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <span><span className="font-700">Tip Reward:</span> Bayar tepat waktu pada pinjaman pertama, bunga Anda turun ke <strong>2.5%/bulan</strong> untuk pinjaman berikutnya!</span>
          </p>
        </div>

        {/* Schedule */}
        <div className="mt-5">
          <p className="text-xs font-700 text-slate-500 uppercase tracking-wider mb-3">Jadwal Cicilan</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {result.schedule.map(s => (
              <div key={s.month} className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-500">Bulan {s.month} · {s.dueDate}</span>
                <span className="font-600 text-slate-700">{formatIDR(s.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}