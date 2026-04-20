import { useState, useCallback } from 'react'
import {
  createPayment,
  confirmPayment,
  getPaymentByBooking,
  cancelPayment,
  getQR,
} from '../services/paymentService'

export const usePaymentFlow = (authToken) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPayment, setCurrentPayment] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [payments, setPayments] = useState([])

  /**
   * HÀM TẠO THANH TOÁN (ĐÃ TỐI ƯU)
   * Loại bỏ 'amount' truyền từ client. 
   * BE phải tự dựa vào bookingId để tính toán số tiền cọc/toàn phần trong Database.
   */
  const handleCreatePayment = useCallback(
    async (bookingId, method, paymentType, bookingIds = []) => {
      try {
        setLoading(true)
        setError('')
        setQrData(null) // Reset QR cũ trước khi thực hiện giao dịch mới

        // FE chỉ gửi "Yêu cầu" (Booking nào, Phương thức gì, Loại nào).
        // BE chịu trách nhiệm hoàn toàn về logic con số.
        const payment = await createPayment(authToken, bookingId, method, paymentType, bookingIds)
        setCurrentPayment(payment)

        /**
         * LOGIC HIỂN THỊ QR:
         * BE nên trả về một flag (ví dụ: requiresQR: true) hoặc trực tiếp link QR.
         * Ở đây mình dựa trên kết quả payment thực tế từ BE trả về để quyết định.
         */
        if (payment?.requiresQR || payment?.qrCodeData) {
          const qr = await getQR(authToken, payment.id)
          setQrData(qr)
        }
        
        return payment
      } catch (err) {
        // Hiển thị thông báo lỗi cụ thể từ Server trả về
        const errMsg = err?.response?.data?.message || err?.message || 'Lỗi tạo thanh toán'
        setError(errMsg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [authToken]
  )

  const handleConfirmPayment = useCallback(
    async (paymentId, bookingIdToRefresh = null) => {
      try {
        setLoading(true)
        setError('')
        const payment = await confirmPayment(authToken, paymentId)
        setCurrentPayment(payment)

        // Sau khi confirm, nếu cần, load lại danh sách để đồng bộ với DB sạch nhất
        if (bookingIdToRefresh) {
          const updatedList = await getPaymentByBooking(authToken, bookingIdToRefresh)
          setPayments(updatedList)
        }

        return payment
      } catch (err) {
        setError(err?.response?.data?.message || err?.message || 'Lỗi xác nhận thanh toán')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [authToken]
  )

  const handleGetPaymentsByBooking = useCallback(
    async (bookingId) => {
      try {
        setLoading(true)
        setError('')
        const list = await getPaymentByBooking(authToken, bookingId)
        setPayments(list)
        return list
      } catch (err) {
        setError(err?.message || 'Lỗi lấy danh sách thanh toán')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [authToken]
  )

  const handleCancelPayment = useCallback(
    async (paymentId) => {
      try {
        setLoading(true)
        setError('')
        await cancelPayment(authToken, paymentId)
        
        // Dọn sạch trạng thái FE để phản ánh đúng việc hủy đơn
        setCurrentPayment(null)
        setQrData(null)
      } catch (err) {
        setError(err?.message || 'Lỗi hủy thanh toán')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [authToken]
  )

  const resetPayment = useCallback(() => {
    setCurrentPayment(null)
    setQrData(null)
    setError('')
  }, [])

  return {
    loading,
    error,
    currentPayment,
    qrData,
    payments,
    handleCreatePayment,
    handleConfirmPayment,
    handleGetPaymentsByBooking,
    handleCancelPayment,
    resetPayment,
    setCurrentPayment,
    setPayments,
  }
}