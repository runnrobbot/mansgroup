import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { Loader2 } from 'lucide-react'

const sizeMap = {
  sm: 'px-3 py-2 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-[10px] gap-2',
  lg: 'px-6 py-3 text-sm rounded-xl gap-2',
  xl: 'px-8 py-4 text-base rounded-xl gap-2.5',
}

const variantMap = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'bg-red-500 text-white border-none rounded-[10px] hover:bg-red-600 transition-all cursor-pointer font-600 inline-flex items-center gap-2',
  warning: 'bg-amber-500 text-white border-none rounded-[10px] hover:bg-amber-600 transition-all cursor-pointer font-600 inline-flex items-center gap-2',
  outline: 'bg-transparent text-slate-700 border-1.5 border-slate-200 rounded-[10px] hover:bg-slate-50 transition-all cursor-pointer font-600 inline-flex items-center gap-2',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    onClick,
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      ref={ref}
      type={type}
      className={cn(
        variantMap[variant] || variantMap.primary,
        sizeMap[size] || sizeMap.md,
        isDisabled && 'opacity-60 cursor-not-allowed pointer-events-none',
        className
      )}
      onClick={onClick}
      disabled={isDisabled}
      whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 13 : size === 'lg' ? 17 : 15} />
      ) : null}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 13 : 15} />}
    </motion.button>
  )
})
