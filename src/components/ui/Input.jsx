import { forwardRef, useState, useEffect, useId, useRef } from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown, Check, Search } from 'lucide-react'

// ─── Text Input ───────────────────────────────────────────────────────────────
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

// ─── Currency Input ───────────────────────────────────────────────────────────
export function CurrencyInput({
  label, error, hint, value, onChange, min, max,
  required, disabled, placeholder = '0', className, wrapperClassName, name,
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
      <div className={cn(
        'currency-field',
        focused && 'currency-field-focus',
        error && 'currency-field-error',
        disabled && 'opacity-60 cursor-not-allowed'
      )}>
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

// ─── Native Select (simple, for forms) ───────────────────────────────────────
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

// ─── Custom Select (Beautiful animated dropdown) ──────────────────────────────
// options: [{ value, label, sublabel?, icon? }]
// searchable: adds a search box when true
export function CustomSelect({
  label, error, hint,
  placeholder = 'Pilih...',
  options = [],
  value, onChange,
  required, searchable = false,
  wrapperClassName, disabled = false,
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  const selected = options.find(o => o.value === value)

  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel?.toLowerCase() || '').includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt) => {
    onChange?.(opt.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={cn('flex flex-col gap-1.5 relative', wrapperClassName)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="label-field">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        className={cn(
          'input-field text-left flex items-center justify-between gap-2',
          open && 'border-emerald-500 shadow-[0_0_0_3px_rgba(82,183,136,0.12)]',
          error && 'border-red-400',
          disabled && 'opacity-60 cursor-not-allowed bg-slate-50',
        )}
      >
        <span className={cn('flex items-center gap-2.5 flex-1 min-w-0 text-sm', !selected && 'text-slate-400')}>
          {selected?.icon && <span className="flex-shrink-0 text-base leading-none">{selected.icon}</span>}
          <span className="truncate font-500">{selected ? selected.label : placeholder}</span>
          {selected?.sublabel && (
            <span className="text-xs text-slate-400 truncate hidden sm:block">{selected.sublabel}</span>
          )}
        </span>
        <ChevronDown
          size={14}
          className={cn('flex-shrink-0 text-slate-400 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={cn(
          'absolute top-full left-0 right-0 z-[100] mt-1.5',
          'bg-white border border-slate-200 rounded-xl',
          'shadow-xl shadow-slate-200/80',
          'overflow-hidden',
        )}>
          {searchable && (
            <div className="p-2.5 border-b border-slate-100">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari..."
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                />
              </div>
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-sm text-slate-400 text-center">Tidak ditemukan</li>
            ) : filtered.map(opt => {
              const isSelected = opt.value === value
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors',
                      isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50',
                    )}
                  >
                    {opt.icon !== undefined && (
                      <span className="flex-shrink-0 w-5 text-center text-base leading-none">{opt.icon}</span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className={cn(
                        'block text-sm',
                        isSelected ? 'text-emerald-700 font-600' : 'text-slate-800 font-500'
                      )}>
                        {opt.label}
                      </span>
                      {opt.sublabel && (
                        <span className="block text-xs text-slate-400 mt-0.5">{opt.sublabel}</span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="text-emerald-600 flex-shrink-0" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-500">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
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
