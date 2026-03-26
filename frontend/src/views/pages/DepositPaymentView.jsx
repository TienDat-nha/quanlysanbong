import React from "react"
import { Link } from "react-router-dom"

const PAYMENT_NOTES = [
  "Backend má»›i dÃ¹ng payment chung cho booking, khÃ´ng cÃ²n flow Ä‘áº·t cá»c / callback VNPAY-MoMo riÃªng nhÆ° trÆ°á»›c.",
  "Báº¡n cÃ³ thá»ƒ táº¡o payment, táº£i láº¡i tráº¡ng thÃ¡i vÃ  má»Ÿ QR náº¿u backend tráº£ vá» QR.",
  "Náº¿u khÃ´ng cÃ³ QR, vui lÃ²ng theo dÃµi tráº¡ng thÃ¡i payment trong danh sÃ¡ch booking cá»§a báº¡n.",
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
      <p className="helperText">{disabledMessage || "PhÆ°Æ¡ng thá»©c nÃ y táº¡m thá»i khÃ´ng kháº£ dá»¥ng."}</p>
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
    message: "ÄÄƒng nháº­p Ä‘á»ƒ tiáº¿p tá»¥c thanh toÃ¡n booking.",
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
    ? "Payment cho booking nÃ y Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c nháº­n thÃ nh cÃ´ng."
    : "YÃªu cáº§u payment Ä‘Ã£ Ä‘Æ°á»£c táº¡o. HÃ£y tiáº¿p tá»¥c theo dÃµi tráº¡ng thÃ¡i hoáº·c má»Ÿ QR náº¿u backend Ä‘Ã£ tráº£ vá»."

  if (loading) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Äang táº£i trang thanh toÃ¡n</h1>
          <p>Há»‡ thá»‘ng Ä‘ang táº£i thÃ´ng tin booking vÃ  tráº¡ng thÃ¡i payment hiá»‡n táº¡i.</p>
        </div>
      </section>
    )
  }

  if (!authToken) {
    return (
      <section className="page section">
        <div className="container narrowContainer">
          <div className="formCard">
            <h1>Thanh toÃ¡n booking</h1>
            <p className="message warning">
              Báº¡n cáº§n <Link to={loginPath} state={loginState}>Ä‘Äƒng nháº­p</Link> Ä‘á»ƒ xem vÃ  thanh toÃ¡n
              booking nÃ y.
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
            <h1>Thanh toÃ¡n booking</h1>
            <p className="message error">{error || "KhÃ´ng tÃ¬m tháº¥y booking cáº§n thanh toÃ¡n."}</p>
            <div className="depositActions">
              <button type="button" className="btn" onClick={onRefresh}>
                Táº£i láº¡i
              </button>
              <Link className="outlineBtnLink" to={bookingPath}>
                Vá» sÃ¢n Ä‘Ã£ Ä‘áº·t
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
        <h1>Thanh toÃ¡n booking</h1>
        <p>Booking Ä‘Ã£ Ä‘Æ°á»£c táº¡o. Báº¡n cÃ³ thá»ƒ theo dÃµi payment vÃ  thá»±c hiá»‡n cÃ¡c thao tÃ¡c má»›i táº¡i Ä‘Ã¢y.</p>
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
              <h2>ThÃ´ng tin booking</h2>
              {currentUser && <p>KhÃ¡ch hÃ ng: {currentUser.fullName || currentUser.email}</p>}
            </div>
            <div className="depositStatusGroup">
              <span className="depositStatus">Tráº¡ng thÃ¡i Ä‘Æ¡n: {formatStatus(booking.status)}</span>
              <span className="depositStatus depositStatus--payment">
                Payment: {paymentStatusLabel}
              </span>
            </div>
          </div>

          <div className="depositDetailGrid">
            <p>
              <strong>SÃ¢n chÃ­nh:</strong> {field.name}
            </p>
            <p>
              <strong>SÃ¢n con:</strong> {booking.subFieldName || booking.subFieldKey}
            </p>
            <p>
              <strong>NgÃ y Ä‘áº·t:</strong> {summary.bookingDateLabel}
            </p>
            <p>
              <strong>Khung giá»:</strong> {summary.compactTimeSlot}
            </p>
            <p>
              <strong>Thá»i lÆ°á»£ng:</strong> {summary.durationLabel}
            </p>
            <p>
              <strong>Äá»‹a chá»‰:</strong> {field.address}
            </p>
            <p>
              <strong>Tráº¡ng thÃ¡i payment:</strong> {depositStatusLabel}
            </p>
            {booking.depositMethod && (
              <p>
                <strong>PhÆ°Æ¡ng thá»©c:</strong> {formatDepositMethod(booking.depositMethod)}
              </p>
            )}
            {booking.depositPaidAt && (
              <p>
                <strong>Thá»i gian xÃ¡c nháº­n:</strong> {formatPaidAt(booking.depositPaidAt)}
              </p>
            )}
            {booking.fullyPaidAt && (
              <p>
                <strong>Thanh toÃ¡n hoÃ n táº¥t lÃºc:</strong> {formatPaidAt(booking.fullyPaidAt)}
              </p>
            )}
          </div>
        </section>

        <section className="depositCard depositCard--amount">
          <h2>Chi tiáº¿t payment</h2>

          <div className="depositAmountGrid">
            <div className="depositAmountBox">
              <span>Tá»•ng tiá»n sÃ¢n</span>
              <strong>{formatPrice(totalPrice)} VND</strong>
            </div>

            <div className="depositAmountBox depositAmountBox--highlight">
              <span>GiÃ¡ trá»‹ payment</span>
              <strong>{formatPrice(depositAmount)} VND</strong>
            </div>

            <div className="depositAmountBox">
              <span>CÃ²n láº¡i</span>
              <strong>{formatPrice(remainingAmount)} VND</strong>
            </div>
          </div>

          <section className="depositNoteBox">
            <strong>LÆ°u Ã½</strong>
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
                Vá» sÃ¢n Ä‘Ã£ Ä‘áº·t
              </button>
              <button type="button" className="outlineBtnInline" onClick={onGoToFields}>
                Äáº·t thÃªm sÃ¢n khÃ¡c
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="depositCard depositCard--method">
              <div className="depositMethodHeader">
                <div>
                  <h2>Táº¡o payment cÆ¡ báº£n</h2>
                  <p>HÃ nh Ä‘á»™ng nÃ y gá»­i yÃªu cáº§u payment chung theo backend má»›i cho booking hiá»‡n táº¡i.</p>
                </div>
              </div>

              <div className="depositTransferGrid">
                <div className="depositTransferInfo">
                  <p>
                    <strong>KÃªnh:</strong> {staticTransfer?.bankName || "Payment backend"}
                  </p>
                  <p>
                    <strong>MÃ£ payment:</strong> {staticTransfer?.accountNumber || "ChÆ°a táº¡o"}
                  </p>
                  <p>
                    <strong>Loáº¡i:</strong> {staticTransfer?.accountName || "CASH"}
                  </p>
                  <p>
                    <strong>MÃ£ booking:</strong> {staticTransfer?.transferNote || "-"}
                  </p>
                  <p>
                    <strong>Sá»‘ tiá»n:</strong> {formatPrice(staticTransfer?.amount || depositAmount)} VND
                  </p>
                </div>

                <div className="depositQrBox">
                  {staticTransfer?.qrImageUrl ? (
                    <img
                      src={staticTransfer.qrImageUrl}
                      alt="QR thanh toÃ¡n booking"
                      className="depositQrImage"
                    />
                  ) : (
                    <div className="depositQrPlaceholder">
                      Backend chÆ°a tráº£ QR. HÃ£y táº¡o payment trÆ°á»›c rá»“i táº£i láº¡i tráº¡ng thÃ¡i.
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
                    ? "Äang táº¡o payment..."
                    : `Táº¡o payment ${formatPrice(depositAmount)} VND`}
                </button>
                {paymentMethods?.staticTransfer?.message && (
                  <p className="helperText">{paymentMethods.staticTransfer.message}</p>
                )}
              </div>
            </section>

            <section className="depositCard">
              <h2>Thanh toÃ¡n QR</h2>
              <div className="depositMethodGrid">
                <PaymentMethodCard
                  title="Táº¡o QR"
                  description="Táº¡o payment QR theo backend má»›i. Sau Ä‘Ã³ hÃ£y táº£i láº¡i tráº¡ng thÃ¡i hoáº·c má»Ÿ QR."
                  enabled={Boolean(paymentMethods?.vnpay?.enabled)}
                  disabledMessage={paymentMethods?.vnpay?.message}
                  loading={actionLoading === "vnpay"}
                  loadingLabel="Äang táº¡o QR..."
                  buttonLabel={`Táº¡o QR ${formatPrice(depositAmount)} VND`}
                  onClick={onCreateVnpayPayment}
                />

                <PaymentMethodCard
                  title="Má»Ÿ QR"
                  description="Má»Ÿ QR náº¿u backend Ä‘Ã£ tráº£ vá» QR cho payment hiá»‡n táº¡i."
                  enabled={Boolean(paymentMethods?.momo?.enabled) || Boolean(staticTransfer?.qrImageUrl)}
                  disabledMessage={paymentMethods?.momo?.message}
                  loading={actionLoading === "momo"}
                  loadingLabel="Äang má»Ÿ QR..."
                  buttonLabel={staticTransfer?.qrImageUrl ? "Má»Ÿ QR thanh toÃ¡n" : "Táº¡o / láº¥y QR"}
                  onClick={onCreateMomoPayment}
                />
              </div>
            </section>
          </>
        )}

        <section className="depositCard depositCard--footer">
          <div className="depositActions">
            <button type="button" className="outlineBtnInline" onClick={onRefresh}>
              Táº£i láº¡i tráº¡ng thÃ¡i
            </button>
            <button type="button" className="outlineBtnInline" onClick={onGoToBookings}>
              Vá» sÃ¢n Ä‘Ã£ Ä‘áº·t
            </button>
            <button type="button" className="outlineBtnInline" onClick={onGoToFields}>
              Vá» danh sÃ¡ch sÃ¢n
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

export default DepositPaymentView
