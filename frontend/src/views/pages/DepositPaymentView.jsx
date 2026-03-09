import React from "react"
import { Link } from "react-router-dom"

const PAYMENT_NOTES = [
  "Tiền đặt cọc tối thiểu mặc định là 100.000 VND cho mỗi đơn đặt sân.",
  "VNPAY và MoMo sẽ cập nhật trạng thái sau khi cổng thanh toán trả kết quả thành công.",
  "Với chuyển khoản hoặc QR tĩnh, khách chỉ gửi yêu cầu thanh toán; chủ sân sẽ xác nhận sau khi kiểm tra giao dịch.",
]

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
        <p>{description}</p>
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
    message: "Đăng nhập để tiếp tục thanh toán đặt cọc.",
  }

  const paymentStatus = String(
    booking?.paymentStatus || (booking?.depositPaid ? "deposit_paid" : "unpaid")
  )
    .trim()
    .toLowerCase()
  const isFullyPaid = paymentStatus === "paid" || Boolean(booking?.fullyPaid)
  const paymentStatusLabel = formatPaymentStatus(booking?.paymentStatus, booking?.depositStatus)
  const depositStatusLabel = formatDepositStatus(booking?.depositStatus)
  const successMessage = isFullyPaid
    ? "Chủ sân đã xác nhận thanh toán thành công cho đơn này. Bạn không cần thanh toán thêm."
    : "Chủ sân đã xác nhận đặt cọc thành công cho đơn này. Bạn có thể theo dõi phần còn lại tại mục Sân đã đặt."

  if (loading) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Đang tải trang thanh toán</h1>
          <p>Hệ thống đang tải thông tin đơn đặt sân và trạng thái thanh toán hiện tại.</p>
        </div>
      </section>
    )
  }

  if (!authToken) {
    return (
      <section className="page section">
        <div className="container narrowContainer">
          <div className="formCard">
            <h1>Thanh toán đặt cọc</h1>
            <p className="message warning">
              Bạn cần <Link to={loginPath} state={loginState}>đăng nhập</Link> để xem và thanh
              toán đơn đặt sân này.
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
            <h1>Thanh toán đặt cọc</h1>
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
        <h1>Thanh toán đặt cọc</h1>
        <p>Đơn đặt sân đã được tạo. Bạn có thể theo dõi trạng thái thanh toán và gửi yêu cầu xác nhận tại đây.</p>
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
              <h2>Thông tin đơn đặt sân</h2>
              {currentUser && <p>Khách hàng: {currentUser.fullName || currentUser.email}</p>}
            </div>
            <div className="depositStatusGroup">
              <span className="depositStatus">Trạng thái đơn: {formatStatus(booking.status)}</span>
              <span className="depositStatus depositStatus--payment">
                Thanh toán: {paymentStatusLabel}
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
              <strong>Trạng thái đặt cọc:</strong> {depositStatusLabel}
            </p>
            {booking.depositMethod && (
              <p>
                <strong>Kênh đã dùng:</strong> {formatDepositMethod(booking.depositMethod)}
              </p>
            )}
            {booking.depositPaidAt && (
              <p>
                <strong>Xác nhận cọc lúc:</strong> {formatPaidAt(booking.depositPaidAt)}
              </p>
            )}
            {booking.fullyPaidAt && (
              <p>
                <strong>Xác nhận thanh toán lúc:</strong> {formatPaidAt(booking.fullyPaidAt)}
              </p>
            )}
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
              <span>Tiền đặt cọc</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div className="depositAmountBox">
              <span>Còn lại</span>
              <strong>{formatPrice(remainingAmount)} VND</strong>
            </div>
          </div>

          <section className="depositNoteBox">
            <strong>Lưu ý</strong>
            <ul>
              {PAYMENT_NOTES.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
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
                  <h2>Chuyển khoản / QR tĩnh</h2>
                  <p>Phù hợp khi bạn muốn chuyển khoản thủ công rồi chờ chủ sân xác nhận giao dịch.</p>
                </div>
              </div>

              <div className="depositTransferGrid">
                <div className="depositTransferInfo">
                  <p>
                    <strong>Ngân hàng:</strong> {staticTransfer?.bankName || "Chưa cấu hình"}
                    {staticTransfer?.bankCode ? ` (${staticTransfer.bankCode})` : ""}
                  </p>
                  <p>
                    <strong>Số tài khoản:</strong> {staticTransfer?.accountNumber || "Chưa cấu hình"}
                  </p>
                  <p>
                    <strong>Chủ tài khoản:</strong> {staticTransfer?.accountName || "Chưa cấu hình"}
                  </p>
                  <p>
                    <strong>Nội dung CK:</strong> {staticTransfer?.transferNote || "-"}
                  </p>
                  <p>
                    <strong>Số tiền:</strong> {formatPrice(staticTransfer?.amount || depositAmount)} VND
                  </p>
                </div>

                <div className="depositQrBox">
                  {staticTransfer?.qrImageUrl ? (
                    <img
                      src={staticTransfer.qrImageUrl}
                      alt="QR chuyển khoản đặt cọc"
                      className="depositQrImage"
                    />
                  ) : (
                    <div className="depositQrPlaceholder">
                      Chưa cấu hình ảnh QR tĩnh. Bạn vẫn có thể chuyển khoản thủ công theo thông tin bên trái.
                    </div>
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
                    ? "Đang gửi yêu cầu..."
                    : `Tôi đã chuyển khoản ${formatPrice(depositAmount)} VND`}
                </button>
                {paymentMethods?.staticTransfer?.message && (
                  <p className="helperText">{paymentMethods.staticTransfer.message}</p>
                )}
              </div>
            </section>

            <section className="depositCard">
              <h2>Thanh toán trực tuyến</h2>
              <div className="depositMethodGrid">
                <PaymentMethodCard
                  title="VNPAY"
                  description="Tạo link thanh toán VNPAY và cập nhật trạng thái khi hệ thống nhận callback thành công."
                  enabled={Boolean(paymentMethods?.vnpay?.enabled)}
                  disabledMessage={paymentMethods?.vnpay?.message}
                  loading={actionLoading === "vnpay"}
                  loadingLabel="Đang chuyển đến VNPAY..."
                  buttonLabel={`Thanh toán ${formatPrice(depositAmount)} VND bằng VNPAY`}
                  onClick={onCreateVnpayPayment}
                />

                <PaymentMethodCard
                  title="MoMo"
                  description="Tạo liên kết thanh toán MoMo và cập nhật trạng thái khi giao dịch thành công."
                  enabled={Boolean(paymentMethods?.momo?.enabled)}
                  disabledMessage={paymentMethods?.momo?.message}
                  loading={actionLoading === "momo"}
                  loadingLabel="Đang chuyển đến MoMo..."
                  buttonLabel={`Thanh toán ${formatPrice(depositAmount)} VND bằng MoMo`}
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
