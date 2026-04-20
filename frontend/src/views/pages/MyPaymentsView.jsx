import React from 'react'
import {
  formatDateTimeVi,
  formatCurrencyVi,
  getPaymentMethodLabel,
  getPaymentTypeLabel,
} from '../../utils/paymentHelpers'
// LƯU Ý: Đã loại bỏ import getEffectivePaymentStatus vì FE không tự tính trạng thái nữa
import PaymentStatusBadge from '../../components/PaymentStatusBadge'
import './MyPaymentsView.scss'

const MyPaymentsView = ({
  payments = [],
  loading = false,
  error = '',
  feedback = null,
  onViewQR,
  onCancel,
  onRefresh,
  cancelling = {},
}) => {
  return (
    <div className="my-payments-view">
      <div className="payments-header">
        <h1>Lịch sử thanh toán</h1>
        <button
          className="btn btn-refresh"
          onClick={onRefresh}
          disabled={loading}
          title="Làm mới danh sách"
        >
          🔄 Tải lại
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      
      {feedback?.text && (
        <div className={`alert alert--${feedback.type || 'warning'}`}>
          {feedback.text}
        </div>
      )}

      {loading && <div className="loading-state">Đang tải danh sách thanh toán...</div>}

      {!loading && payments.length === 0 && (
        <div className="empty-state">
          <p>Bạn chưa có giao dịch thanh toán nào.</p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="payments-list">
          {payments.map((payment) => {
            // --- THAY ĐỔI QUAN TRỌNG: Lấy status trực tiếp từ Backend ---
            const status = String(payment.status || 'PENDING').toUpperCase()
            const isPending = status === 'PENDING'
            const method = String(payment.method || '').toUpperCase()
            
            // Chỉ hiện nút thanh toán nếu đơn đang chờ và không phải trả tiền mặt
            const canAction = isPending && method !== 'CASH'
            const isCancelling = cancelling[payment.id]

            return (
              <div key={payment.id} className={`payment-item status-${status.toLowerCase()}`}>
                <div className="payment-main">
                  <div className="payment-info">
                    <div className="info-row">
                      <span className="label">Mã Booking:</span>
                      <span className="value code-text">{payment.bookingId?.slice(-10)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Hình thức:</span>
                      <span className="value">{getPaymentMethodLabel(payment.method)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Nội dung:</span>
                      <span className="value">{getPaymentTypeLabel(payment.paymentType)}</span>
                    </div>
                    <div className="info-row amount-row">
                      <span className="label">Số tiền:</span>
                      <span className="value amount-text">{formatCurrencyVi(payment.amount)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Thời gian:</span>
                      <span className="value">{formatDateTimeVi(payment.createdAt)}</span>
                    </div>
                  </div>

                  <div className="payment-status-area">
                    <PaymentStatusBadge
                      status={payment.status}
                      expiredAt={payment.expiredAt}
                      createdAt={payment.createdAt}
                    />
                  </div>
                </div>

                <div className="payment-footer-actions">
                  {canAction && (
                    <button
                      className="btn-action btn-pay"
                      onClick={() => onViewQR(payment)}
                      disabled={loading || isCancelling}
                    >
                      {method === 'MOMO' ? 'Tiếp tục thanh toán MoMo' : 'Xem mã QR'}
                    </button>
                  )}

                  {isPending && (
                    <button
                      className="btn-action btn-cancel-payment"
                      onClick={() => onCancel(payment.id)}
                      disabled={loading || isCancelling}
                    >
                      {isCancelling ? 'Đang hủy...' : 'Hủy yêu cầu'}
                    </button>
                  )}

                  {!isPending && (
                    <span className="status-note">Giao dịch đã đóng</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyPaymentsView