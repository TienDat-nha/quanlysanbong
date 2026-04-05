import React from 'react'
import {
  formatDateTimeVi,
  formatCurrencyVi,
  getPaymentMethodLabel,
  getPaymentTypeLabel,
} from '../../utils/paymentHelpers'
import PaymentStatusBadge from '../../components/PaymentStatusBadge'
import './MyPaymentsView.scss'

const MyPaymentsView = ({
  payments = [],
  loading = false,
  error = '',
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
          🔄
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}

      {loading && <p className="loading-text">Đang tải danh sách thanh toán...</p>}

      {!loading && payments.length === 0 && (
        <div className="empty-state">
          <p>Bạn chưa có lịch sử thanh toán nào</p>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="payments-list">
          {payments.map((payment) => {
            const isPending = payment.status === 'PENDING'
            const isCancelling = cancelling[payment.id]

            return (
              <div key={payment.id} className="payment-item">
                <div className="payment-main">
                  <div className="payment-info">
                    <div className="info-row">
                      <span className="label">Booking:</span>
                      <span className="value bookmark-id" title={payment.bookingId}>
                        {payment.bookingId?.slice(0, 12)}...
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Phương thức:</span>
                      <span className="value">
                        {getPaymentMethodLabel(payment.method)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Loại:</span>
                      <span className="value">
                        {getPaymentTypeLabel(payment.paymentType)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Số tiền:</span>
                      <span className="value amount">
                        {formatCurrencyVi(payment.amount)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Ngày:</span>
                      <span className="value">
                        {formatDateTimeVi(payment.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="payment-status">
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                </div>

                <div className="payment-actions">
                  {isPending && (
                    <button
                      className="btn btn-action btn-view-qr"
                      onClick={() => onViewQR(payment)}
                      disabled={loading}
                    >
                      Xem QR
                    </button>
                  )}

                  {isPending && (
                    <button
                      className="btn btn-action btn-cancel"
                      onClick={() => onCancel(payment)}
                      disabled={loading || isCancelling}
                    >
                      {isCancelling ? 'Đang huỷ...' : 'Huỷ'}
                    </button>
                  )}

                  {payment.status !== 'PENDING' && (
                    <span className="action-placeholder">Không thể thao tác</span>
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
