import { cn } from '../../lib/utils'

export function Table({ children, className }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }) {
  return (
    <thead>
      <tr className="border-b border-slate-100">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, className, align = 'left' }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-xs font-700 text-slate-400 uppercase tracking-widest whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </th>
  )
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-50">{children}</tbody>
}

export function Tr({ children, className, onClick }) {
  return (
    <tr
      className={cn(
        'hover:bg-slate-50/60 transition-colors duration-150',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className, align = 'left' }) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 text-slate-700 whitespace-nowrap',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      {children}
    </td>
  )
}

export function EmptyRow({ colSpan, message = 'Tidak ada data' }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg">📭</div>
          <span>{message}</span>
        </div>
      </td>
    </tr>
  )
}

export function TablePagination({ page, totalPages, onPageChange, total, limit }) {
  if (totalPages <= 1) return null
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-slate-400">
        Menampilkan {start}–{end} dari {total} data
      </p>
      <div className="flex items-center gap-1">
        <button
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          ← Sebelumnya
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            className={cn(
              'w-8 h-8 text-xs rounded-lg transition-colors',
              p === page
                ? 'bg-emerald-600 text-white font-600'
                : 'border border-slate-200 hover:bg-slate-50 text-slate-600'
            )}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          Berikutnya →
        </button>
      </div>
    </div>
  )
}
