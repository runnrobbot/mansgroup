import { forwardRef, useState, useEffect, useId } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef(function Input(
  { label, error, hint, prefix, suffix, className, wrapperClassName, ...props },
  ref
) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="label-field">
          {label}
          {props.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {prefix && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center px-3.5 text-slate-400 pointer-events-none text-sm font-500 select-none z-10">
            {prefix}
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'input-field',
            prefix && 'pl-10',
            suffix && 'pr-10',
            error && 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]',
            className
          )}
          {...props}
        />
        {suffix && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center px-3.5 text-slate-400 pointer-events-none text-sm select-none z-10">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
})

// ─── Currency Input ────────────────────────────────────────────────────────────
// Auto-formats IDR with dots: 5000000 → "5.000.000"
// value / onChange work with raw numbers (not strings).
// Compatible with react-hook-form via setValue: onChange={v => setValue('field', v)}

export function CurrencyInput({
  label,
  error,
  hint,
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = '0',
  className,
  wrapperClassName,
  name,
}) {
  const id = useId()

  const fmt = (n) => {
    const num = typeof n === 'string' ? parseInt(n.replace(/\./g, ''), 10) : Number(n)
    if (!n && n !== 0) return ''
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('id-ID').format(num)
  }

  const [display, setDisplay] = useState(() => fmt(value))

  // Sync display when value changes externally (e.g. form reset, slider)
  useEffect(() => {
    setDisplay(fmt(value))
  }, [value])

  const handleChange = (e) => {
    // Strip dots (thousand separators) and non-digits
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
    const num = raw ? parseInt(raw, 10) : 0

    let clamped = num
    if (min !== undefined && num < min) clamped = min
    if (max !== undefined && num > max) clamped = max

    setDisplay(raw ? fmt(clamped) : '')
    onChange?.(clamped)
  }

  const handleBlur = () => {
    // On blur: if empty set to min or 0
    if (!display) {
      const fallback = min ?? 0
      setDisplay(fmt(fallback))
      onChange?.(fallback)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label htmlFor={id} className="label-field">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {/* Rp prefix with right border separator */}
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-3 pointer-events-none z-10">
          <span className="text-sm font-600 text-slate-500 pr-2.5 border-r border-slate-200 h-5 flex items-center">
            Rp
          </span>
        </div>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'input-field pl-14',
            error && 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]',
            className
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

export const Select = forwardRef(function Select(
  { label, error, hint, className, wrapperClassName, children, ...props },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label className="label-field">
          {label}
          {props.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'input-field appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394A3B8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")] bg-no-repeat bg-[right_12px_center] pr-9',
          error && 'border-red-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className, wrapperClassName, rows = 4, ...props },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label && (
        <label className="label-field">
          {label}
          {props.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'input-field resize-none',
          error && 'border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
})