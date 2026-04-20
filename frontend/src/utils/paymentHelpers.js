/**
 * ĐỊNH DẠNG TIỀN TỆ (VND)
 */
const formatCurrencyVi = (value) => {
  const num = Number(value || 0)
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num)
}

/**
 * ĐỊNH DẠNG NGÀY GIỜ (DD/MM/YYYY HH:mm:ss)
 */
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

/**
 * LẤY THÔNG TIN HIỂN THỊ TRẠNG THÁI (ĐÃ SỬA: KHÔNG LẤN SÂN)
 * FE chỉ nhận trạng thái từ BE và gán Màu sắc/Icon tương ứng.
 */
const getPaymentStatusInfo = (status) => {
  // Chuẩn hóa status nhận từ Backend
  const normalized = String(status || 'PENDING').trim().toUpperCase()
  
  const statusMap = {
    PENDING: { label: 'Chờ thanh toán', color: 'warning', icon: '⏳' },
    PAID: { label: 'Đã thanh toán', color: 'success', icon: '✓' },
    SUCCESS: { label: 'Thanh toán thành công', color: 'success', icon: '✓' },
    CANCELLED: { label: 'Đã hủy', color: 'danger', icon: '✕' },
    CANCELED: { label: 'Đã hủy', color: 'danger', icon: '✕' },
    EXPIRED: { label: 'Hết hạn', color: 'secondary', icon: '⏱' },
    FAILED: { label: 'Thất bại', color: 'danger', icon: '!' },
  }

  return statusMap[normalized] || { label: normalized, color: 'secondary', icon: '?' }
}

/**
 * TÍNH TOÁN ĐẾM NGƯỢC
 */
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

/**
 * CHUYỂN ĐỔI NHÃN PHƯƠNG THỨC & LOẠI
 */
const getPaymentMethodLabel = (method) => {
  const normalized = String(method || '').trim().toUpperCase()
  const methodMap = {
    MOMO: 'Ví MoMo',
    BANK: 'Chuyển khoản',
    CASH: 'Tiền mặt/Tại chỗ',
  }
  return methodMap[normalized] || method
}

const getPaymentTypeLabel = (type) => {
  const normalized = String(type || '').trim().toUpperCase()
  const typeMap = {
    DEPOSIT: 'Đặt cọc (40%)',
    FULL: 'Thanh toán đủ',
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