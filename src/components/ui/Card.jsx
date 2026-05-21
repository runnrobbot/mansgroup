import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

const variants = {
  default: 'card-premium p-6',
  flat: 'bg-white border border-slate-100 rounded-2xl p-6',
  glass: 'glass rounded-2xl p-6',
  ghost: 'bg-slate-50 rounded-2xl p-6',
}

export function Card({ children, className, variant = 'default', animate = false, ...props }) {
  const base = variants[variant] || variants.default

  if (animate) {
    return (
      <motion.div
        className={cn(base, className)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={cn(base, className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={cn('text-base font-700 text-slate-900 tracking-tight', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn('text-sm text-slate-500 mt-0.5', className)} {...props}>
      {children}
    </p>
  )
}

export function StatCard({ label, value, icon: Icon, change, changeType = 'positive', className }) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-600 text-slate-500 uppercase tracking-widest mb-2">{label}</p>
          <p className="text-2xl font-800 text-slate-900 tracking-tight">{value}</p>
          {change && (
            <p className={cn(
              'text-xs font-500 mt-1',
              changeType === 'positive' ? 'text-emerald-600' : 'text-red-500'
            )}>
              {changeType === 'positive' ? '↑' : '↓'} {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-emerald-600" />
          </div>
        )}
      </div>
    </Card>
  )
}
