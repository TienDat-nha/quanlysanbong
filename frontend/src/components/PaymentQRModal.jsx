/* eslint-disable */
import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { calculateCountdown, formatDateTimeVi, getPaymentStatusInfo } from '../utils/paymentHelpers'
import { getEffectivePaymentStatus } from '../models/paymentModel'
import PaymentStatusBadge from './PaymentStatusBadge'
import './PaymentQRModal.scss'

const PaymentQRModal = ({
  payment,
  qrImage,
  onConfirmPayment,
  onCancelPayment,
  onRefreshQR,
  loading = false,
  error = '',
  onClose,
}) => {
  const [countdown, setCountdown] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [localQrDataUrl, setLocalQrDataUrl] = useState('')
  const [qrRenderError, setQrRenderError] = useState('')

  // --- TIN TƯỞNG DỮ LIỆU TỪ SERVER ---
  const effectiveStatus = payment?.status?.toUpperCase() || 'PENDING'
  const isMomoPayment = payment?.method?.toUpperCase() === 'MOMO'
  const momoActionUrl = payment?.payUrl || payment?.deeplink || ''
  
  // Lấy nội dung để tạo mã QR (Dữ liệu thô từ BE)
  const qrPayload = qrImage || payment?.qrText || payment?.qrImage || ''

  // Logic Countdown dựa trên thời gian hết hạn của BE
  useEffect(() => {
    if (!payment?.expiredAt) return
    const updateCountdown = () => {
      const cd = calculateCountdown(payment.expiredAt)
      setCountdown(cd)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [payment?.expiredAt])

  // Logic tạo mã QR bằng thư viện QRCode
  useEffect(() => {
    let active = true
    if (!qrPayload || isMomoPayment) return // MoMo thường dùng link redirect thay vì QR tự tạo

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
    })
      .then((dataUrl) => { if (active) setLocalQrDataUrl(dataUrl) })
      .catch(() => { if (active) setQrRenderError('Lỗi tạo mã QR.') })

    return () => { active = false }
  }, [qrPayload, isMomoPayment])

  const isExpired = countdown?.isExpired || false

  return (
    <div className="payment-qr-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Thanh toán {payment?.method}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="status-banner">
            <PaymentStatusBadge status={effectiveStatus} />
            <span className="payment-id">Mã GD: {payment?.id?.slice(-8)}</span>
          </div>

          {/* HIỂN THỊ MÃ QR */}
          <div className="qr-wrapper">
            {(isMomoPayment && payment?.qrImage) ? (
              <img src={payment.qrImage} alt="Momo QR" className="qr-image" />
            ) : localQrDataUrl ? (
              <img src={localQrDataUrl} alt="Payment QR" className="qr-image" />
            ) : (
              <div className="qr-placeholder">{loading ? 'Đang tải...' : 'Chờ mã QR'}</div>
            )}
            {isExpired && <div className="qr-expired-overlay">Mã đã hết hạn</div>}
          </div>

          {countdown && !isExpired && (
            <div className="countdown-timer">
              Thanh toán trong: <strong>{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}</strong>
            </div>
          )}

          <div className="payment-details">
            <div className="detail-row">
              <span>Số tiền:</span>
              {/* QUAN TRỌNG: Hiện đúng con số BE trả về */}
              <strong className="amount">{payment?.amount?.toLocaleString('vi-VN')}₫</strong>
            </div>
            <div className="detail-row">
              <span>Nội dung:</span>
              <code className="transfer-code">{payment?.id?.slice(0, 10)}</code>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Đóng</button>
          
          {isMomoPayment && momoActionUrl && !isExpired && (
            <button className="btn-momo" onClick={() => window.open(momoActionUrl, '_blank')}>
              Mở Ví MoMo
            </button>
          )}

          {!isExpired && effectiveStatus !== 'PAID' && (
            <button className="btn-success" onClick={() => onConfirmPayment(payment.id)} disabled={loading}>
              {loading ? 'Đang check...' : 'Kiểm tra thanh toán'}
            </button>
          )}

          {isExpired && (
            <button className="btn-warning" onClick={onRefreshQR}>Tải lại QR mới</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentQRModal