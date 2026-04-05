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
const DEFAULT_PENDING_PAYMENT_MINUTES = 5

const normalizePaymentDate = (value) => {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getEffectivePaymentStatus = (status, expiredAt = null, createdAt = null, now = Date.now()) => {
  const normalizedStatus = String(status || '').trim().toUpperCase()
  const normalizedExpiredAt = normalizePaymentDate(expiredAt)
  const normalizedCreatedAt = normalizePaymentDate(createdAt)
  const derivedExpiredAt =
    normalizedExpiredAt
    || (
      normalizedCreatedAt
        ? new Date(normalizedCreatedAt.getTime() + DEFAULT_PENDING_PAYMENT_MINUTES * 60 * 1000)
        : null
    )

  if (
    ['PENDING', 'EXPIRED', 'FAILED'].includes(normalizedStatus)
    && derivedExpiredAt
    && derivedExpiredAt.getTime() <= now
  ) {
    return 'CANCELLED'
  }

  return normalizedStatus
}

const normalizePaymentItem = (payment) => {
  if (!payment || typeof payment !== 'object') {
    return null
  }

  const id = String(payment.id || payment._id || payment.paymentId || '').trim()
  const bookingId = String(payment.bookingId || '').trim()

  if (!id && !bookingId) {
    return null
  }

  const expiredAt = normalizePaymentDate(payment.expiredAt)
  const createdAt = normalizePaymentDate(payment.createdAt)
  const status = getEffectivePaymentStatus(payment.status, expiredAt, createdAt)

  return {
    ...payment,
    id: id || bookingId,
    _id: id || bookingId,
    bookingId,
    bookingIds: Array.isArray(payment.bookingIds)
      ? payment.bookingIds.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    amount: Number(payment.amount || 0),
    method: String(payment.method || '').trim().toUpperCase(),
    paymentType: String(payment.paymentType || payment.type || '').trim().toUpperCase(),
    status,
    qrImage: String(payment.qrImage || payment.qr || '').trim(),
    qrText: String(payment.qrText || payment.qrCode || payment.content || '').trim(),
    payUrl: String(payment.payUrl || payment.paymentUrl || '').trim(),
    deeplink: String(payment.deeplink || payment.deepLink || '').trim(),
    transactionCode: String(payment.transactionCode || '').trim(),
    expiredAt,
    createdAt,
  }
}

export { 
  PAYMENT_PATHS, 
  PAYMENT_METHODS, 
  PAYMENT_TYPES, 
  PAYMENT_STATUSES,
  getEffectivePaymentStatus,
  normalizePaymentItem,
}
