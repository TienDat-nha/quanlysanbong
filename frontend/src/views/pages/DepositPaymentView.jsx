import React from "react"
import { Link } from "react-router-dom"

const PAYMENT_NOTES = [
  "Tiền đặt cọc tối thiểu mặc định là 100.000 VND cho mỗi đơn đặt sân.",
  "VNPAY và MoMo chỉ cập nhật `depositPaid` sau khi cổng thanh toán trả callback thành công.",
  "Với chuyển khoản / QR tĩnh, hệ thống sẽ đánh dấu đã đặt cọc ngay sau khi bạn bấm xác nhận thanh toán.",
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

  if (loading) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Đang tải trang đặt cọc</h1>
          <p>Hệ thống đang tải thông tin đơn đặt sân, mức đặt cọc và các kênh thanh toán.</p>
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
              toán đặt cọc cho đơn đặt sân này.
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
            <p className="message error">{error || "Không tìm thấy đơn đặt sân cần đặt cọc."}</p>
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
        <p>Đơn đặt sân đã được tạo. Chọn một kênh thanh toán để đặt cọc trước và giữ lịch sân.</p>
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
                Đặt cọc: {formatDepositStatus(booking.depositStatus)}
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
            {booking.depositMethod && (
              <p>
                <strong>Kênh đã dùng:</strong> {formatDepositMethod(booking.depositMethod)}
              </p>
            )}
            {booking.depositPaidAt && (
              <p>
                <strong>Ghi nhận lúc:</strong> {formatPaidAt(booking.depositPaidAt)}
              </p>
            )}
          </div>
        </section>

        <section className="depositCard depositCard--amount">
          <h2>Chi tiết đặt cọc</h2>

          <div className="depositAmountGrid">
            <div className="depositAmountBox">
              <span>Tổng tiền sân</span>
              <strong>{formatPrice(totalPrice)} VND</strong>
            </div>

            <div className="depositAmountBox depositAmountBox--highlight">
              <span>Cần đặt cọc trước</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div className="depositAmountBox">
              <span>Còn lại tại sân</span>
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
            <p className="message success">
              Hệ thống đã lưu trạng thái đã đặt cọc cho đơn này. Bạn có thể quay về mục Sân đã
              đặt để theo dõi.
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
        ) : (
          <>
            <section className="depositCard depositCard--method">
              <div className="depositMethodHeader">
                <div>
                  <h2>Chuyển khoản / QR tĩnh</h2>
                  <p>Phù hợp khi bạn muốn chuyển khoản thủ công vào tài khoản đã cấu hình.</p>
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
                    ? "Đang ghi nhận..."
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
                  description="Tạo link redirect sang cổng thanh toán VNPAY và đợi callback từ provider."
                  enabled={Boolean(paymentMethods?.vnpay?.enabled)}
                  disabledMessage={paymentMethods?.vnpay?.message}
                  loading={actionLoading === "vnpay"}
                  loadingLabel="Đang chuyển đến VNPAY..."
                  buttonLabel={`Thanh toan ${formatPrice(depositAmount)} VND bang VNPAY`}
                  onClick={onCreateVnpayPayment}
                />

                <PaymentMethodCard
                  title="MoMo"
                  description="Tạo liên kết thanh toán MoMo và cập nhật đặt cọc sau khi callback thành công."
                  enabled={Boolean(paymentMethods?.momo?.enabled)}
                  disabledMessage={paymentMethods?.momo?.message}
                  loading={actionLoading === "momo"}
                  loadingLabel="Đang chuyển đến MoMo..."
                  buttonLabel={`Thanh toan ${formatPrice(depositAmount)} VND bang MoMo`}
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
