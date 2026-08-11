// Role constants — matches Supabase profiles.role column
export const ROLES = {
  USER: 'user',
  STAFF: 'staff',
  ADMIN: 'admin',
  FOUNDER: 'founder',
}

// MansLater loan config
export const MANSLATER_CONFIG = {
  TENORS: [1, 3, 6, 9], // months
  INTEREST_RATE: 0.05, // 5% per month
  REWARD_INTEREST_RATE: 0.025, // 2.5% per month for on-time borrowers
  LATE_PENALTY: {
    WEEK_1_DAILY: 0.02,       // 2% per day week 1
    SUBSEQUENT_WEEKLY_ADD: 0.01, // +1% each subsequent week
  },
  PLATFORM_FEE: {
    BCA_MANDIRI: 0.025, // 2.5%
    OTHER: 0.05,        // 5%
  },
  MIN_AMOUNT: 500_000,
  MAX_AMOUNT: 50_000_000,
}

// MansGadai config
export const MANSGADAI_CONFIG = {
  INTEREST_RATE: 0.05,       // 5% per month
  EXTENSION_FEE: 0.10,       // 10% of loan amount
  TOLERANCE_DAYS: 7,         // 7 days after due date before forfeiture
  PLATFORM_FEE: {
    BCA_MANDIRI: 0.025,
    OTHER: 0.05,
  },
  MIN_AMOUNT: 500_000,
  MAX_AMOUNT: 100_000_000,
}

// Indonesian banks list
export const BANKS = [
  { code: 'BCA', name: 'Bank Central Asia (BCA)', premium: true },
  { code: 'MANDIRI', name: 'Bank Mandiri', premium: true },
  { code: 'BRI', name: 'Bank Rakyat Indonesia (BRI)', premium: false },
  { code: 'BNI', name: 'Bank Negara Indonesia (BNI)', premium: false },
  { code: 'CIMB', name: 'CIMB Niaga', premium: false },
  { code: 'BTN', name: 'Bank Tabungan Negara (BTN)', premium: false },
  { code: 'DANAMON', name: 'Bank Danamon', premium: false },
  { code: 'PERMATA', name: 'Bank Permata', premium: false },
  { code: 'OCBC', name: 'OCBC NISP', premium: false },
  { code: 'PANIN', name: 'Bank Panin', premium: false },
  { code: 'MEGA', name: 'Bank Mega', premium: false },
  { code: 'JAGO', name: 'Bank Jago', premium: false },
  { code: 'SEABANK', name: 'SeaBank', premium: false },
  { code: 'ALLO', name: 'Allo Bank', premium: false },
  { code: 'OTHER', name: 'Bank Lainnya', premium: false },
]

// Collateral categories for MansGadai
export const COLLATERAL_CATEGORIES = [
  { value: 'electronics', label: 'Elektronik (HP, Laptop, dll)' },
  { value: 'jewelry', label: 'Perhiasan (Emas, Berlian, dll)' },
  { value: 'vehicle', label: 'Kendaraan (Motor, Mobil)' },
  { value: 'stnk_bpkb', label: 'STNK / BPKB' },
  { value: 'watch', label: 'Jam Tangan Mewah' },
  { value: 'bags', label: 'Tas Branded' },
  { value: 'property_cert', label: 'Sertifikat Properti' },
  { value: 'other', label: 'Lainnya' },
]

// Navigation items per role
export const NAV_ITEMS = {
  user: [
    { path: '/dashboard', label: 'Beranda', icon: 'Home' },
    { path: '/dashboard/loans', label: 'Pinjaman Saya', icon: 'CreditCard' },
    { path: '/dashboard/gadai', label: 'Gadai Saya', icon: 'Package' },
    { path: '/dashboard/payments', label: 'Pembayaran', icon: 'Receipt' },
    { path: '/dashboard/profile', label: 'Profil', icon: 'User' },
  ],
  staff: [
    { path: '/staff', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/staff/review-queue', label: 'Antrian Review', icon: 'ClipboardList' },
    { path: '/staff/gadai-pickup', label: 'Penjemputan Gadai', icon: 'Truck' },
    { path: '/staff/warehouse', label: 'Warehouse', icon: 'Warehouse' },
  ],
  admin: [
    { path: '/admin', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/admin/approvals', label: 'Final Approval', icon: 'CheckCircle' },
    { path: '/admin/users', label: 'Kelola User', icon: 'Users' },
    { path: '/admin/transactions', label: 'Transaksi', icon: 'ArrowLeftRight' },
    { path: '/admin/blacklist', label: 'Blacklist', icon: 'Ban' },
  ],
  founder: [
    { path: '/founder', label: 'Analytics', icon: 'BarChart3' },
    { path: '/founder/revenue', label: 'Revenue', icon: 'TrendingUp' },
    { path: '/founder/loans', label: 'Monitor Pinjaman', icon: 'CreditCard' },
    { path: '/founder/gadai', label: 'Monitor Gadai', icon: 'Package' },
    { path: '/founder/users', label: 'Semua User', icon: 'Users' },
    { path: '/founder/npl', label: 'NPL Monitor', icon: 'AlertOctagon' },
    { path: '/founder/growth', label: 'Growth', icon: 'LineChart' },
  ],
}
