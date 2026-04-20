import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MyPaymentsView from '../../views/pages/MyPaymentsView'
import PaymentQRModal from '../../components/PaymentQRModal'
import { usePaymentFlow } from '../../hooks/usePaymentFlow'
import { getQR, cancelPayment, getMyPayments, confirmPayment, checkPaymentStatus } from '../../services/paymentService'

const MyPaymentsController = ({ authToken }) => {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [cancelling, setCancelling] = useState({})
  const [localError, setLocalError] = useState('')
  const [providerFeedback, setProviderFeedback] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const { loading, error, payments, setPayments } = usePaymentFlow(authToken)

  // --- HÀM LOAD DỮ LIỆU TỪ SERVER (SINGLE SOURCE OF TRUTH) ---
  const loadPayments = useCallback(async () => {
    if (!authToken) return
    try {
      const list = await getMyPayments(authToken)
      setPayments(list)
      setLocalError('')
    } catch (err) {
      setLocalError(err?.message || 'Lỗi tải danh sách thanh toán')
    }
  }, [authToken, setPayments])

  useEffect(() => {
    loadPayments()
  }, [loadPayments])

  // --- XỬ LÝ PHẢN HỒI TỪ URL (MOMO REDIRECT) ---
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const status = searchParams.get('paymentStatus')
    const message = searchParams.get('paymentMessage')

    if (status) {
      setProviderFeedback({
        type: status === 'success' ? 'success' : status === 'pending' ? 'warning' : 'error',
        text: message || (status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán chưa hoàn tất.')
      })
      
      // Xóa các tham số trên URL sau 5s để giao diện sạch sẽ
      const timer = setTimeout(() => navigate(location.pathname, { replace: true }), 5000)
      return () => clearTimeout(timer)
    }
  }, [location.search, location.pathname, navigate])

  // --- LOGIC POLLING (KIỂM TRA TỰ ĐỘNG) ---
  useEffect(() => {
    const pendingMomo = payments.filter(p => 
      p.method?.toUpperCase() === 'MOMO' && p.status?.toUpperCase() === 'PENDING'
    )

    if (!authToken || pendingMomo.length === 0) return

    const interval = setInterval(async () => {
      try {
        // Chỉ gọi BE check trạng thái, không tự cập nhật state ở đây
        await Promise.all(pendingMomo.map(p => checkPaymentStatus(authToken, p.id)))
        // Sau khi BE đồng bộ xong, FE load lại toàn bộ danh sách mới
        await loadPayments()
      } catch (e) { console.error("Polling error", e) }
    }, 4000)

    return () => clearInterval(interval)
  }, [authToken, payments, loadPayments])

  // --- CÁC HÀM XỬ LÝ SỰ KIỆN ---
  const handleViewQR = async (payment) => {
    try {
      setLocalError('')
      const qr = await getQR(authToken, payment.id)
      
      // Nếu là MoMo, mở link thanh toán thay vì hiện QR (BE nên trả về link chuẩn)
      const payUrl = qr?.payUrl || payment?.payUrl
      if (payment.method?.toUpperCase() === 'MOMO' && payUrl) {
        window.open(payUrl, '_blank')
        setProviderFeedback({ type: 'warning', text: 'Đang mở cổng thanh toán MoMo...' })
      } else {
        setSelectedPayment(payment)
        setQrData(qr)
      }
    } catch (err) {
      setLocalError(err?.message || 'Không thể lấy thông tin thanh toán')
    }
  }

  const handleConfirmPayment = async (paymentId) => {
    try {
      setConfirming(true)
      await confirmPayment(authToken, paymentId)
      // Chờ một chút để DB cập nhật rồi load lại
      setTimeout(async () => {
        await loadPayments()
        setSelectedPayment(null)
        setConfirming(false)
      }, 500)
    } catch (err) {
      setLocalError(err?.message || 'Lỗi xác nhận')
      setConfirming(false)
    }
  }

  const handleCancelPaymentClick = async (paymentId) => {
    if (!window.confirm('Bạn chắc chắn muốn hủy thanh toán này?')) return
    try {
      setCancelling(prev => ({ ...prev, [paymentId]: true }))
      await cancelPayment(authToken, paymentId)
      await loadPayments()
    } catch (err) {
      setLocalError(err?.message || 'Lỗi hủy đơn')
    } finally {
      setCancelling(prev => ({ ...prev, [paymentId]: false }))
    }
  }

  return (
    <>
      <MyPaymentsView
        payments={payments}
        loading={loading || confirming}
        error={localError || error}
        feedback={providerFeedback}
        onViewQR={handleViewQR}
        onCancel={handleCancelPaymentClick}
        onRefresh={loadPayments}
        cancelling={cancelling}
      />

      {selectedPayment && (
        <PaymentQRModal
          payment={selectedPayment}
          qrImage={qrData?.qrImage}
          onConfirmPayment={handleConfirmPayment}
          onCancelPayment={handleCancelPaymentClick}
          onRefreshQR={() => handleViewQR(selectedPayment)}
          loading={confirming}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </>
  )
}

export default MyPaymentsController