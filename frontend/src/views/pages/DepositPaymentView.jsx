import React from "react"
import { Link } from "react-router-dom"

const formatDateTime = (value) => {
  if (!value) {
    return ""
  }

  try {
    return new Date(value).toLocaleString("vi-VN")
  } catch (_error) {
    return String(value || "")
  }
}

const DepositPaymentView = ({
  authToken,
  currentUser,
  booking,
  field,
  loading,
  error,
  feedback,
  actionLoading,
  paymentConfirmed,
  holdExpiresAt,
  holdExpired,
  countdownLabel,
  totalPrice,
  depositAmount,
  remainingAmount,
  selectedPaymentAmount,
  selectedRemainingAmount,
  paymentOption,
  paymentOptionLabel,
  paymentOptions,
  summary,
  formatPrice,
  formatStatus,
  formatDepositStatus,
  loginPath,
  bookingPath,
  currentPath,
  onConfirmStaticDeposit,
  onPaymentOptionChange,
  onRefresh,
  onGoToBookings,
  onGoToFields,
}) => {
  const loginState = {
    from: currentPath,
    message: "Đăng nhập để tiếp tục thanh toán đơn đặt sân.",
  }

  const fieldName = String(field?.name || booking?.fieldName || "").trim()
  const fieldAddress = String(field?.address || booking?.fieldAddress || "").trim()
  const depositStatusLabel = formatDepositStatus(booking?.depositStatus || booking?.paymentStatus)

  if (loading) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Đang tải trang thanh toán</h1>
        </div>
      </section>
    )
  }

  if (!authToken) {
    return (
      <section className="page section">
        <div className="container narrowContainer">
          <div className="formCard">
            <h1>Thanh toán đơn đặt sân</h1>
            <p className="message warning">
              Bạn cần <Link to={loginPath} state={loginState}>đăng nhập</Link> để xem và thanh toán đơn đặt sân này.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !booking) {
    return (
      <section className="page section">
        <div className="container narrowContainer">
          <div className="formCard">
            <h1>Thanh toán đơn đặt sân</h1>
            <p className="message error">{error || "Không tìm thấy đơn đặt sân cần thanh toán."}</p>
            <div className="depositActions">
              <button type="button" className="btn" onClick={onRefresh}>
                Tải lại
              </button>
              <Link className="outlineBtnLink" to={bookingPath}>
                Về sân đã đặt
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page section">
      <div className="container pageHeader">
        <h1>Thanh toán đơn đặt sân</h1>
      </div>

      <div className="container depositPage">
        {feedback?.text && (
          <p className={feedback.type === "success" ? "message success" : "message error"}>
            {feedback.text}
          </p>
        )}

        <section className="depositCard depositCard--summary">
          <div className="depositCardHeader">
            <div>
              <h2>Thông tin booking</h2>
              {currentUser && <p>Khách hàng: {currentUser.fullName || currentUser.email}</p>}
            </div>
            <div className="depositStatusGroup">
              <span className="depositStatus">Trạng thái đơn: {formatStatus(booking.status)}</span>
              <span className="depositStatus depositStatus--payment">
                Thanh toán: {depositStatusLabel}
              </span>
            </div>
          </div>

          <div className="depositDetailGrid">
            <p>
              <strong>Sân chính:</strong> {fieldName || "--"}
            </p>
            <p>
              <strong>Sân con:</strong> {booking.subFieldName || booking.subFieldKey || "--"}
            </p>
            <p>
              <strong>Ngày đặt:</strong> {summary.bookingDateLabel || "--"}
            </p>
            <p>
              <strong>Khung giờ:</strong> {summary.compactTimeSlot || "--"}
            </p>
            <p>
              <strong>Thời lượng:</strong> {summary.durationLabel || "--"}
            </p>
            <p>
              <strong>Địa chỉ:</strong> {fieldAddress || "--"}
            </p>
            {holdExpiresAt && (
              <p>
                <strong>Giữ chỗ đến:</strong> {formatDateTime(holdExpiresAt)}
              </p>
            )}
            <p>
              <strong>Mã booking:</strong> {booking.id}
            </p>
          </div>
        </section>

        <section className="depositCard depositCard--amount">
          <h2>Chi tiết thanh toán</h2>

          <div className="depositAmountGrid">
            <div className="depositAmountBox">
              <span>Tổng tiền sân</span>
              <strong>{formatPrice(totalPrice)} VND</strong>
            </div>

            <div className="depositAmountBox depositAmountBox--highlight">
              <span>Đặt cọc 40%</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div className="depositAmountBox">
              <span>Còn lại</span>
              <strong>{formatPrice(remainingAmount)} VND</strong>
            </div>
          </div>
        </section>

        {!paymentConfirmed && (
          <section className="depositCard depositCard--method">
            <div className="depositMethodHeader">
              <div>
                <h2>Xác nhận thanh toán</h2>
                <p>
                  Chọn thanh toán toàn bộ hoặc đặt cọc 40% tổng tiền. Nếu hết giờ giữ chỗ, slot sẽ mở lại cho người khác.
                </p>
              </div>
            </div>

            <div className="depositMethodGrid">
              {paymentOptions.map((option) => {
                const isSelected = paymentOption === option.id

                return (
                  <article
                    key={option.id}
                    className={`depositMethodCard${isSelected ? " depositMethodCard--selected" : ""}`}
                  >
                    <div className="depositMethodCardHeader">
                      <div>
                        <h3>{option.label}</h3>
                        <p>{option.description}</p>
                      </div>
                    </div>
                    <p>
                      <strong>Thanh toán:</strong> {formatPrice(option.amount)} VND
                    </p>
                    <p>
                      <strong>Còn lại:</strong> {formatPrice(option.remainingAmount)} VND
                    </p>
                    <button
                      type="button"
                      className="depositMethodButton"
                      onClick={() => onPaymentOptionChange(option.id)}
                      disabled={holdExpired}
                    >
                      {isSelected ? "Đang chọn" : "Chọn hình thức này"}
                    </button>
                  </article>
                )
              })}
            </div>

            <p className={holdExpired ? "message error" : "message warning"}>
              {holdExpired
                ? "Hết thời gian giữ chỗ. Vui lòng quay lại chọn giờ khác."
                : holdExpiresAt
                  ? `Còn lại ${countdownLabel} để xác nhận thanh toán.`
                  : "Đang đợi backend trả về thời gian giữ chỗ."}
            </p>

            <div className="depositActions">
              <button
                type="button"
                className="btn depositPrimaryBtn"
                disabled={actionLoading === "static" || holdExpired}
                onClick={onConfirmStaticDeposit}
              >
                {actionLoading === "static"
                  ? "Đang xác nhận..."
                  : holdExpired
                    ? "Hết thời gian giữ chỗ"
                    : `Xác nhận thanh toán ${paymentOptionLabel} ${formatPrice(selectedPaymentAmount)} VND`}
              </button>
            </div>
          </section>
        )}

        {paymentConfirmed && (
          <section className="depositCard depositSuccessBox">
            <p className="message success">Đơn đặt sân này đã được xác nhận thanh toán thành công.</p>
            <p>
              <strong>Đã thanh toán:</strong> {formatPrice(selectedPaymentAmount)} VND
            </p>
            <p>
              <strong>Còn lại:</strong> {formatPrice(selectedRemainingAmount)} VND
            </p>
            <div className="depositActions">
              <button type="button" className="btn" onClick={onGoToBookings}>
                Về sân đã đặt
              </button>
              <button type="button" className="outlineBtnInline" onClick={onGoToFields}>
                Đặt thêm sân khác
              </button>
            </div>
          </section>
        )}

        <section className="depositCard depositCard--footer">
          <div className="depositActions">
            <button type="button" className="outlineBtnInline" onClick={onRefresh}>
              Tải lại trạng thái
            </button>
            <button type="button" className="outlineBtnInline" onClick={onGoToBookings}>
              Về sân đã đặt
            </button>
            <button type="button" className="outlineBtnInline" onClick={onGoToFields}>
              Về danh sách sân
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

export default DepositPaymentView
