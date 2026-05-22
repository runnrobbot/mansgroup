import { MANSLATER_CONFIG, MANSGADAI_CONFIG } from './constants'
import { format, addMonths } from 'date-fns'

// Format currency to IDR
export function formatIDR(amount) {
  if (!amount && amount !== 0) return 'Rp -'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date Indonesian
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'dd MMMM yyyy')
}

// Format datetime
export function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm')
}

// Format relative time
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 30) return `${diffDay} hari lalu`
  return formatDate(dateStr)
}

/**
 * Calculate MansLater loan simulation
 * @param {number} amount - principal
 * @param {number} tenor - months
 * @param {string} bankCode - bank code
 * @param {boolean} isReward - reward user (lower interest)
 */
export function calculateLoanSimulation(amount, tenor, bankCode = 'OTHER', isReward = false) {
  const interestRate = isReward
    ? MANSLATER_CONFIG.REWARD_INTEREST_RATE
    : MANSLATER_CONFIG.INTEREST_RATE

  const feeRate =
    bankCode === 'BCA' || bankCode === 'MANDIRI'
      ? MANSLATER_CONFIG.PLATFORM_FEE.BCA_MANDIRI
      : MANSLATER_CONFIG.PLATFORM_FEE.OTHER

  const totalInterest = amount * interestRate * tenor
  const platformFee = amount * feeRate
  const netDisbursement = amount - platformFee
  const totalRepayment = amount + totalInterest
  const monthlyInstallment = Math.ceil(totalRepayment / tenor)

  const schedule = Array.from({ length: tenor }, (_, i) => {
    const dueDate = addMonths(new Date(), i + 1)
    const principalPerMonth = Math.ceil(amount / tenor)
    const interestPerMonth = Math.ceil(amount * interestRate)
    return {
      month: i + 1,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      principal: principalPerMonth,
      interest: interestPerMonth,
      total: principalPerMonth + interestPerMonth,
    }
  })

  return {
    principal: amount,
    tenor,
    interestRate: interestRate * 100,
    totalInterest,
    platformFee,
    netDisbursement,
    totalRepayment,
    monthlyInstallment,
    schedule,
  }
}

/**
 * Calculate MansGadai simulation
 */
export function calculateGadaiSimulation(amount, bankCode = 'OTHER') {
  const interestRate = MANSGADAI_CONFIG.INTEREST_RATE
  const feeRate =
    bankCode === 'BCA' || bankCode === 'MANDIRI'
      ? MANSGADAI_CONFIG.PLATFORM_FEE.BCA_MANDIRI
      : MANSGADAI_CONFIG.PLATFORM_FEE.OTHER

  const interest = amount * interestRate
  const platformFee = amount * feeRate
  const netDisbursement = amount - platformFee
  const totalRepayment = amount + interest
  const extensionFee = amount * MANSGADAI_CONFIG.EXTENSION_FEE
  const dueDate = addMonths(new Date(), 1)

  return {
    principal: amount,
    interest,
    platformFee,
    netDisbursement,
    totalRepayment,
    extensionFee,
    dueDate: format(dueDate, 'yyyy-MM-dd'),
    toleranceDeadline: format(
      new Date(dueDate.getTime() + MANSGADAI_CONFIG.TOLERANCE_DAYS * 86400000),
      'yyyy-MM-dd'
    ),
  }
}

// Generate unique reference number
export function generateRefNumber(prefix = 'MG') {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7)
  return `${prefix}${yy}${mm}${dd}-${rand}`
}

// Calculate credit score
export function calculateCreditScore({ income, loanAmount, repaymentHistory, hasOverdue, loanCount }) {
  let score = 500

  // Income ratio
  const ratio = loanAmount / (income || 1)
  if (ratio < 0.3) score += 100
  else if (ratio < 0.5) score += 50
  else if (ratio > 1) score -= 100

  // Repayment history
  if (repaymentHistory === 'excellent') score += 150
  else if (repaymentHistory === 'good') score += 80
  else if (repaymentHistory === 'poor') score -= 150

  if (hasOverdue) score -= 200
  if (loanCount > 3) score += 30

  score = Math.max(200, Math.min(900, score))

  let category = 'poor'
  if (score >= 750) category = 'excellent'
  else if (score >= 650) category = 'good'
  else if (score >= 550) category = 'fair'

  return { score, category }
}

// Get initials from name
export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

// Class name merge utility
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// Amount helpers — handle revision flow consistently across UI
//
// Setiap loan/gadai punya 3 nilai jumlah berbeda:
//   - Original           : yang diajukan user (loans.amount / gadai.loan_amount)
//   - Suggested by staff : usulan revisi staff (suggested_amount)
//   - Approved by admin  : final disetujui admin (approved_amount)
//
// Aturan: setelah admin menyetujui, yang authoritative adalah approved_amount.
// Sebelum admin approve tapi staff sudah revisi → suggested_amount sebagai indikasi.
// ─────────────────────────────────────────────────────────────────────────────

/** Jumlah ASLI yang diajukan user (sebelum revisi). */
export function getOriginalAmount(item, isLoan = true) {
  if (!item) return 0
  return Number(isLoan ? item.amount : item.loan_amount) || 0
}

/** Jumlah EFEKTIF — yang sebenarnya berlaku saat ini.
 *  Prioritas: approved_amount → suggested_amount → original.
 */
export function getEffectiveAmount(item, isLoan = true) {
  if (!item) return 0
  return Number(item.approved_amount ?? item.suggested_amount ?? (isLoan ? item.amount : item.loan_amount)) || 0
}

/** True jika pengajuan ini sudah direvisi (jumlah efektif ≠ jumlah asli). */
export function isRevised(item, isLoan = true) {
  if (!item) return false
  const orig = getOriginalAmount(item, isLoan)
  const eff = getEffectiveAmount(item, isLoan)
  return orig > 0 && eff > 0 && orig !== eff
}

/**
 * Return field finansial yang KONSISTEN dengan effective amount.
 *
 * Untuk data yang sudah direvisi tapi field turunannya belum di-update
 * (data lama sebelum fix recalc, atau data yang amount-nya berubah),
 * helper ini selalu menjamin angka yang ditampilkan ke user benar.
 *
 * Kalau item.monthly_installment dan friends sudah sinkron dengan
 * effective amount (kasus normal post-fix), helper ini tetap return
 * angka yang sama — jadi aman dipakai dimana saja.
 *
 * @param {object} loan - record dari tabel `loans`
 * @returns {{ principal, totalInterest, platformFee, netDisbursement, totalRepayment, monthlyInstallment }}
 */
export function getEffectiveLoanNumbers(loan) {
  if (!loan) {
    return { principal: 0, totalInterest: 0, platformFee: 0, netDisbursement: 0, totalRepayment: 0, monthlyInstallment: 0 }
  }
  const effective = getEffectiveAmount(loan, true)
  const original = Number(loan.amount) || 0

  // Kalau effective === original, semua field turunan sudah pas dari pengajuan awal,
  // langsung pakai field yang ada di record.
  if (effective === original && original > 0) {
    return {
      principal: effective,
      totalInterest: Number(loan.total_interest) || 0,
      platformFee: Number(loan.platform_fee) || 0,
      netDisbursement: Number(loan.net_disbursement) || 0,
      totalRepayment: Number(loan.total_repayment) || 0,
      monthlyInstallment: Number(loan.monthly_installment) || 0,
    }
  }

  // Effective berbeda dari original (direvisi). Cek apakah field turunan
  // sudah sinkron dengan effective. Pakai monthly_installment sebagai signal:
  // kalau monthly_installment masih mencerminkan original, kita rekalkulasi.
  const sim = calculateLoanSimulation(effective, loan.tenor || 1, loan.bank_code, false)

  // Kalau field di DB sudah match recalc (artinya AdminApprovals sudah rekalkulasi),
  // pakai field DB. Kalau tidak, pakai hasil rekalkulasi.
  const dbMonthly = Number(loan.monthly_installment) || 0
  const recalcMonthly = sim.monthlyInstallment
  // Tolerance kecil utk pembulatan
  const matchesEffective = Math.abs(dbMonthly - recalcMonthly) < 2

  if (matchesEffective) {
    return {
      principal: effective,
      totalInterest: Number(loan.total_interest) || 0,
      platformFee: Number(loan.platform_fee) || 0,
      netDisbursement: Number(loan.net_disbursement) || 0,
      totalRepayment: Number(loan.total_repayment) || 0,
      monthlyInstallment: dbMonthly,
    }
  }

  // Fallback: rekalkulasi on-the-fly
  return {
    principal: effective,
    totalInterest: sim.totalInterest,
    platformFee: sim.platformFee,
    netDisbursement: sim.netDisbursement,
    totalRepayment: sim.totalRepayment,
    monthlyInstallment: sim.monthlyInstallment,
  }
}

/** Versi gadai dari helper di atas. */
export function getEffectiveGadaiNumbers(gadai) {
  if (!gadai) {
    return { principal: 0, interest: 0, platformFee: 0, netDisbursement: 0, totalRepayment: 0, extensionFee: 0 }
  }
  const effective = getEffectiveAmount(gadai, false)
  const original = Number(gadai.loan_amount) || 0

  if (effective === original && original > 0) {
    return {
      principal: effective,
      interest: Number(gadai.interest) || 0,
      platformFee: Number(gadai.platform_fee) || 0,
      netDisbursement: Number(gadai.net_disbursement) || 0,
      totalRepayment: Number(gadai.total_repayment) || 0,
      extensionFee: Number(gadai.extension_fee) || 0,
    }
  }

  const sim = calculateGadaiSimulation(effective, gadai.bank_code)
  const dbInterest = Number(gadai.interest) || 0
  const matchesEffective = Math.abs(dbInterest - sim.interest) < 2

  if (matchesEffective) {
    return {
      principal: effective,
      interest: dbInterest,
      platformFee: Number(gadai.platform_fee) || 0,
      netDisbursement: Number(gadai.net_disbursement) || 0,
      totalRepayment: Number(gadai.total_repayment) || 0,
      extensionFee: Number(gadai.extension_fee) || 0,
    }
  }

  return {
    principal: effective,
    interest: sim.interest,
    platformFee: sim.platformFee,
    netDisbursement: sim.netDisbursement,
    totalRepayment: sim.totalRepayment,
    extensionFee: sim.extensionFee,
  }
}