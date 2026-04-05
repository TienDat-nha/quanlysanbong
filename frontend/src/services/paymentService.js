import { 
  createBookingPayment,
  getMyBookings as getMyBookingsApi,
  getMyPayments as getMyPaymentsApi,
  getPaymentByBooking as getPaymentByBookingApi,
  confirmPayment as confirmPaymentApi,
  checkPaymentStatus as checkPaymentStatusApi,
  cancelBookingPayment,
  getPaymentQr,
} from '../models/api'
import { getBookingPaymentSummaryVi } from '../models/bookingTextModel'
import { normalizePaymentItem } from '../models/paymentModel'

const PENDING_PAYMENT_STATUSES = new Set(['', 'PENDING', 'WAITING', 'PROCESSING', 'UNPAID'])
const CANCELLED_BOOKING_STATUSES = new Set(['CANCELLED', 'CANCELED'])

const getPaymentBookingIds = (payment) => {
  if (!payment || typeof payment !== 'object') {
    return []
  }

  const rawBookingIds = Array.isArray(payment.bookingIds)
    ? payment.bookingIds
    : [payment.bookingId]

  return Array.from(
    new Set(
      rawBookingIds
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )
}

const isBookingPaymentConfirmed = (booking) => {
  if (!booking || typeof booking !== 'object') {
    return false
  }

  const paymentSummary = getBookingPaymentSummaryVi(booking)
  return paymentSummary.hasConfirmedDeposit || paymentSummary.isFullyPaid
}

const reconcilePaymentWithBookingStatuses = (payment, bookingMap) => {
  if (!payment || typeof payment !== 'object') {
    return payment
  }

  const paymentStatus = String(payment.status || payment.paymentStatus || '').trim().toUpperCase()
  if (!PENDING_PAYMENT_STATUSES.has(paymentStatus)) {
    return payment
  }

  const relatedBookings = getPaymentBookingIds(payment)
    .map((bookingId) => bookingMap.get(bookingId) || null)
    .filter(Boolean)

  if (relatedBookings.length === 0) {
    return payment
  }

  const relatedBookingStatuses = relatedBookings
    .map((booking) => String(booking?.status || '').trim().toUpperCase())
    .filter(Boolean)

  if (relatedBookingStatuses.length > 0 && relatedBookingStatuses.every((status) => CANCELLED_BOOKING_STATUSES.has(status))) {
    return {
      ...payment,
      status: 'CANCELLED',
    }
  }

  if (relatedBookings.every((booking) => isBookingPaymentConfirmed(booking))) {
    return {
      ...payment,
      status: 'PAID',
    }
  }

  return payment
}

export const createPayment = async (token, bookingId, method, paymentType, amount = null, bookingIds = []) => {
  if (!token) throw new Error('Token không hợp lệ')
  if (!bookingId) throw new Error('BookingId không hợp lệ')
  if (!method) throw new Error('Phương thức thanh toán không hợp lệ')
  if (!paymentType) throw new Error('Loại thanh toán không hợp lệ')

  const response = await createBookingPayment(
    token,
    String(bookingId).trim(),
    String(method).trim().toUpperCase(),
    String(paymentType).trim().toUpperCase(),
    amount,
    bookingIds
  )

  return normalizePaymentItem({
    ...(response?.payment || response?.data || response),
    paymentType:
      String(
        response?.payment?.paymentType
        || response?.payment?.type
        || paymentType
        || ''
      ).trim().toUpperCase(),
  })
}

export const confirmPayment = async (token, paymentId) => {
  if (!token) throw new Error('Token không hợp lệ')
  if (!paymentId) throw new Error('PaymentId không hợp lệ')

  const response = await confirmPaymentApi(token, String(paymentId).trim())

  return normalizePaymentItem(response?.payment || response?.data || response)
}

export const checkPaymentStatus = async (token, paymentId) => {
  if (!token) throw new Error('Token khong hop le')
  if (!paymentId) throw new Error('PaymentId khong hop le')

  const response = await checkPaymentStatusApi(token, String(paymentId).trim())

  return {
    payment: normalizePaymentItem(response?.payment || response?.data || response),
    momoStatus: response?.momoStatus || null,
    message: String(response?.message || '').trim(),
  }
}

export const getMyPayments = async (token) => {
  if (!token) throw new Error('Token không hợp lệ')

  const [paymentResponse, bookingResponse] = await Promise.all([
    getMyPaymentsApi(token),
    getMyBookingsApi(token).catch(() => ({ bookings: [] })),
  ])

  const payments = Array.isArray(paymentResponse?.payments) ? paymentResponse.payments : []
  const bookings = Array.isArray(bookingResponse?.bookings) ? bookingResponse.bookings : []
  const bookingMap = new Map(
    bookings.map((booking) => [
      String(booking?.id || booking?._id || '').trim(),
      booking,
    ])
  )

  return payments
    .map((payment) => reconcilePaymentWithBookingStatuses(payment, bookingMap))
    .map(normalizePaymentItem)
    .filter(Boolean)
}

export const getPaymentByBooking = async (token, bookingId) => {
  if (!token) throw new Error('Token không hợp lệ')
  if (!bookingId) throw new Error('BookingId không hợp lệ')

  const response = await getPaymentByBookingApi(token, String(bookingId).trim())

  const payment = response?.payment || response?.data || response
  return payment
    ? normalizePaymentItem({
        ...payment,
        bookingIds: Array.isArray(payment?.bookingIds) ? payment.bookingIds : [],
      })
    : null
}

export const cancelPayment = async (token, paymentId) => {
  if (!token) throw new Error('Token không hợp lệ')
  if (!paymentId) throw new Error('PaymentId không hợp lệ')

  const response = await cancelBookingPayment(token, String(paymentId).trim())

  return normalizePaymentItem(response?.payment || response?.data || response)
}

export const getQR = async (token, paymentId) => {
  if (!token) throw new Error('Token không hợp lệ')
  if (!paymentId) throw new Error('PaymentId không hợp lệ')

  const response = await getPaymentQr(token, String(paymentId).trim())

  return {
    qrImage: String(response?.qrImage || response?.qr || response?.url || '').trim(),
    qrText: String(response?.qrText || response?.content || response?.qrCode || '').trim(),
    payUrl: String(response?.payUrl || response?.paymentUrl || '').trim(),
    deeplink: String(response?.deeplink || response?.deepLink || '').trim(),
    expiredAt: response?.expiredAt || null,
    createdAt: response?.createdAt || null,
  }
}
