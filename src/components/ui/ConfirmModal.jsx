import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, LogOut, X, Info } from 'lucide-react'

// ─── ConfirmModal component ────────────────────────────────────────────────────
// Usage with useConfirm hook (preferred):
//   const confirm = useConfirm()
//   const ok = await confirm({ title: 'Hapus?', message: 'Data akan dihapus.', variant: 'danger' })
//   if (ok) { ... }
//
// Standalone usage:
//   <ConfirmModal isOpen={open} onConfirm={handleConfirm} onCancel={() => setOpen(false)} ... />

const VARIANTS = {
    danger: { icon: Trash2, iconBg: 'bg-red-50', iconColor: 'text-red-500', btn: 'bg-red-500 hover:bg-red-600 text-white' },
    warning: { icon: AlertTriangle, iconBg: 'bg-amber-50', iconColor: 'text-amber-500', btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
    info: { icon: Info, iconBg: 'bg-blue-50', iconColor: 'text-blue-500', btn: 'bg-blue-500 hover:bg-blue-600 text-white' },
    logout: { icon: LogOut, iconBg: 'bg-red-50', iconColor: 'text-red-500', btn: 'bg-red-500 hover:bg-red-600 text-white' },
}

export function ConfirmModal({
    isOpen,
    onConfirm,
    onCancel,
    title = 'Konfirmasi',
    message,
    confirmLabel = 'Ya, Lanjutkan',
    cancelLabel = 'Batal',
    variant = 'danger',
    loading = false,
}) {
    const v = VARIANTS[variant] || VARIANTS.danger
    const Icon = v.icon

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 16 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between p-5 pb-0">
                                <div className={`w-10 h-10 rounded-xl ${v.iconBg} flex items-center justify-center flex-shrink-0`}>
                                    <Icon size={18} className={v.iconColor} />
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 pt-3 pb-5">
                                <h3 className="text-base font-700 text-slate-900 mt-1">{title}</h3>
                                {message && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{message}</p>}
                            </div>

                            {/* Footer */}
                            <div className="flex gap-2.5 px-5 pb-5">
                                <button
                                    onClick={onCancel}
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-600 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-600 transition-colors ${v.btn} disabled:opacity-60 flex items-center justify-center gap-2`}
                                >
                                    {loading && <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                                    {confirmLabel}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

// ─── useConfirm hook ───────────────────────────────────────────────────────────
// Drop-in replacement for window.confirm, but shows ConfirmModal.
//
// Example:
//   const confirm = useConfirm()
//
//   const handleDelete = async () => {
//     const ok = await confirm({
//       title: 'Hapus Data?',
//       message: 'Data yang dihapus tidak bisa dikembalikan.',
//       confirmLabel: 'Hapus',
//       variant: 'danger',
//     })
//     if (!ok) return
//     await deleteRecord(id)
//   }
//
//   return (
//     <>
//       <button onClick={handleDelete}>Hapus</button>
//       {confirm.modal}   {/* ← render modal outlet */}
//     </>
//   )

export function useConfirm() {
    const [state, setState] = useState({ isOpen: false, options: {} })
    const resolveRef = useRef(null)

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            resolveRef.current = resolve
            setState({ isOpen: true, options })
        })
    }, [])

    const handleConfirm = useCallback(() => {
        setState(s => ({ ...s, isOpen: false }))
        resolveRef.current?.(true)
    }, [])

    const handleCancel = useCallback(() => {
        setState(s => ({ ...s, isOpen: false }))
        resolveRef.current?.(false)
    }, [])

    confirm.modal = (
        <ConfirmModal
            isOpen={state.isOpen}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            {...state.options}
        />
    )

    return confirm
}