import React, { useState, useEffect } from 'react'
import MyPaymentsView from '../../views/pages/MyPaymentsView'
import PaymentQRModal from '../../components/PaymentQRModal'
import { usePaymentFlow } from '../../hooks/usePaymentFlow'
import { getQR, cancelPayment, getMyPayments, confirmPayment } from '../../services/paymentService'

const MyPaymentsController = ({ authToken }) => {
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [cancelling, setCancelling] = useState({})
  const [localError, setLocalError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const {
    loading,
    error,
    payments,
    setPayments,
  } = usePaymentFlow(authToken)

  // Load payments on mount
  useEffect(() => {
    if (!authToken) return
    loadPayments()
  }, [authToken])

  const loadPayments = async () => {
    try {
      const list = await getMyPayments(authToken)
      setPayments(list)
      setLocalError('')
    } catch (err) {
      setLocalError(err?.message || 'Lỗi tải danh sách thanh toán')
    }
  }

  const handleViewQR = async (payment) => {
    try {
      setLocalError('')
      setSelectedPayment(payment)
      const qr = await getQR(authToken, payment.id)
      setQrData(qr)
    } catch (err) {
      setLocalError(err?.message || 'Lỗi lấy mã QR')
    }
  }

  const handleConfirmPayment = async (paymentId) => {
    try {
      setConfirming(true)
      setLocalError('')
      await confirmPayment(authToken, paymentId)
      await new Promise(resolve => setTimeout(resolve, 500))
      setSelectedPayment(null)
      setQrData(null)
      await loadPayments()
    } catch (err) {
      setLocalError(err?.message || 'Lỗi xác nhận thanh toán')
    } finally {
      setConfirming(false)
    }
  }

  const handleCancelPaymentClick = async (payment) => {
    if (!window.confirm('Bạn chắc chắn muốn huỷ thanh toán này?')) {
      return
    }

    try {
      setCancelling((prev) => ({ ...prev, [payment.id]: true }))
      setLocalError('')
      await cancelPayment(authToken, payment.id)
      await loadPayments()
    } catch (err) {
      setLocalError(err?.message || 'Lỗi huỷ thanh toán')
    } finally {
      setCancelling((prev) => ({ ...prev, [payment.id]: false }))
    }
  }

  const handleRefreshQR = async () => {
    if (!selectedPayment) return
    try {
      const qr = await getQR(authToken, selectedPayment.id)
      setQrData(qr)
      setLocalError('')
    } catch (err) {
      setLocalError(err?.message || 'Lỗi làm mới QR')
    }
  }

  const handleCloseModal = () => {
    setSelectedPayment(null)
    setQrData(null)
  }

  return (
    <>
      <MyPaymentsView
        payments={payments}
        loading={loading || confirming}
        error={localError || error}
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
          onRefreshQR={handleRefreshQR}
          loading={loading || confirming}
          error={localError}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

export default MyPaymentsController
