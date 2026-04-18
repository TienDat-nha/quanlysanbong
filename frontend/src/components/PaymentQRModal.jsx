import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { calculateCountdown, formatDateTimeVi, getPaymentStatusInfo } from '../utils/paymentHelpers'
import { getEffectivePaymentStatus } from '../models/paymentModel'
import PaymentStatusBadge from './PaymentStatusBadge'
import './PaymentQRModal.scss'

const isDirectImageUrl = (value = '') => {
  const normalizedValue = String(value || '').trim()

  if (!normalizedValue) {
    return false
  }

  if (/^data:image\//i.test(normalizedValue)) {
    return true
  }

  try {
    const parsedUrl = new URL(normalizedValue)
    if (parsedUrl.hostname === 'api.qrserver.com') {
      return false
    }

    return parsedUrl.hostname === 'img.vietqr.io'
      || /\.(png|jpe?g|gif|webp|svg)$/i.test(parsedUrl.pathname)
  } catch (_error) {
    return false
  }
}

const getQrServerPayload = (value = '') => {
  try {
    const parsedUrl = new URL(String(value || '').trim())
    return parsedUrl.hostname === 'api.qrserver.com'
      ? String(parsedUrl.searchParams.get('data') || '').trim()
      : ''
  } catch (_error) {
    return ''
  }
}

const getDirectQrImageUrl = (payment, qrImage) => {
  const rawQrImage = String(qrImage || payment?.qrImage || '').trim()

  return isDirectImageUrl(rawQrImage) ? rawQrImage : ''
}

const getQrPayload = (payment, qrImage) => {
  const rawQrImage = String(qrImage || payment?.qrImage || '').trim()
  const qrText = String(payment?.qrText || '').trim()

  return qrText || getQrServerPayload(rawQrImage) || (isDirectImageUrl(rawQrImage) ? '' : rawQrImage)
}

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
  const effectiveStatus = getEffectivePaymentStatus(payment?.status, payment?.expiredAt, payment?.createdAt)
  const paymentStatusInfo = getPaymentStatusInfo(payment?.status, payment?.expiredAt, payment?.createdAt)
  const directQrImage = getDirectQrImageUrl(payment, qrImage)
  const qrPayload = directQrImage ? '' : getQrPayload(payment, qrImage)
  const displayQrImage = directQrImage || localQrDataUrl
  const momoActionUrl = String(payment?.deeplink || payment?.payUrl || '').trim()
  const isMomoPayment = String(payment?.method || '').trim().toUpperCase() === 'MOMO'
  const confirmButtonLabel = isMomoPayment ? 'Kiểm tra ngay' : 'Kiểm tra thanh toán'

  useEffect(() => {
    if (!payment?.expiredAt) return undefined

    const updateCountdown = () => {
      const cd = calculateCountdown(payment.expiredAt)
      setCountdown(cd)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [payment?.expiredAt])

  useEffect(() => {
    let active = true

    setLocalQrDataUrl('')
    setQrRenderError('')

    if (!qrPayload) {
      return () => {
        active = false
      }
    }

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (active) {
          setLocalQrDataUrl(dataUrl)
        }
      })
      .catch(() => {
        if (active) {
          setQrRenderError('Không thể tạo mã QR trên trình duyệt. Vui lòng tải lại QR.')
        }
      })

    return () => {
      active = false
    }
  }, [qrPayload])

  const isExpired = countdown?.isExpired || false
  const canCancel = effectiveStatus === 'PENDING' && !isExpired
  const canRefreshQr = effectiveStatus !== 'PAID' && !confirmCancel
  const canConfirmPayment = effectiveStatus !== 'PAID' && !confirmCancel

  const handleConfirmPayment = () => {
    if (loading) return
    onConfirmPayment(payment.id)
  }

  const handleCancelPayment = () => {
    if (!canCancel) return
    setConfirmCancel(false)
    onCancelPayment(payment.id)
  }

  const handleOpenMomo = () => {
    if (!momoActionUrl || loading || typeof window === 'undefined') {
      return
    }

    window.open(momoActionUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="payment-qr-modal">
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-content">
        <div className="modal-header">
          <h2>Thanh toán QR</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="section status-section">
            <PaymentStatusBadge
              status={payment?.status}
              expiredAt={payment?.expiredAt}
              createdAt={payment?.createdAt}
            />
            <span className="payment-id" title={payment?.id}>
              ID: {payment?.id?.slice(0, 12)}...
            </span>
          </div>

          {displayQrImage && (
            <div className="qr-container">
              <img src={displayQrImage} alt="Payment QR" className="qr-image" />
              {isExpired && <div className="qr-expired-overlay">Hết hạn</div>}
            </div>
          )}

          {!displayQrImage && qrPayload && !qrRenderError && (
            <div className="info-message">Đang tạo mã QR trên trình duyệt...</div>
          )}

          {countdown && !isExpired && (
            <div className="countdown-section">
              <p className="countdown-label">Hết hạn trong:</p>
              <div className="countdown-display">
                {String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
              </div>
            </div>
          )}

          {isExpired && !displayQrImage && (
            <div className="expired-message">QR code đã hết hạn</div>
          )}

          {isExpired && (
            <div className="info-message">
              Mã QR đã hết hạn. Bấm "Tải lại QR" để tạo mã mới.
            </div>
          )}

          <div className="payment-info">
            <div className="info-row">
              <span className="label">Booking ID:</span>
              <span className="value" title={payment?.bookingId}>
                {payment?.bookingId?.slice(0, 16)}...
              </span>
            </div>
            <div className="info-row">
              <span className="label">Số tiền:</span>
              <span className="value">{payment?.amount?.toLocaleString('vi-VN')}₫</span>
            </div>
            <div className="info-row">
              <span className="label">Phương thức:</span>
              <span className="value">{payment?.method}</span>
            </div>
            <div className="info-row">
              <span className="label">Loại:</span>
              <span className="value">{payment?.paymentType}</span>
            </div>
            {isMomoPayment && payment?.transactionCode && (
              <div className="info-row">
                <span className="label">Mã MoMo:</span>
                <span className="value" title={payment.transactionCode}>
                  {payment.transactionCode}
                </span>
              </div>
            )}
            <div className="info-row">
              <span className="label">Tạo lúc:</span>
              <span className="value">{formatDateTimeVi(payment?.createdAt)}</span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}
          {qrRenderError && <div className="error-message">{qrRenderError}</div>}

          {paymentStatusInfo?.color === 'warning' && !isExpired && (
            <div className="info-message">
              {isMomoPayment
                ? 'Sau khi thanh toán xong trên MoMo, hệ thống sẽ tự xác nhận trong vài giây khi nhận IPN. Nếu cần đồng bộ ngay, bạn vẫn có thể bấm "Kiểm tra ngay".'
                : 'Sau khi chuyển khoản xong, bấm "Kiểm tra thanh toán". Nếu hệ thống chưa nhận được giao dịch, trạng thái vẫn sẽ là chưa thanh toán.'}
            </div>
          )}

          {isMomoPayment && momoActionUrl && !isExpired && (
            <div className="info-message">
              Bạn có thể quét QR bằng MoMo hoặc bấm "Mở MoMo" để chuyển sang ví sandbox.
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Đóng
          </button>

          {canRefreshQr && (
            <button
              className="btn btn-warning"
              onClick={onRefreshQR}
              disabled={loading}
              title="Tạo lại mã QR"
            >
              {loading ? '...' : (isExpired ? 'Tải lại QR' : 'Lấy lại QR')}
            </button>
          )}

          {canConfirmPayment && (
            <button
              className="btn btn-success"
              onClick={handleConfirmPayment}
              disabled={loading}
            >
              {loading ? '...' : confirmButtonLabel}
            </button>
          )}

          {!isExpired && (
            <>
              {isMomoPayment && momoActionUrl && (
                <button
                  className="btn btn-primary"
                  onClick={handleOpenMomo}
                  disabled={loading}
                >
                  Mở MoMo
                </button>
              )}

              {canCancel && !confirmCancel && (
                <button
                  className="btn btn-danger"
                  onClick={() => setConfirmCancel(true)}
                  disabled={loading}
                >
                  Hủy thanh toán
                </button>
              )}

              {confirmCancel && (
                <>
                  <button
                    className="btn btn-danger-confirm"
                    onClick={handleCancelPayment}
                    disabled={loading}
                  >
                    {loading ? '...' : 'Xác nhận hủy'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setConfirmCancel(false)}
                    disabled={loading}
                  >
                    Quay lại
                  </button>
                </>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentQRModal
