import React, { useCallback, useEffect, useRef, useState } from 'react'
import { usePaymentFlow } from '../hooks/usePaymentFlow'
import PaymentMethodForm from './PaymentMethodForm'
import PaymentQRModal from './PaymentQRModal'
import { getBookingPaymentSummaryVi } from '../models/bookingTextModel'
import { ROUTES } from '../models/routeModel'
import { cancelPayment, checkPaymentStatus, getPaymentByBooking, getQR } from '../services/paymentService'
import { getBookingById, getMyBookings } from '../models/api'
import './PaymentMethodModal.scss'

const normalizePaymentType = (value, fallback = 'DEPOSIT') =>
  String(value || fallback || 'DEPOSIT').trim().toUpperCase()

const normalizePaymentMethod = (value, fallback = '') =>
  String(value || fallback || '').trim().toUpperCase()

const normalizeAmount = (value) => {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

const isPendingPayment = (payment) => {
  const status = String(payment?.status || '').trim().toUpperCase()
  return status === '' || status === 'PENDING' || status === 'WAITING' || status === 'PROCESSING'
}

const PAID_PAYMENT_STATUSES = new Set([
  'PAID',
  'SUCCESS',
  'SUCCEEDED',
  'COMPLETED',
  'DEPOSIT_PAID',
])

const isPaidPaymentStatus = (value) =>
  PAID_PAYMENT_STATUSES.has(String(value || '').trim().toUpperCase())

const doesPaymentMatchSelection = (payment, expectedType, expectedAmount) => {
  if (!payment || typeof payment !== 'object') {
    return false
  }

  const paymentAmount = normalizeAmount(payment.amount)
  const paymentType = normalizePaymentType(payment.paymentType, '')
  const amountMatches = Math.round(paymentAmount) === Math.round(normalizeAmount(expectedAmount))
  const typeMatches = !paymentType || paymentType === normalizePaymentType(expectedType)

  return amountMatches && typeMatches
}

const withExpectedPaymentShape = (payment, expectedType, expectedAmount) => ({
  ...payment,
  amount: normalizeAmount(payment?.amount || expectedAmount),
  paymentType: normalizePaymentType(payment?.paymentType, expectedType),
})

const resolveMomoActionUrl = (payment = null, qr = null) =>
  String(
    payment?.payUrl
    || qr?.payUrl
    || payment?.deeplink
    || qr?.deeplink
    || ''
  ).trim()

const buildMyPaymentsUrl = ({
  paymentId = '',
  bookingId = '',
  paymentStatus = '',
  paymentMessage = '',
} = {}) => {
  if (typeof window === 'undefined') {
    return ROUTES.myPayments
  }

  const nextUrl = new URL(`${window.location.origin}${ROUTES.myPayments}`)

  if (paymentId) {
    nextUrl.searchParams.set('paymentId', String(paymentId || '').trim())
  }

  if (bookingId) {
    nextUrl.searchParams.set('bookingId', String(bookingId || '').trim())
  }

  if (paymentStatus) {
    nextUrl.searchParams.set('paymentStatus', String(paymentStatus || '').trim())
  }

  if (paymentMessage) {
    nextUrl.searchParams.set('paymentMessage', String(paymentMessage || '').trim())
  }

  return nextUrl.toString()
}

const isBookingPaymentConfirmed = (booking, paymentType = '') => {
  if (!booking || typeof booking !== 'object') {
    return false
  }

  const paymentSummary = getBookingPaymentSummaryVi(booking)
  const normalizedPaymentType = String(paymentType || '').trim().toUpperCase()

  if (normalizedPaymentType === 'FULL') {
    return paymentSummary.isFullyPaid
  }

  return paymentSummary.hasConfirmedDeposit || paymentSummary.isFullyPaid
}

const buildPaymentSuccessMessage = (paymentType = '') => {
  const normalizedPaymentType = String(paymentType || '').trim().toUpperCase()

  if (normalizedPaymentType === 'FULL') {
    return 'Thanh toan thanh cong. He thong dang quay ve man hinh san da dat.'
  }

  return 'Thanh toan dat coc thanh cong. He thong dang quay ve man hinh san da dat.'
}

const PaymentMethodModal = ({
  bookingId,
  bookingIds = [],
  totalPrice,
  depositAmount,
  onPaymentSuccess,
  onClose,
  authToken,
  paymentType = 'DEPOSIT',
  isFullPayment = false,
  paymentTypeLabelOverride = '',
  fixedPaymentNotice = '',
}) => {
  const [step, setStep] = useState('form')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [pollInterval, setPollInterval] = useState(null)
  const [qrRefreshing, setQrRefreshing] = useState(false)
  const [statusChecking, setStatusChecking] = useState(false)
  const [localError, setLocalError] = useState('')
  const successTimerRef = useRef(null)
  const successSettledRef = useRef(false)
  const pollInFlightRef = useRef(false)
  const { loading, error, handleCreatePayment, resetPayment } = usePaymentFlow(authToken)

  const effectivePaymentType = isFullPayment ? 'FULL' : normalizePaymentType(paymentType)
  const effectiveBookingIds = Array.from(
    new Set(
      [bookingId, ...(Array.isArray(bookingIds) ? bookingIds : [])]
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  )
  const primaryBookingId = effectiveBookingIds[0] || String(bookingId || '').trim()

  const applyQrState = (payment, qr) => {
    const nextPayment = payment || null
    const nextQr = qr || null

    setSelectedPayment(
      nextPayment
        ? {
            ...nextPayment,
            qrImage: nextQr?.qrImage || nextPayment?.qrImage || '',
            qrText: nextQr?.qrText || nextPayment?.qrText || '',
            payUrl: nextQr?.payUrl || nextPayment?.payUrl || '',
            deeplink: nextQr?.deeplink || nextPayment?.deeplink || '',
            createdAt: nextQr?.createdAt || nextPayment?.createdAt || null,
            expiredAt: nextQr?.expiredAt || nextPayment?.expiredAt || null,
          }
        : nextPayment
    )
    setQrData(nextQr)
  }

  const settleSuccessfulPayment = useCallback((payment = null) => {
    if (successSettledRef.current) {
      return
    }

    successSettledRef.current = true

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
    }

    const resolvedPayment = payment?.id
      ? {
          ...(selectedPayment || {}),
          ...payment,
        }
      : (selectedPayment || null)

    if (resolvedPayment?.id) {
      setSelectedPayment((currentPayment) => ({
        ...(currentPayment || {}),
        ...resolvedPayment,
      }))
    }

    setLocalError('')
    setStep('success')

    successTimerRef.current = setTimeout(() => {
      successTimerRef.current = null
      successSettledRef.current = false
      onPaymentSuccess?.({
        payment: resolvedPayment,
        redirectToBookings: true,
        message: buildPaymentSuccessMessage(resolvedPayment?.paymentType || effectivePaymentType),
        messageType: 'success',
      })
      onClose?.()
    }, 1500)
  }, [effectivePaymentType, onClose, onPaymentSuccess, selectedPayment])

  useEffect(() => () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (step !== 'qr' || !selectedPayment?.id || !authToken) {
      return undefined
    }

    let active = true

    const interval = setInterval(async () => {
      if (pollInFlightRef.current) {
        return
      }

      pollInFlightRef.current = true

      try {
        const paymentMethod = String(selectedPayment?.method || '').trim().toUpperCase()

        if (primaryBookingId) {
          const latestPayment = await getPaymentByBooking(authToken, primaryBookingId).catch(() => null)

          if (!active) {
            return
          }

          if (
            latestPayment?.id
            && String(latestPayment.id).trim() === String(selectedPayment?.id || '').trim()
          ) {
            setSelectedPayment((currentPayment) => (
              currentPayment
                ? {
                    ...currentPayment,
                    ...latestPayment,
                  }
                : currentPayment
            ))

            if (isPaidPaymentStatus(latestPayment?.status)) {
              clearInterval(interval)
              setPollInterval(null)
              settleSuccessfulPayment(latestPayment)
              return
            }
          }
        }

        if (paymentMethod && paymentMethod !== 'CASH') {
          const statusResult = await checkPaymentStatus(authToken, selectedPayment.id).catch(() => null)
          const checkedPayment = statusResult?.payment || null

          if (!active) {
            return
          }

          if (checkedPayment?.id) {
            setSelectedPayment((currentPayment) => (
              currentPayment
                ? {
                    ...currentPayment,
                    ...checkedPayment,
                  }
                : currentPayment
            ))

            if (isPaidPaymentStatus(checkedPayment?.status)) {
              clearInterval(interval)
              setPollInterval(null)
              settleSuccessfulPayment(checkedPayment)
              return
            }
          }
        }

        const qr = await getQR(authToken, selectedPayment.id)
        if (!active) {
          return
        }

        if (qr?.qrImage || qr?.qrText || qr?.payUrl || qr?.deeplink) {
          setQrData(qr)
        }
        if (qr?.expiredAt || qr?.qrImage || qr?.qrText || qr?.payUrl || qr?.deeplink) {
          setSelectedPayment((currentPayment) => (
            currentPayment
              ? {
                  ...currentPayment,
                  qrImage: qr?.qrImage || currentPayment.qrImage || '',
                  qrText: qr?.qrText || currentPayment.qrText || '',
                  payUrl: qr?.payUrl || currentPayment.payUrl || '',
                  deeplink: qr?.deeplink || currentPayment.deeplink || '',
                  createdAt: qr?.createdAt || currentPayment.createdAt || null,
                  expiredAt: qr?.expiredAt || currentPayment.expiredAt || null,
                }
              : currentPayment
          ))
        }
      } catch (err) {
        console.error('Polling error:', err)
      } finally {
        pollInFlightRef.current = false
      }
    }, 3000)

    setPollInterval(interval)
    return () => {
      active = false
      pollInFlightRef.current = false
      clearInterval(interval)
    }
  }, [authToken, primaryBookingId, selectedPayment?.id, selectedPayment?.method, settleSuccessfulPayment, step])

  const clearPaymentFlow = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
      setPollInterval(null)
    }

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }

    successSettledRef.current = false
    setSelectedPayment(null)
    setQrData(null)
    setStep('form')
    setQrRefreshing(false)
    setStatusChecking(false)
    setLocalError('')
    resetPayment()
  }

  const handleFormSubmit = async (_bkId, method, paymentFormType) => {
    const normalizedMethod = normalizePaymentMethod(method)
    const momoPopup = (
      normalizedMethod === 'MOMO'
      && typeof window !== 'undefined'
    )
      ? window.open('about:blank', '_blank')
      : null

    try {
      setLocalError('')

      const finalPaymentType = isFullPayment ? 'FULL' : normalizePaymentType(paymentFormType)
      const expectedAmount =
        finalPaymentType === 'FULL'
          ? normalizeAmount(totalPrice)
          : normalizeAmount(depositAmount)

      const existingPayment = primaryBookingId
        ? await getPaymentByBooking(authToken, primaryBookingId).catch(() => null)
        : null
      if (
        existingPayment?.id
        && isPendingPayment(existingPayment)
        && !doesPaymentMatchSelection(existingPayment, finalPaymentType, expectedAmount)
      ) {
        await cancelPayment(authToken, existingPayment.id).catch(() => null)
      }

      let payment = await handleCreatePayment(
        primaryBookingId,
        method,
        finalPaymentType,
        expectedAmount,
        effectiveBookingIds
      )
      payment = withExpectedPaymentShape(payment, finalPaymentType, expectedAmount)

      if (!doesPaymentMatchSelection(payment, finalPaymentType, expectedAmount) && payment?.id) {
        if (isPendingPayment(payment)) {
          await cancelPayment(authToken, payment.id).catch(() => null)
        }

        payment = await handleCreatePayment(
          primaryBookingId,
          method,
          finalPaymentType,
          expectedAmount,
          effectiveBookingIds
        )
        payment = withExpectedPaymentShape(payment, finalPaymentType, expectedAmount)
      }

      if (!doesPaymentMatchSelection(payment, finalPaymentType, expectedAmount)) {
        throw new Error(
          `Yêu cầu thanh toán trả về ${normalizeAmount(payment?.amount).toLocaleString('vi-VN')}đ thay vì ${expectedAmount.toLocaleString('vi-VN')}đ.`
        )
      }

      if (normalizedMethod === 'CASH') {
        onPaymentSuccess?.({
          payment,
          redirectToBookings: true,
          message: 'Đã tạo yêu cầu thanh toán tại chỗ. Đơn đang chờ admin xác nhận.',
          messageType: 'success',
        })
        onClose?.()
        return
      }

      if (normalizedMethod === 'MOMO') {
        const actionUrl = resolveMomoActionUrl(payment)

        if (actionUrl) {
          if (typeof window !== 'undefined') {
            const historyUrl = buildMyPaymentsUrl({
              paymentId: payment?.id || payment?._id || '',
              bookingId: primaryBookingId,
              paymentStatus: 'pending',
              paymentMessage: 'Da mo cong thanh toan MoMo o tab moi. Hoan tat giao dich roi quay lai trang nay.',
            })

            if (momoPopup && !momoPopup.closed) {
              momoPopup.location.replace(actionUrl)
              window.location.assign(historyUrl)
              return
            }

            const openedWindow = window.open(actionUrl, '_blank')
            if (openedWindow) {
              window.location.assign(historyUrl)
              return
            }

            window.location.assign(actionUrl)
            return
          }
        }
      }

      const qr = await getQR(authToken, payment.id)

      if (normalizedMethod === 'MOMO') {
        const actionUrl = resolveMomoActionUrl(payment, qr)

        if (!actionUrl) {
          throw new Error('Không lấy được liên kết thanh toán MoMo. Vui lòng thử lại.')
        }

        if (typeof window !== 'undefined') {
          const historyUrl = buildMyPaymentsUrl({
            paymentId: payment?.id || payment?._id || '',
            bookingId: primaryBookingId,
            paymentStatus: 'pending',
            paymentMessage: 'Da mo cong thanh toan MoMo o tab moi. Hoan tat giao dich roi quay lai trang nay.',
          })

          if (momoPopup && !momoPopup.closed) {
            momoPopup.location.replace(actionUrl)
            window.location.assign(historyUrl)
            return
          }

          const openedWindow = window.open(actionUrl, '_blank')
          if (openedWindow) {
            window.location.assign(historyUrl)
            return
          }

          window.location.assign(actionUrl)
          return
        }
      }

      applyQrState(payment, qr)
      setStep('qr')
    } catch (err) {
      if (momoPopup && !momoPopup.closed) {
        momoPopup.close()
      }
      setLocalError(err?.message || 'Lỗi tạo thanh toán')
      console.error('Error creating payment:', err)
    }
  }

  const handleConfirmPayment = async (paymentId) => {
    if (statusChecking) {
      return
    }

    try {
      setStatusChecking(true)

      if (pollInterval) {
        clearInterval(pollInterval)
        setPollInterval(null)
      }

      setLocalError('')

      if (normalizePaymentMethod(selectedPayment?.method) === 'CASH') {
        setLocalError('Thanh toán tại chỗ đang chờ admin xác nhận. Vui lòng xem trạng thái booking thay vì tự kiểm tra thanh toán.')
        return
      }

      const paymentMethod = normalizePaymentMethod(selectedPayment?.method)
      const statusResult = await checkPaymentStatus(authToken, paymentId).catch(() => null)
      const checkedPayment = statusResult?.payment || null

      if (checkedPayment?.id) {
        setSelectedPayment((currentPayment) => ({
          ...(currentPayment || {}),
          ...checkedPayment,
        }))
      }

      if (isPaidPaymentStatus(checkedPayment?.status)) {
        settleSuccessfulPayment(checkedPayment)
        return
      }

      const latestPayment = primaryBookingId
        ? await getPaymentByBooking(authToken, primaryBookingId).catch(() => null)
        : null

      if (latestPayment?.id && String(latestPayment.id).trim() === String(paymentId || '').trim()) {
        setSelectedPayment((currentPayment) => ({
          ...(currentPayment || {}),
          ...latestPayment,
        }))
      }

      if (isPaidPaymentStatus(latestPayment?.status)) {
        settleSuccessfulPayment(latestPayment)
        return
      }

      let paymentReceived = false

      if (effectiveBookingIds.length > 1) {
        const bookingData = await getMyBookings(authToken)
        const liveBookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
        const liveBookingMap = new Map(
          liveBookings.map((item) => [String(item?.id || item?._id || '').trim(), item])
        )
        paymentReceived = effectiveBookingIds.every((id) =>
          isBookingPaymentConfirmed(
            liveBookingMap.get(String(id || '').trim()),
            selectedPayment?.paymentType || effectivePaymentType
          )
        )
      } else if (primaryBookingId) {
        const bookingData = await getBookingById(primaryBookingId, authToken)
        paymentReceived = isBookingPaymentConfirmed(
          bookingData?.booking,
          selectedPayment?.paymentType || effectivePaymentType
        )
      }

      if (!paymentReceived) {
        setLocalError(
          statusResult?.message
          || (
            paymentMethod === 'MOMO'
              ? 'He thong chua nhan duoc thanh toan MoMo. Vui long hoan tat giao dich roi kiem tra lai.'
              : 'Hệ thống chưa nhận được thanh toán. Vui lòng đợi backend đồng bộ giao dịch rồi bấm "Kiểm tra thanh toán" lại sau.'
          )
        )
        return
      }

      settleSuccessfulPayment()
    } catch (err) {
      setLocalError(err?.message || 'Lỗi xác nhận thanh toán')
      console.error('Error confirming payment:', err)
    } finally {
      setStatusChecking(false)
    }
  }

  const handleRefreshQr = async () => {
    if (!selectedPayment?.id || qrRefreshing || loading) {
      return
    }

    try {
      setQrRefreshing(true)
      setLocalError('')

      if (!isPaidPaymentStatus(selectedPayment?.status)) {
        await cancelPayment(authToken, selectedPayment.id).catch(() => null)
      }

      const refreshPaymentType = normalizePaymentType(selectedPayment?.paymentType, effectivePaymentType)
      const refreshExpectedAmount =
        refreshPaymentType === 'FULL'
          ? normalizeAmount(totalPrice)
          : normalizeAmount(depositAmount)

      const refreshedPayment = withExpectedPaymentShape(
        await handleCreatePayment(
          primaryBookingId,
          selectedPayment?.method || 'MOMO',
          refreshPaymentType,
          refreshExpectedAmount,
          effectiveBookingIds
        ),
        refreshPaymentType,
        refreshExpectedAmount
      )

      const qr = await getQR(authToken, refreshedPayment.id)
      applyQrState(refreshedPayment, qr)
    } catch (err) {
      setLocalError(err?.message || 'Khong the lay lai QR')
      console.error('Error refreshing QR:', err)
    } finally {
      setQrRefreshing(false)
    }
  }

  const handleBackToForm = () => {
    clearPaymentFlow()
  }

  if (step === 'success') {
    return (
      <div className="payment-method-modal">
        <div className="modal-overlay" onClick={onClose} />
        <div className="modal-content success-modal">
          <div className="success-icon">✓</div>
          <h2>Thanh toán thành công!</h2>
          <p>Đơn đặt của bạn đã được xác nhận.</p>
        </div>
      </div>
    )
  }

  if (step === 'qr' && selectedPayment) {
    return (
      <PaymentQRModal
        payment={selectedPayment}
        qrImage={qrData?.qrImage}
        onConfirmPayment={handleConfirmPayment}
        onCancelPayment={handleBackToForm}
        onRefreshQR={handleRefreshQr}
        loading={loading || qrRefreshing || statusChecking}
        error={localError || error}
        onClose={handleBackToForm}
      />
    )
  }

  return (
    <div className="payment-method-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Chọn phương thức thanh toán</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <PaymentMethodForm
            bookingId={bookingId}
            totalPrice={totalPrice}
            depositAmount={depositAmount}
            onSubmit={handleFormSubmit}
            loading={loading}
            error={localError || error}
            defaultPaymentType={effectivePaymentType}
            hideFullPaymentOption={!isFullPayment}
            hideDepositOption={isFullPayment}
            hidePaymentTypeSection={isFullPayment}
            paymentTypeLabelOverride={paymentTypeLabelOverride}
            fixedPaymentNotice={fixedPaymentNotice}
          />
        </div>
      </div>
    </div>
  )
}

export default PaymentMethodModal
