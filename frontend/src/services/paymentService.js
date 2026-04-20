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

/**
 * HÀM TẠO THANH TOÁN
 * QUAN TRỌNG: Không truyền 'amount' nếu không thực sự cần thiết (đã bỏ trong tham số gọi).
 */
export const createPayment = async (token, bookingId, method, paymentType, bookingIds = []) => {
  if (!token || !bookingId || !method || !paymentType) {
    throw new Error('Thông tin thanh toán không đầy đủ')
  }

  const response = await createBookingPayment(
    token,
    String(bookingId).trim(),
    String(method).trim().toUpperCase(),
    String(paymentType).trim().toUpperCase(),
    null, // Ép BE tự tính tiền dựa trên Database
    bookingIds
  )

  const paymentData = response?.payment || response?.data || response
  return normalizePaymentItem(paymentData)
}

/**
 * HÀM LẤY DANH SÁCH THANH TOÁN
 * Đã loại bỏ logic 'reconcile' tự suy diễn trạng thái ở Frontend.
 */
export const getMyPayments = async (token) => {
  if (!token) throw new Error('Token không hợp lệ')

  const response = await getMyPaymentsApi(token)
  const payments = Array.isArray(response?.payments) ? response.payments : []

  // FE chỉ làm nhiệm vụ chuẩn hóa hiển thị, không tự ý sửa trạng thái 'PAID' hay 'CANCELLED'
  return payments
    .map(normalizePaymentItem)
    .filter(Boolean)
}

export const confirmPayment = async (token, paymentId) => {
  if (!token || !paymentId) throw new Error('Dữ liệu không hợp lệ')
  const response = await confirmPaymentApi(token, String(paymentId).trim())
  return normalizePaymentItem(response?.payment || response?.data || response)
}

export const checkPaymentStatus = async (token, paymentId) => {
  if (!token || !paymentId) throw new Error('Dữ liệu không hợp lệ')
  const response = await checkPaymentStatusApi(token, String(paymentId).trim())
  return {
    payment: normalizePaymentItem(response?.payment || response?.data || response),
    momoStatus: response?.momoStatus || null,
    message: String(response?.message || '').trim(),
  }
}

export const getPaymentByBooking = async (token, bookingId) => {
  if (!token || !bookingId) throw new Error('Dữ liệu không hợp lệ')
  const response = await getPaymentByBookingApi(token, String(bookingId).trim())
  const payment = response?.payment || response?.data || response
  return payment ? normalizePaymentItem(payment) : null
}

export const cancelPayment = async (token, paymentId) => {
  if (!token || !paymentId) throw new Error('Dữ liệu không hợp lệ')
  const response = await cancelBookingPayment(token, String(paymentId).trim())
  return normalizePaymentItem(response?.payment || response?.data || response)
}

export const getQR = async (token, paymentId) => {
  if (!token || !paymentId) throw new Error('Dữ liệu không hợp lệ')
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