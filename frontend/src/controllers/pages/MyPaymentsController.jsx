import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import MyPaymentsView from '../../views/pages/MyPaymentsView'
import PaymentQRModal from '../../components/PaymentQRModal'
import { usePaymentFlow } from '../../hooks/usePaymentFlow'
import { getQR, cancelPayment, getMyPayments, confirmPayment, checkPaymentStatus } from '../../services/paymentService'

const buildPendingMomoFeedback = (text = '') => ({
  type: 'warning',
  text:
    String(text || '').trim()
    || 'Đã mở cổng thanh toán MoMo ở tab mới. Hoàn tất giao dịch rồi quay lại trang này.',
})

const buildSuccessMomoFeedback = (text = '') => ({
  type: 'success',
  text:
    String(text || '').trim()
    || 'Thanh toán MoMo thành công. Hệ thống đã xác nhận giao dịch.',
})

const MyPaymentsController = ({ authToken }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const knownPaymentStatusRef = useRef(new Map())
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [cancelling, setCancelling] = useState({})
  const [localError, setLocalError] = useState('')
  const [providerFeedback, setProviderFeedback] = useState(null)
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

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search || '')
    const paymentStatus = String(searchParams.get('paymentStatus') || '').trim().toLowerCase()
    const paymentMessage = String(searchParams.get('paymentMessage') || '').trim()

    if (!paymentStatus && !paymentMessage) {
      setProviderFeedback(null)
      return
    }

    setProviderFeedback({
      type: paymentStatus === 'success' ? 'success' : paymentStatus === 'pending' ? 'warning' : 'error',
      text:
        paymentMessage
        || (
          paymentStatus === 'success'
            ? 'Thanh toán MoMo thành công.'
            : paymentStatus === 'pending'
              ? 'Đã mở cổng thanh toán MoMo.'
              : 'Thanh toán MoMo chưa thành công.'
        ),
    })
  }, [location.search])

  const redirectedPaymentId = useMemo(() => {
    const searchParams = new URLSearchParams(location.search || '')
    return String(searchParams.get('paymentId') || '').trim()
  }, [location.search])

  const pendingMomoPayments = useMemo(
    () => payments.filter((payment) =>
      String(payment?.method || '').trim().toUpperCase() === 'MOMO'
      && String(payment?.status || '').trim().toUpperCase() === 'PENDING'
    ),
    [payments]
  )

  useEffect(() => {
    if (!authToken || pendingMomoPayments.length === 0) {
      return undefined
    }

    let active = true

    const interval = window.setInterval(async () => {
      try {
        await Promise.all(
          pendingMomoPayments.map((payment) =>
            checkPaymentStatus(authToken, payment.id).catch(() => null)
          )
        )

        if (!active) {
          return
        }

        await loadPayments()
      } catch (_error) {
        // Keep polling quietly while the user is waiting on MoMo.
      }
    }, 4000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [authToken, loadPayments, pendingMomoPayments])

  useEffect(() => {
    if (!authToken || !redirectedPaymentId) {
      return undefined
    }

    let active = true

    const syncRedirectedPayment = async () => {
      try {
        await checkPaymentStatus(authToken, redirectedPaymentId).catch(() => null)

        if (!active) {
          return
        }

        await loadPayments()
      } catch (_error) {
        // Fall back to the regular pending-payment polling loop.
      }
    }

    syncRedirectedPayment()
    return () => {
      active = false
    }
  }, [authToken, loadPayments, redirectedPaymentId])

  useEffect(() => {
    if (!providerFeedback || !location.search) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      navigate(location.pathname, { replace: true })
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [location.pathname, location.search, navigate, providerFeedback])

  useEffect(() => {
    const nextStatusMap = new Map()
    let syncedSuccessPayment = null

    payments.forEach((payment) => {
      const paymentId = String(payment?.id || '').trim()
      const nextStatus = String(payment?.status || '').trim().toUpperCase()

      if (!paymentId) {
        return
      }

      const previousStatus = String(knownPaymentStatusRef.current.get(paymentId) || '').trim().toUpperCase()
      nextStatusMap.set(paymentId, nextStatus)

      if (!syncedSuccessPayment && nextStatus === 'PAID' && previousStatus && previousStatus !== 'PAID') {
        syncedSuccessPayment = payment
      }
    })

    knownPaymentStatusRef.current = nextStatusMap

    if (!syncedSuccessPayment) {
      return
    }

    const redirectedPaymentMatched =
      redirectedPaymentId
      && String(syncedSuccessPayment?.id || '').trim() === redirectedPaymentId

    setProviderFeedback(
      buildSuccessMomoFeedback(
        redirectedPaymentMatched
          ? 'Thanh toán MoMo thành công. Hệ thống đã xác nhận giao dịch của bạn.'
          : ''
      )
    )
  }, [payments, redirectedPaymentId])

  const openPaymentUrl = (value, popup = null) => {
    const actionUrl = String(value || '').trim()
    if (!actionUrl || typeof window === 'undefined') {
      return false
    }

    if (popup && !popup.closed) {
      popup.location.replace(actionUrl)
      return true
    }

    const openedWindow = window.open(actionUrl, '_blank')
    return Boolean(openedWindow)
  }

  const handleViewQR = async (payment) => {
    const normalizedMethod = String(payment?.method || '').trim().toUpperCase()
    const momoPopup = (
      normalizedMethod === 'MOMO'
      && typeof window !== 'undefined'
    )
      ? window.open('about:blank', '_blank')
      : null

    try {
      setLocalError('')
      const qr = await getQR(authToken, payment.id)
      const actionUrl = String(
        payment?.payUrl
        || qr?.payUrl
        || payment?.deeplink
        || qr?.deeplink
        || ''
      ).trim()

      if (normalizedMethod === 'MOMO') {
        if (openPaymentUrl(actionUrl, momoPopup)) {
          setProviderFeedback(buildPendingMomoFeedback())
          return
        }

        throw new Error('Không lấy được liên kết thanh toán MoMo. Vui lòng thử lại.')
      }

      setSelectedPayment(payment)
      setQrData(qr)
    } catch (err) {
      if (momoPopup && !momoPopup.closed) {
        momoPopup.close()
      }
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
