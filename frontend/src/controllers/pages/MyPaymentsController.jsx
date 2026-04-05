import React, { useCallback, useEffect, useState } from 'react'
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

  const loadPayments = useCallback(async () => {
    try {
      const list = await getMyPayments(authToken)
      setPayments(list)
      setLocalError('')
    } catch (err) {
      setLocalError(err?.message || 'Loi tai danh sach thanh toan')
    }
  }, [authToken, setPayments])

  useEffect(() => {
    if (!authToken) {
      return
    }

    loadPayments()
  }, [authToken, loadPayments])

  const handleViewQR = async (payment) => {
    try {
      setLocalError('')
      setSelectedPayment(payment)
      const qr = await getQR(authToken, payment.id)
      setQrData(qr)
    } catch (err) {
      setLocalError(err?.message || 'Loi lay ma QR')
    }
  }

  const handleConfirmPayment = async (paymentId) => {
    try {
      setConfirming(true)
      setLocalError('')
      await confirmPayment(authToken, paymentId)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setSelectedPayment(null)
      setQrData(null)
      await loadPayments()
    } catch (err) {
      setLocalError(err?.message || 'Loi xac nhan thanh toan')
    } finally {
      setConfirming(false)
    }
  }

  const handleCancelPaymentClick = async (payment) => {
    if (!window.confirm('Ban chac chan muon huy thanh toan nay?')) {
      return
    }

    try {
      setCancelling((prev) => ({ ...prev, [payment.id]: true }))
      setLocalError('')
      await cancelPayment(authToken, payment.id)
      await loadPayments()
    } catch (err) {
      setLocalError(err?.message || 'Loi huy thanh toan')
    } finally {
      setCancelling((prev) => ({ ...prev, [payment.id]: false }))
    }
  }

  const handleRefreshQR = async () => {
    if (!selectedPayment) {
      return
    }

    try {
      const qr = await getQR(authToken, selectedPayment.id)
      setQrData(qr)
      setLocalError('')
    } catch (err) {
      setLocalError(err?.message || 'Loi lam moi QR')
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
