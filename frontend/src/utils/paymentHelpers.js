import { getEffectivePaymentStatus } from '../models/paymentModel'

const formatCurrencyVi = (value) => {
  const num = Number(value || 0)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num)
}

const formatDateTimeVi = (dateInput) => {
  if (!dateInput) return ''
  try {
    const date = new Date(dateInput)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

const formatDateVi = (dateInput) => {
  if (!dateInput) return ''
  try {
    const date = new Date(dateInput)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return ''
  }
}

const getPaymentStatusInfo = (status, expiredAt = null, createdAt = null) => {
  const normalized = getEffectivePaymentStatus(status, expiredAt, createdAt)
  
  const statusMap = {
    PENDING: { label: 'Chưa thanh toán', color: 'warning', icon: '⏳' },
    PAID: { label: 'Đã thanh toán', color: 'success', icon: '✓' },
    CANCELLED: { label: 'Đã hủy', color: 'danger', icon: '✕' },
    EXPIRED: { label: 'Hết hạn', color: 'secondary', icon: '⏱' },
    FAILED: { label: 'Thanh toán thất bại', color: 'danger', icon: '!' },
  }

  return statusMap[normalized] || { label: normalized, color: 'secondary', icon: '?' }
}

const calculateCountdown = (expiredAt) => {
  if (!expiredAt) return { minutes: 0, seconds: 0, isExpired: true }
  
  try {
    const now = new Date()
    const expiredDate = new Date(expiredAt)
    const diffMs = expiredDate.getTime() - now.getTime()
    
    if (diffMs <= 0) {
      return { minutes: 0, seconds: 0, isExpired: true }
    }

    const totalSeconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return { minutes, seconds, isExpired: false }
  } catch {
    return { minutes: 0, seconds: 0, isExpired: true }
  }
}

const getPaymentMethodLabel = (method) => {
  const normalized = String(method || '').trim().toUpperCase()
  const methodMap = {
    MOMO: 'Ví MoMo',
    BANK: 'Chuyển khoản ngân hàng',
    CASH: 'Thanh toán tại chỗ',
  }
  return methodMap[normalized] || method
}

const getPaymentTypeLabel = (type) => {
  const normalized = String(type || '').trim().toUpperCase()
  const typeMap = {
    DEPOSIT: 'Thanh toán đặt cọc',
    FULL: 'Thanh toán toàn bộ',
  }
  return typeMap[normalized] || type
}

export {
  formatCurrencyVi,
  formatDateTimeVi,
  formatDateVi,
  getPaymentStatusInfo,
  calculateCountdown,
  getPaymentMethodLabel,
  getPaymentTypeLabel,
}
