import { cn } from '../../lib/utils'

const variants = {
  success: 'badge badge-success',
  warning: 'badge badge-warning',
  danger: 'badge badge-danger',
  info: 'badge badge-info',
  gray: 'badge badge-gray',
}

// Map of status → variant
const STATUS_MAP = {
  // Loan statuses
  pending: 'warning',
  review: 'info',
  approved: 'success',
  rejected: 'danger',
  disbursed: 'success',
  overdue: 'danger',
  completed: 'gray',
  blacklisted: 'danger',

  // Gadai
  waiting_pickup: 'warning',
  picked_up: 'info',
  received: 'info',
  active: 'success',
  due: 'warning',
  extended: 'info',
  forfeited: 'danger',

  // Payment
  verification: 'info',
  confirmed: 'success',
  failed: 'danger',
  refunded: 'gray',

  // KYC
  unverified: 'gray',
  verified: 'success',
}

const STATUS_LABELS = {
  pending: 'Menunggu',
  review: 'Dalam Review',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  disbursed: 'Dicairkan',
  overdue: 'Jatuh Tempo',
  completed: 'Selesai',
  blacklisted: 'Diblokir',
  waiting_pickup: 'Tunggu Pickup',
  picked_up: 'Dijemput',
  received: 'Diterima',
  active: 'Aktif',
  due: 'Jatuh Tempo',
  extended: 'Diperpanjang',
  forfeited: 'Dirampas',
  verification: 'Verifikasi',
  confirmed: 'Dikonfirmasi',
  failed: 'Gagal',
  refunded: 'Dikembalikan',
  unverified: 'Belum Verifikasi',
  verified: 'Terverifikasi',
  user: 'User',
  staff: 'Staff',
  admin: 'Admin',
  founder: 'Founder',
}

export function Badge({ children, variant = 'gray', status, className }) {
  const v = status ? (STATUS_MAP[status] || 'gray') : variant
  const label = status ? (STATUS_LABELS[status] || status) : children
  return (
    <span className={cn(variants[v] || variants.gray, className)}>
      {label}
    </span>
  )
}

export function StatusBadge({ status, className }) {
  return <Badge status={status} className={className} />
}

export function RoleBadge({ role, className }) {
  const roleVariant = { user: 'gray', staff: 'info', admin: 'warning', founder: 'success' }
  return (
    <Badge variant={roleVariant[role] || 'gray'} className={className}>
      {STATUS_LABELS[role] || role}
    </Badge>
  )
}
