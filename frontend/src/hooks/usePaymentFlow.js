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

  const handleCreatePayment = useCallback(
    async (bookingId, method, paymentType, amount = null, bookingIds = []) => {
      try {
        setLoading(true)
        setError('')
        const payment = await createPayment(authToken, bookingId, method, paymentType, amount, bookingIds)
        setCurrentPayment(payment)

        const normalizedMethod = String(method || '').trim().toUpperCase()
        if (normalizedMethod !== 'CASH' && normalizedMethod !== 'MOMO') {
          const qr = await getQR(authToken, payment.id)
          setQrData(qr)
        } else {
          setQrData(null)
        }
        
        return payment
      } catch (err) {
        const errMsg = err?.message || 'Lỗi tạo thanh toán'
        setError(errMsg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [authToken]
  )

  const handleConfirmPayment = useCallback(
    async (paymentId) => {
      try {
        setLoading(true)
        setError('')
        const payment = await confirmPayment(authToken, paymentId)
        setCurrentPayment(payment)
        return payment
      } catch (err) {
        const errMsg = err?.message || 'Lỗi xác nhận thanh toán'
        setError(errMsg)
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
        const errMsg = err?.message || 'Lỗi lấy danh sách thanh toán'
        setError(errMsg)
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
        const payment = await cancelPayment(authToken, paymentId)
        setCurrentPayment(null)
        setQrData(null)
        return payment
      } catch (err) {
        const errMsg = err?.message || 'Lỗi hủy thanh toán'
        setError(errMsg)
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
