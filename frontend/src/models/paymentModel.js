const PAYMENT_PATHS = {
  CREATE: '/payment/createPayment',
  CONFIRM: '/payment/confirmPayment',
  CHECK_STATUS: (paymentId) => `/payment/checkStatus/${encodeURIComponent(String(paymentId || '').trim())}`,
  GET_MY_PAYMENTS: '/payment/getMyPayments',
  GET_BY_BOOKING: (bookingId) => `/payment/getPaymentByBooking/${encodeURIComponent(String(bookingId || '').trim())}`,
  CANCEL: (paymentId) => `/payment/cancelPayment/${encodeURIComponent(String(paymentId || '').trim())}`,
  GET_QR: (paymentId) => `/payment/getQR/${encodeURIComponent(String(paymentId || '').trim())}`,
}

const PAYMENT_METHODS = ['MOMO', 'BANK', 'CASH']
const PAYMENT_TYPES = ['DEPOSIT', 'FULL']
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'FAILED']

const normalizePaymentDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * HÀM CHUẨN HÓA DỮ LIỆU (MAPPING)
 * FE chỉ nên format lại dữ liệu cho đẹp, không nên tự chế logic trạng thái.
 */
const normalizePaymentItem = (payment) => {
  if (!payment || typeof payment !== 'object') return null

  const id = String(payment.id || payment._id || payment.paymentId || '').trim()
  const bookingId = String(payment.bookingId || '').trim()

  if (!id && !bookingId) return null

  // --- THAY ĐỔI QUAN TRỌNG ---
  // FE chỉ tin vào field status mà BE trả về. 
  // Nếu BE báo PENDING, FE hiện PENDING. Nếu BE báo EXPIRED, FE hiện EXPIRED.
  const status = String(payment.status || 'PENDING').trim().toUpperCase()

  return {
    ...payment,
    id: id || bookingId,
    _id: id || bookingId,
    bookingId,
    bookingIds: Array.isArray(payment.bookingIds)
      ? payment.bookingIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    // Đảm bảo số tiền luôn là kiểu số để format currency
    amount: Number(payment.amount || 0), 
    method: String(payment.method || '').trim().toUpperCase(),
    paymentType: String(payment.paymentType || payment.type || '').trim().toUpperCase(),
    status, // Lấy trạng thái thật từ Server
    qrImage: String(payment.qrImage || payment.qr || '').trim(),
    qrText: String(payment.qrText || payment.qrCode || payment.content || '').trim(),
    payUrl: String(payment.payUrl || payment.paymentUrl || '').trim(),
    deeplink: String(payment.deeplink || payment.deepLink || '').trim(),
    transactionCode: String(payment.transactionCode || '').trim(),
    expiredAt: normalizePaymentDate(payment.expiredAt),
    createdAt: normalizePaymentDate(payment.createdAt),
  }
}

export { 
  PAYMENT_PATHS, 
  PAYMENT_METHODS, 
  PAYMENT_TYPES, 
  PAYMENT_STATUSES,
  normalizePaymentItem,
}