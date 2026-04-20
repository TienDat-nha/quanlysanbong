import React, { useEffect, useMemo, useState } from 'react'
import { usePaymentFlow } from '../hooks/usePaymentFlow'
import PaymentMethodForm from './PaymentMethodForm'
import PaymentQRModal from './PaymentQRModal'
import { checkPaymentStatus, getQR } from '../services/paymentService'
import './PaymentMethodModal.scss'

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
  const [localError, setLocalError] = useState('')
  
  // Chỉ lấy những gì thực sự dùng để tránh warning
  const { loading, error, handleCreatePayment } = usePaymentFlow(authToken)

  const effectiveBookingIds = useMemo(() => 
    Array.from(new Set([bookingId, ...bookingIds].filter(Boolean))), 
  [bookingId, bookingIds])

  const primaryId = effectiveBookingIds[0]

  // --- HÀM XỬ LÝ SUBMIT (MỞ MOMO TAB MỚI NGAY LẬP TỨC) ---
  const handleFormSubmit = async (_id, method, paymentFormType) => {
    try {
      setLocalError('')
      
      // 1. Tạo thanh toán trong Database
      const payment = await handleCreatePayment(
        primaryId,
        method,
        paymentFormType,
        effectiveBookingIds
      )

      // 2. Logic riêng cho MOMO
      if (method.toUpperCase() === 'MOMO') {
        // Gọi thêm API lấy Link thanh toán từ MoMo
        const qrRes = await getQR(authToken, payment.id)
        const actionUrl = qrRes?.payUrl || qrRes?.deeplink || payment?.payUrl || payment?.deeplink

        if (actionUrl) {
          window.open(actionUrl, '_blank') // Mở tab MoMo
          onPaymentSuccess?.({
            payment: { ...payment, ...qrRes },
            message: 'Đang mở cổng thanh toán MoMo ở tab mới...',
            messageType: 'success'
          })
          onClose() // Đóng modal luôn
          return
        } else {
          throw new Error("Hệ thống chưa lấy được liên kết MoMo. Vui lòng thử lại.")
        }
      }

      // 3. Logic cho TIỀN MẶT
      if (method.toUpperCase() === 'CASH') {
        onPaymentSuccess?.({
          payment,
          message: 'Yêu cầu thanh toán tại chỗ đã được gửi.',
          messageType: 'success'
        })
        onClose()
        return
      }

      // 4. Các phương thức khác (Hiện mã QR ngân hàng)
      const qrDataFromApi = await getQR(authToken, payment.id)
      setSelectedPayment({ ...payment, ...qrDataFromApi })
      setQrData(qrDataFromApi)
      setStep('qr')

    } catch (err) {
      setLocalError(err?.response?.data?.message || err.message)
    }
  }

  // --- LOGIC ĐỒNG BỘ TRẠNG THÁI ---
  useEffect(() => {
    if (step !== 'qr' || !selectedPayment?.id) return

    const interval = setInterval(async () => {
      try {
        const res = await checkPaymentStatus(authToken, selectedPayment.id)
        const status = res?.payment?.status?.toUpperCase()
        if (status === 'PAID' || status === 'SUCCESS') {
          clearInterval(interval)
          setStep('success')
          setTimeout(() => {
            onPaymentSuccess?.()
            onClose()
          }, 1500)
        }
      } catch (e) { console.error("Poll error", e) }
    }, 3000)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedPayment?.id, authToken])

  // --- GIAO DIỆN KHI THÀNH CÔNG ---
  if (step === 'success') {
    return (
      <div className="payment-method-modal">
        <div className="modal-overlay" onClick={onClose} />
        <div className="modal-content success-modal">
          <div className="success-icon" style={{fontSize: '50px', color: '#22c55e'}}>✓</div>
          <h2>Thanh toán thành công!</h2>
          <p>Hệ thống đã ghi nhận đơn đặt sân của bạn.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-method-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Chọn phương thức thanh toán</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>×</button>
        </div>
        <div className="modal-body">
          {step === 'form' ? (
            <PaymentMethodForm
              bookingId={primaryId}
              totalPrice={totalPrice}
              depositAmount={depositAmount}
              onSubmit={handleFormSubmit}
              loading={loading}
              error={localError || error}
              defaultPaymentType={paymentType}
              hideFullPaymentOption={!isFullPayment}
              hideDepositOption={isFullPayment}
              paymentTypeLabelOverride={paymentTypeLabelOverride}
              fixedPaymentNotice={fixedPaymentNotice}
            />
          ) : (
            <PaymentQRModal
              payment={selectedPayment}
              qrImage={qrData?.qrImage}
              onConfirmPayment={() => setStep('form')}
              onClose={() => setStep('form')}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentMethodModal