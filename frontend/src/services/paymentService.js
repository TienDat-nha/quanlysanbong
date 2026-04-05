import { 
  createBookingPayment,
  getMyPayments as getMyPaymentsApi,
  getPaymentByBooking as getPaymentByBookingApi,
  confirmPayment as confirmPaymentApi,
  checkPaymentStatus as checkPaymentStatusApi,
  cancelBookingPayment,
  getPaymentQr,
} from '../models/api'
import { normalizePaymentItem } from '../models/paymentModel'

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

  const response = await getMyPaymentsApi(token)

  const payments = Array.isArray(response?.payments) ? response.payments : []
  return payments.map(normalizePaymentItem).filter(Boolean)
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
