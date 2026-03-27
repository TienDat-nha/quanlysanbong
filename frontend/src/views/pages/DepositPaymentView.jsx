import React from "react"
import { Link } from "react-router-dom"

const formatPaidAt = (value) => {
  if (!value) {
    return ""
  }

  try {
    return new Date(value).toLocaleString("vi-VN")
  } catch (_error) {
    return value
  }
}

const PaymentMethodCard = ({
  title,
  description,
  enabled,
  disabledMessage,
  loading,
  loadingLabel,
  buttonLabel,
  onClick,
}) => (
  <article className={`depositMethodCard${enabled ? "" : " depositMethodCard--disabled"}`}>
    <div className="depositMethodCardHeader">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {!enabled && disabledMessage && <span className="depositMethodBadge">{disabledMessage}</span>}
    </div>

    {enabled ? (
      <button type="button" className="btn depositMethodButton" disabled={loading} onClick={onClick}>
        {loading ? loadingLabel : buttonLabel}
      </button>
    ) : (
      <p className="helperText">{disabledMessage || "Phương thức này tạm thời không khả dụng."}</p>
    )}
  </article>
)

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
  paymentMethods,
  staticTransfer,
  totalPrice,
  depositAmount,
  remainingAmount,
  summary,
  formatPrice,
  formatStatus,
  formatDepositStatus,
  formatPaymentStatus,
  formatDepositMethod,
  loginPath,
  bookingPath,
  fieldsPath,
  currentPath,
  onConfirmStaticDeposit,
  onCreateVnpayPayment,
  onCreateMomoPayment,
  onRefresh,
  onGoToBookings,
  onGoToFields,
}) => {
  const loginState = {
    from: currentPath,
    message: "Đăng nhập để tiếp tục thanh toán booking.",
  }

  const paymentStatus = String(
    booking?.paymentStatus || (booking?.depositPaid ? "paid" : "unpaid")
  )
    .trim()
    .toLowerCase()
  const isFullyPaid = paymentStatus === "paid" || Boolean(booking?.fullyPaid)
  const paymentStatusLabel = formatPaymentStatus(booking?.paymentStatus, booking?.depositStatus)
  const depositStatusLabel = formatDepositStatus(booking?.depositStatus || booking?.paymentStatus)
  const successMessage = isFullyPaid
    ? "Payment cho booking này đã được xác nhận thành công."
    : "Yêu cầu payment đã được tạo."

  if (loading) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Đang tải trang thanh toán</h1>
          <p>Hệ thống đang tải thông tin booking và trạng thái payment hiện tại.</p>
        </div>
      </section>
    )
  }

  if (!authToken) {
    return (
      <section className="page section">
        <div className="container narrowContainer">
          <div className="formCard">
            <h1>Thanh toán booking</h1>
            <p className="message warning">
              Bạn cần <Link to={loginPath} state={loginState}>đăng nhập</Link> để xem và thanh toán
              booking này.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (error || !booking || !field) {
    return (
      <section className="page section">
        <div className="container narrowContainer">
          <div className="formCard">
            <h1>Thanh toán booking</h1>
            <p className="message error">{error || "Không tìm thấy booking cần thanh toán."}</p>
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
        <h1>Thanh toán booking</h1>
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
                Payment: {paymentStatusLabel}
              </span>
            </div>
          </div>

          <div className="depositDetailGrid">
            <p>
              <strong>Sân chính:</strong> {field.name}
            </p>
            <p>
              <strong>Sân con:</strong> {booking.subFieldName || booking.subFieldKey}
            </p>
            <p>
              <strong>Ngày đặt:</strong> {summary.bookingDateLabel}
            </p>
            <p>
              <strong>Khung giờ:</strong> {summary.compactTimeSlot}
            </p>
            <p>
              <strong>Thời lượng:</strong> {summary.durationLabel}
            </p>
            <p>
              <strong>Địa chỉ:</strong> {field.address}
            </p>
            <p>
              <strong>Trạng thái payment:</strong> {depositStatusLabel}
            </p>
            {booking.depositMethod && (
              <p>
                <strong>Phương thức:</strong> {formatDepositMethod(booking.depositMethod)}
              </p>
            )}
            {booking.depositPaidAt && (
              <p>
                <strong>Thời gian xác nhận:</strong> {formatPaidAt(booking.depositPaidAt)}
              </p>
            )}
            {booking.fullyPaidAt && (
              <p>
                <strong>Thanh toán hoàn tất lúc:</strong> {formatPaidAt(booking.fullyPaidAt)}
              </p>
            )}
          </div>
        </section>

        <section className="depositCard depositCard--amount">
          <h2>Chi tiết payment</h2>

          <div className="depositAmountGrid">
            <div className="depositAmountBox">
              <span>Tổng tiền sân</span>
              <strong>{formatPrice(totalPrice)} VND</strong>
            </div>

            <div className="depositAmountBox depositAmountBox--highlight">
              <span>Giá trị payment</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div className="depositAmountBox">
              <span>Còn lại</span>
              <strong>{formatPrice(remainingAmount)} VND</strong>
            </div>
          </div>

        </section>

        {paymentConfirmed ? (
          <section className="depositCard depositSuccessBox">
            <p className="message success">{successMessage}</p>
            <div className="depositActions">
              <button type="button" className="btn" onClick={onGoToBookings}>
                Về sân đã đặt
              </button>
              <button type="button" className="outlineBtnInline" onClick={onGoToFields}>
                Đặt thêm sân khác
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="depositCard depositCard--method">
              <div className="depositMethodHeader">
                <div>
                  <h2>Tạo payment cơ bản</h2>
                </div>
              </div>

              <div className="depositTransferGrid">
                <div className="depositTransferInfo">
                  <p>
                    <strong>Kênh:</strong> {staticTransfer?.bankName || "Payment backend"}
                  </p>
                  <p>
                    <strong>Mã payment:</strong> {staticTransfer?.accountNumber || "Chưa tạo"}
                  </p>
                  <p>
                    <strong>Loại:</strong> {staticTransfer?.accountName || "CASH"}
                  </p>
                  <p>
                    <strong>Mã booking:</strong> {staticTransfer?.transferNote || "-"}
                  </p>
                  <p>
                    <strong>Số tiền:</strong> {formatPrice(staticTransfer?.amount || depositAmount)} VND
                  </p>
                </div>

                <div className="depositQrBox">
                  {staticTransfer?.qrImageUrl ? (
                    <img
                      src={staticTransfer.qrImageUrl}
                      alt="QR thanh toán booking"
                      className="depositQrImage"
                    />
                  ) : (
                    <div className="depositQrPlaceholder">Backend chưa trả QR.</div>
                  )}
                </div>
              </div>

              <div className="depositActions">
                <button
                  type="button"
                  className="btn depositPrimaryBtn"
                  disabled={!paymentMethods?.staticTransfer?.enabled || actionLoading === "static"}
                  onClick={onConfirmStaticDeposit}
                >
                  {actionLoading === "static"
                    ? "Đang tạo payment..."
                    : `Tạo payment ${formatPrice(depositAmount)} VND`}
                </button>
                {paymentMethods?.staticTransfer?.message && (
                  <p className="helperText">{paymentMethods.staticTransfer.message}</p>
                )}
              </div>
            </section>

            <section className="depositCard">
              <h2>Thanh toán QR</h2>
              <div className="depositMethodGrid">
                <PaymentMethodCard
                  title="Tạo QR"
                  enabled={Boolean(paymentMethods?.vnpay?.enabled)}
                  disabledMessage={paymentMethods?.vnpay?.message}
                  loading={actionLoading === "vnpay"}
                  loadingLabel="Đang tạo QR..."
                  buttonLabel={`Tạo QR ${formatPrice(depositAmount)} VND`}
                  onClick={onCreateVnpayPayment}
                />

                <PaymentMethodCard
                  title="Mở QR"
                  enabled={Boolean(paymentMethods?.momo?.enabled) || Boolean(staticTransfer?.qrImageUrl)}
                  disabledMessage={paymentMethods?.momo?.message}
                  loading={actionLoading === "momo"}
                  loadingLabel="Đang mở QR..."
                  buttonLabel={staticTransfer?.qrImageUrl ? "Mở QR thanh toán" : "Tạo / lấy QR"}
                  onClick={onCreateMomoPayment}
                />
              </div>
            </section>
          </>
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
