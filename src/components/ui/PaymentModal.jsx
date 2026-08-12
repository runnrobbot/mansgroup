import { useEffect, useState } from 'react'
import { Modal, ModalBody, ModalHeader } from '../../components/ui/Modal'
import { getPaymentChannels, createPayment, getChannelLabel, formatAmount } from '../../services/sakurupiah'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { generateRefNumber } from '../../lib/utils'

// QRIS is cheapest, show first
const PREFERRED_CHANNELS = ['QRIS', 'QRISC', 'BCAVA', 'BRIVA', 'BNIVA', 'MANDIRIVA']

function ChannelBadge({ code, selected, onSelect, channel }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(code)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
        selected
          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <div>
        <p className="text-sm font-600 text-slate-900">{getChannelLabel(code)}</p>
        {channel && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            Min {formatAmount(Number(channel.minimal))}
            {Number(channel.biaya) > 0 && ` · Fee ${channel.biaya}%`}
          </p>
        )}
      </div>
      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
        selected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
      }`}>
        {selected && (
          <svg viewBox="0 0 12 12" className="text-white">
            <path fill="currentColor" d="M10.28 2.28a.75.75 0 00-1.06-1.06l-4.5 4.5-1.97-1.97a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l5.03-5.03z"/>
          </svg>
        )}
      </div>
    </button>
  )
}

export function PaymentModal({
  open,
  onClose,
  paymentId,       // Pre-created payment record ID
  loanId,
  gadaiId,
  userId,
  amount,
  description,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
}) {
  const [step, setStep] = useState('channel') // channel | loading | result
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [paymentResult, setPaymentResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(true)

  // Reset on open
  useEffect(() => {
    if (!open) return
    setStep('channel')
    setPaymentResult(null)
    setSelectedChannel(null)
    setLoadingChannels(true)

    getPaymentChannels()
      .then(chs => {
        const sorted = [...chs].sort((a, b) => {
          const ai = PREFERRED_CHANNELS.indexOf(a.kode)
          const bi = PREFERRED_CHANNELS.indexOf(b.kode)
          if (ai === -1 && bi === -1) return 0
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        })
        setChannels(sorted)
        if (sorted.find(c => c.kode === 'QRIS')) setSelectedChannel('QRIS')
      })
      .catch(() => setChannels([]))
      .finally(() => setLoadingChannels(false))
  }, [open])

  const handlePay = async () => {
    if (!selectedChannel) {
      toast.error('Pilih metode pembayaran terlebih dahulu')
      return
    }
    setLoading(true)
    setStep('loading')

    try {
      const merchantRef = generateRefNumber('MG')

      // Create payment record via Supabase directly (edge function creates one too,
      // but we need the ID first to track)
      const { data: paymentRecord, error: insertErr } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          loan_id: loanId || null,
          gadai_id: gadaiId || null,
          amount,
          payment_type: loanId ? 'repayment' : (gadaiId ? 'extension' : 'repayment'),
          payment_method: 'sakurupiah',
          sakurupiah_ref: merchantRef,
          status: 'pending',
        })
        .select()
        .single()

      if (insertErr || !paymentRecord) {
        throw new Error(insertErr?.message || 'Gagal membuat record pembayaran')
      }

      const result = await createPayment({
        payment_id: paymentRecord.id,
        merchant_ref: merchantRef,
        method: selectedChannel,
        amount,
        phone: customerPhone,
        name: customerName,
        email: customerEmail,
        description: description || 'Pembayaran MansGroup',
        return_url: window.location.href,
      })

      setPaymentResult(result)
      setStep('result')
    } catch (err) {
      toast.error(err.message || 'Gagal membuat pembayaran')
      setStep('channel')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenPayment = () => {
    if (paymentResult?.checkout_url) {
      window.open(paymentResult.checkout_url, '_blank')
    }
  }

  const handleClose = () => {
    setStep('channel')
    setPaymentResult(null)
    onClose()
  }

  const selectedChannelData = channels.find(c => c.kode === selectedChannel)

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader onClose={handleClose}>
        <div>
          <h3 className="text-base font-700 text-slate-900">Metode Pembayaran</h3>
          <p className="text-xs text-slate-500 mt-0.5">Total: <span className="font-700 text-emerald-700">{formatAmount(amount)}</span></p>
        </div>
      </ModalHeader>
      <ModalBody className="p-5">
        {/* Channel Selection */}
        {step === 'channel' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 mb-3">Pilih metode pembayaran:</p>
            {loadingChannels ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Memuat metode pembayaran...</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {channels.map(ch => (
                    <ChannelBadge
                      key={ch.kode}
                      code={ch.kode}
                      channel={ch}
                      selected={selectedChannel === ch.kode}
                      onSelect={setSelectedChannel}
                    />
                  ))}
                </div>
                <button
                  onClick={handlePay}
                  disabled={!selectedChannel}
                  className="btn-primary w-full justify-center py-3 rounded-xl mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Bayar Sekarang
                </button>
              </>
            )}
          </div>
        )}

        {/* Loading */}
        {step === 'loading' && (
          <div className="py-12 text-center">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-600 text-slate-900">Membuat pembayaran...</p>
            <p className="text-xs text-slate-500 mt-1">Mohon tunggu sebentar</p>
          </div>
        )}

        {/* Result */}
        {step === 'result' && paymentResult && (
          <div className="space-y-4">
            {/* Success header */}
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-700 text-emerald-800">Pembayaran Dibuat!</p>
              <p className="text-xs text-emerald-600 mt-0.5">Ref: {paymentResult.merchant_ref}</p>
            </div>

            {/* QRIS */}
            {selectedChannel?.startsWith('QRIS') && paymentResult?.qr_string && (
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-3">Scan QR Code berikut dengan aplikasi e-wallet atau m-banking:</p>
                <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentResult.qr_string)}`}
                    alt="QRIS"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                {paymentResult.expired && (
                  <p className="text-xs text-slate-400 mt-2">Berlaku sampai: {new Date(paymentResult.expired).toLocaleString('id-ID')}</p>
                )}
              </div>
            )}

            {/* VA Number */}
            {selectedChannel?.endsWith('VA') && paymentResult?.payment_no && (
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-3">Salin nomor Virtual Account berikut:</p>
                <div className="bg-slate-900 rounded-xl p-4 text-center">
                  <p className="text-2xl font-800 text-white tracking-widest font-mono">{paymentResult.payment_no}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {getChannelLabel(selectedChannel)} · {paymentResult.expired && `Berlaku sampai ${new Date(paymentResult.expired).toLocaleString('id-ID')}`}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              {paymentResult?.checkout_url && (
                <button
                  onClick={handleOpenPayment}
                  className="btn-primary w-full justify-center py-3 rounded-xl"
                >
                  Buka Halaman Pembayaran
                </button>
              )}
              <button onClick={handleClose} className="btn-ghost w-full justify-center py-2.5 text-sm">
                Tutup
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Pembayaran akan diproses secara otomatis. Jangan tutup halaman ini sampai pembayaran selesai.
            </p>
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}
