import { useState } from 'react'
import { BANKS, MANSGADAI_CONFIG } from '../../lib/constants'
import { CurrencyInput } from '../ui/Input'
import { calculateGadaiSimulation, formatIDR } from '../../lib/utils'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export function GadaiSimulator() {
  const [amount, setAmount] = useState(3000000)
  const [bank, setBank] = useState('OTHER')

  const result = calculateGadaiSimulation(amount, bank)

  return (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <div className="card-premium p-7">
        <h3 className="text-base font-700 text-slate-900 mb-6">Nilai Gadai</h3>
        <div className="space-y-6">
          <div>
            <label className="label-field">Estimasi Nilai Barang / Pinjaman</label>
            <CurrencyInput
              value={amount}
              onChange={v => setAmount(Math.max(MANSGADAI_CONFIG.MIN_AMOUNT, Math.min(MANSGADAI_CONFIG.MAX_AMOUNT, v)))}
              min={MANSGADAI_CONFIG.MIN_AMOUNT}
              max={MANSGADAI_CONFIG.MAX_AMOUNT}
            />
            <input
              type="range"
              min={500000}
              max={100000000}
              step={500000}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full mt-3 accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>Rp 500K</span>
              <span className="font-600 text-emerald-700">{formatIDR(amount)}</span>
              <span>Rp 100Jt</span>
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
          <div className="p-4 bg-slate-50 rounded-xl">
            <p className="text-xs font-700 text-slate-600 mb-2">Ketentuan Gadai:</p>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li>• Periode gadai 1 bulan</li>
              <li>• Dapat diperpanjang +10% dari nilai pinjaman</li>
              <li>• Toleransi 7 hari setelah jatuh tempo</li>
              <li>• Barang kembali setelah pelunasan</li>
            </ul>
          </div>
        </div>
      </div>

      <motion.div
        className="card-premium p-7"
        key={`${amount}-${bank}`}
        initial={{ opacity: 0.7, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <h3 className="text-base font-700 text-slate-900 mb-6">Ringkasan Gadai</h3>
        <div className="space-y-3.5">
          {[
            { label: 'Nilai Pinjaman', value: formatIDR(result.principal) },
            { label: 'Bunga (5%/bulan)', value: formatIDR(result.interest) },
            { label: 'Biaya Admin', value: formatIDR(result.platformFee) },
            { label: 'Dana Diterima (Bersih)', value: formatIDR(result.netDisbursement), highlight: true },
            { label: 'Total Pelunasan', value: formatIDR(result.totalRepayment), emphasis: true },
            { label: 'Biaya Perpanjangan', value: formatIDR(result.extensionFee) },
            { label: 'Jatuh Tempo', value: result.dueDate },
            { label: 'Batas Toleransi', value: result.toleranceDeadline },
          ].map(({ label, value, emphasis, highlight }) => (
            <div
              key={label}
              className={`flex items-center justify-between py-2.5 ${emphasis || highlight ? 'border-t border-slate-100' : ''} ${highlight ? 'bg-emerald-50 -mx-3 px-3 rounded-xl' : ''}`}
            >
              <span className={`text-sm ${highlight ? 'text-emerald-800 font-700' : 'text-slate-500'}`}>{label}</span>
              <span className={`text-sm font-700 ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 p-4 bg-red-50 rounded-xl border border-red-100">
          <p className="text-xs text-red-700 leading-relaxed flex items-start gap-2">
            <AlertTriangle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />
            <span><span className="font-700">Penting:</span> Jika melewati batas toleransi, barang menjadi hak milik MansGroup sesuai perjanjian gadai yang telah disetujui.</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}