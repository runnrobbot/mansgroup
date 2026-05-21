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
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-500 text-slate-400 pointer-events-none select-none leading-none z-10">
            {prefix}
          </span>
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
          style={prefix ? { paddingLeft: '2.5rem' } : undefined}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none select-none leading-none z-10">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
})

// ─── Currency Input ────────────────────────────────────────────────────────────
// Renders as a flex container that LOOKS like an input (border, rounded, focus ring).
// "Rp" is a true flex child — no absolute positioning, no padding override conflicts.
// Auto-formats IDR: typing 5000000 shows "5.000.000"
// onChange receives raw number (not string).
// Works with react-hook-form: onChange={v => setValue('field', v)}

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
    if (n === '' || n === null || n === undefined) return ''
    const num = typeof n === 'string' ? parseInt(n.replace(/\./g, '').replace(/,/g, ''), 10) : Number(n)
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('id-ID').format(num)
  }

  const [display, setDisplay] = useState(() => fmt(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setDisplay(fmt(value))
  }, [value, focused])

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
    const num = raw ? parseInt(raw, 10) : 0
    let clamped = num
    if (max !== undefined && num > max) clamped = max
    setDisplay(raw ? fmt(clamped) : '')
    onChange?.(clamped)
  }

  const handleBlur = () => {
    setFocused(false)
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
      {/* Outer div acts as the styled "input" — flex row with Rp + actual input */}
      <div
        className={cn(
          'currency-field',
          focused && 'currency-field-focus',
          error && 'currency-field-error',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {/* Rp prefix — natural flex child, visually separated */}
        <span className="currency-field-prefix">Rp</span>
        <input
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="currency-field-input"
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
          'input-field appearance-none bg-no-repeat bg-[right_12px_center] pr-9',
          error && 'border-red-400',
          className
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`
        }}
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
        className={cn('input-field resize-none', error && 'border-red-400', className)}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
})