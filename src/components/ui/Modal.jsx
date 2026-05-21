import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../../lib/utils'

export function Modal({ isOpen, onClose, title, children, size = 'md', className }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className={cn(
                'bg-white rounded-2xl shadow-premium w-full overflow-hidden',
                sizes[size] || sizes.md,
                className
              )}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {(title || onClose) && (
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                  {title && (
                    <h2 className="text-base font-700 text-slate-900 tracking-tight">{title}</h2>
                  )}
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors ml-auto"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              )}
              <div className="overflow-y-auto max-h-[80vh]">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

export function ModalBody({ children, className }) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>
}

export function ModalFooter({ children, className }) {
  return (
    <div className={cn('px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3', className)}>
      {children}
    </div>
  )
}
