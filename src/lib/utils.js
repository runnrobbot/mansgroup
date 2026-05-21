import { MANSLATER_CONFIG, MANSGADAI_CONFIG } from './constants'
import { format, addMonths, differenceInDays } from 'date-fns'

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

// Format number with dots separator
export function formatNumber(n) {
  return new Intl.NumberFormat('id-ID').format(n)
}

// Parse IDR string back to number
export function parseIDR(str) {
  return parseInt(str.replace(/[^\d]/g, ''), 10) || 0
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
 * Calculate late penalty for a given overdue days
 */
export function calculateLatePenalty(outstandingAmount, overdueDays) {
  let totalPenalty = 0
  let dailyRate = MANSLATER_CONFIG.LATE_PENALTY.WEEK_1_DAILY

  for (let day = 1; day <= overdueDays; day++) {
    const week = Math.ceil(day / 7)
    if (week === 1) {
      dailyRate = MANSLATER_CONFIG.LATE_PENALTY.WEEK_1_DAILY
    } else {
      dailyRate =
        MANSLATER_CONFIG.LATE_PENALTY.WEEK_1_DAILY +
        (week - 1) * MANSLATER_CONFIG.LATE_PENALTY.SUBSEQUENT_WEEKLY_ADD
    }
    totalPenalty += outstandingAmount * dailyRate
  }

  // If entered next month, add monthly interest again
  if (overdueDays > 30) {
    const extraMonths = Math.floor(overdueDays / 30)
    totalPenalty += outstandingAmount * MANSLATER_CONFIG.INTEREST_RATE * extraMonths
  }

  return Math.ceil(totalPenalty)
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

// Validate NIK (16-digit Indonesian national ID)
export function validateNIK(nik) {
  if (!nik) return false
  const nikStr = String(nik).replace(/\D/g, '')
  return nikStr.length === 16
}

// Validate Indonesian phone number
export function validatePhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '')
  return /^(08|628)\d{8,11}$/.test(cleaned)
}

// Normalize phone to +62 format
export function normalizePhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.startsWith('0')) return '+62' + cleaned.slice(1)
  if (cleaned.startsWith('62')) return '+' + cleaned
  return cleaned
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

// Truncate text
export function truncate(str, n = 50) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n - 1) + '…' : str
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
