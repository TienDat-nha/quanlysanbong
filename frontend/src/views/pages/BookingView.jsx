import React from "react"
import { Link, useLocation } from "react-router-dom"
import { isAdminUser, isOwnerUser } from "../../models/authModel"
import {
  calculateBookingTotalPrice,
  formatBookingDateLabel,
  formatBookingDurationLabel,
  formatCompactTimeSlot,
  getBookingDurationMinutes,
  minutesToTimeLabel,
} from "../../models/bookingModel"
import { formatPrice } from "../../models/fieldModel"
import { getFieldTypeLabel } from "../../models/fieldTypeModel"
import { getBookingPaymentSummaryVi } from "../../models/bookingTextModel"
import { createDepositPaymentRoute } from "../../models/routeModel"

const getSlotTitle = (fieldName, subFieldName, slot) => {
  const label = `${fieldName} - ${subFieldName}`
  const contactText = slot?.booking?.phone ? ` | LiÃªn há»‡: ${slot.booking.phone}` : ""

  switch (slot.state) {
    case "booked":
      return `${label}: Ä‘Ã£ cÃ³ lá»‹ch ${slot.timeSlot}${contactText}`
    case "closed":
      return `${label}: ngoÃ i giá» hoáº¡t Ä‘á»™ng`
    case "past":
      return `${label}: khung giá» Ä‘Ã£ qua`
    case "selected":
      return `${label}: Ä‘ang chá»n ${slot.timeSlot}`
    default:
      return `${label}: cÃ³ thá»ƒ Ä‘áº·t ${slot.timeSlot}`
  }
}

const formatTimelineHeaderLabel = (value) =>
  String(value || "")
    .trim()
    .replace(/^0(\d:)/, "$1")

const getTimelineHeaderRange = (slot) => {
  const startLabel = Number.isFinite(Number(slot?.startMinutes))
    ? formatTimelineHeaderLabel(minutesToTimeLabel(Number(slot.startMinutes)))
    : formatTimelineHeaderLabel(String(slot?.label || slot?.timeSlot || "").split("-")[0])
  const endLabel = Number.isFinite(Number(slot?.endMinutes))
    ? formatTimelineHeaderLabel(minutesToTimeLabel(Number(slot.endMinutes)))
    : formatTimelineHeaderLabel(String(slot?.timeSlot || "").split("-")[1] || "")

  return {
    startLabel,
    endLabel,
    fullLabel: String(slot?.timeSlot || `${startLabel} - ${endLabel}`).trim(),
  }
}

const getBookingHistoryStatusTone = (status) => {
  const normalizedStatus = String(status || "").trim().toUpperCase()

  switch (normalizedStatus) {
    case "CONFIRMED":
    case "COMPLETED":
    case "APPROVED":
      return "success"
    case "PENDING":
      return "warning"
    case "CANCELLED":
    case "CANCELED":
    case "REJECTED":
      return "danger"
    default:
      return "neutral"
  }
}

const getBookingHistoryCardTone = (bookingStatusTone, paymentStatusTone) => {
  if (bookingStatusTone === "danger" || paymentStatusTone === "danger") {
    return "danger"
  }

  if (bookingStatusTone === "success" || paymentStatusTone === "success") {
    return "success"
  }

  if (bookingStatusTone === "warning" || paymentStatusTone === "warning") {
    return "warning"
  }

  return "neutral"
}

const getFeedbackClassName = (feedback) => {
  const feedbackType = String(feedback?.type || "").trim().toLowerCase()

  if (feedbackType === "success") {
    return "message success"
  }

  if (feedbackType === "warning") {
    return "message warning"
  }

  return "message error"
}

const BookingHistoryPanel = ({
  currentUser,
  bookings,
  authToken,
  loadingBookings,
  cancellingBookingId,
  formatDateTime,
  formatStatus,
  onCancelBooking,
  className = "",
}) => (
  <section className={`bookingList ${className}`.trim()}>
    <h2>SÃ¢n Ä‘Ã£ Ä‘áº·t</h2>
    {currentUser && <p className="helperText">TÃ i khoáº£n: {currentUser.email}</p>}
    {loadingBookings && <p>Äang táº£i lá»‹ch sá»­ Ä‘áº·t sÃ¢n...</p>}
    {!loadingBookings && !authToken && <p>ÄÄƒng nháº­p Ä‘á»ƒ xem lá»‹ch sá»­ Ä‘áº·t sÃ¢n cá»§a báº¡n.</p>}
    {!loadingBookings && authToken && bookings.length === 0 && <p>Báº¡n chÆ°a cÃ³ Ä‘Æ¡n Ä‘áº·t sÃ¢n nÃ o.</p>}

    {!loadingBookings && bookings.length > 0 && (
      <ul>
        {bookings.map((booking) => {
          const paymentTargetIds =
            Array.isArray(booking.bookingIds) && booking.bookingIds.length > 0
              ? booking.bookingIds.map((item) => String(item || "").trim()).filter(Boolean)
              : [String(booking.id || "").trim()].filter(Boolean)
          const bookingStatus = String(booking.status || "").trim().toLowerCase()
          const paymentSummary = getBookingPaymentSummaryVi(booking)
          const canShowDepositAction =
            Boolean(authToken) && bookingStatus !== "cancelled" && paymentSummary.canShowPaymentAction
          const canCancelBooking =
            Boolean(authToken)
            && bookingStatus !== "cancelled"
            && !paymentSummary.hasConfirmedDeposit
            && !paymentSummary.isFullyPaid
          const isCancelling = String(cancellingBookingId) === String(booking.id)
          const paymentQuery =
            paymentTargetIds.length > 1
              ? `?${new URLSearchParams({ bookingIds: paymentTargetIds.join(",") }).toString()}`
              : ""
          const paymentActionLabel = paymentSummary.actionLabel || "Thanh toÃ¡n"
          const bookingStatusLabel = formatStatus(booking.status)
          const paymentStatusLabel = paymentSummary.label
          const bookingStatusTone = getBookingHistoryStatusTone(booking.status)
          const paymentStatusTone = paymentSummary.tone
          const cardTone = getBookingHistoryCardTone(bookingStatusTone, paymentStatusTone)
          const groupedBookingCount = Number(booking.groupedBookingCount || paymentTargetIds.length || 0)
          const holdExpiresAt = String(booking.holdExpiresAt || booking.expiredAt || "").trim()
          const shouldShowHoldExpiry =
            Boolean(holdExpiresAt)
            && !paymentSummary.hasConfirmedDeposit
            && !paymentSummary.isFullyPaid
          const ownerPhone = String(
            booking.fieldOwnerPhone
            || booking.field?.ownerPhone
            || booking.field?.owner?.phone
            || booking.field?.user?.phone
            || ""
          ).trim()
          const footerNote = groupedBookingCount > 1
            ? `${groupedBookingCount} khung giá» liÃªn tiáº¿p`
            : `MÃ£ Ä‘Æ¡n: ${String(booking.id || "").trim().slice(0, 12)}...`
          const bookingCode = String(booking.id || paymentTargetIds[0] || "").trim()
          const totalAmount = Number(paymentSummary.totalAmount || booking.totalPrice || 0)
          const paidDepositAmount = Number(paymentSummary.paidDepositAmount || 0)
          const remainingPaidAmount = Number(paymentSummary.remainingPaidAmount || 0)
          const remainingAmount = Number(paymentSummary.remainingAmount || 0)
          const detailItems = [
            bookingCode ? { label: "MÃ£ Ä‘áº·t", value: `#${bookingCode.slice(0, 8)}` } : null,
            totalAmount > 0 ? { label: "Tá»•ng tiá»n", value: `${formatPrice(totalAmount)} VND`, accent: true } : null,
            paidDepositAmount > 0 ? { label: "ÄÃ£ cá»c", value: `${formatPrice(paidDepositAmount)} VND` } : null,
            remainingPaidAmount > 0
              ? { label: "ÄÃ£ thanh toÃ¡n pháº§n cÃ²n láº¡i", value: `${formatPrice(remainingPaidAmount)} VND` }
              : null,
            totalAmount > 0
              ? {
                  label: "CÃ²n ná»£",
                  value: `${formatPrice(remainingAmount)} VND`,
                  accent: remainingAmount > 0,
                }
              : null,
            { label: "NgÃ y Ä‘áº·t", value: booking.date || "--" },
            { label: "Khung giá»", value: booking.timeSlot || "--", accent: true },
            ownerPhone ? { label: "Sá»‘ Ä‘iá»‡n thoáº¡i chá»§ sÃ¢n", value: ownerPhone } : null,
            booking.fieldAddress ? { label: "Äá»‹a chá»‰ sÃ¢n", value: booking.fieldAddress } : null,
            shouldShowHoldExpiry
              ? { label: "Giá»¯ chá»— Ä‘áº¿n", value: formatDateTime(holdExpiresAt) || holdExpiresAt }
              : null,
            { label: "Táº¡o lÃºc", value: formatDateTime(booking.createdAt) || "--" },
          ].filter(Boolean)

          return (
            <li
              key={booking.id}
              className={`bookingItem bookingHistoryCard bookingHistoryCard--${cardTone}`.trim()}
            >
              <div className="bookingHistoryCardTop">
                <div className="bookingHistoryCardHeading">
                  <span className="bookingHistoryCardEyebrow">Lá»‹ch sÃ¢n cá»§a báº¡n</span>
                  <h3>{booking.fieldName}</h3>
                  <p className="bookingHistoryCardSubline">
                    {booking.subFieldName ? `SÃ¢n con: ${booking.subFieldName}` : "SÃ¢n chÆ°a gáº¯n sÃ¢n con"}
                    {groupedBookingCount > 1 ? ` â€¢ ${groupedBookingCount} khung giá» liÃªn tiáº¿p` : ""}
                  </p>
                </div>

                <div className="bookingHistoryCardBadges">
                  <span className={`bookingHistoryBadge bookingHistoryBadge--${bookingStatusTone}`.trim()}>
                    {bookingStatusLabel}
                  </span>
                  <span className={`bookingHistoryBadge bookingHistoryBadge--${paymentStatusTone}`.trim()}>
                    {paymentStatusLabel}
                  </span>
                </div>
              </div>

              <div className="bookingHistoryCardGrid">
                {detailItems.map((item) => (
                  <div key={`${booking.id}-${item.label}`} className="bookingHistoryMetaItem">
                    <span className="bookingHistoryMetaLabel">{item.label}</span>
                    <strong
                      className={`bookingHistoryMetaValue${item.accent ? " bookingHistoryMetaValue--accent" : ""}`.trim()}
                    >
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="bookingHistoryCardFooter">
                <span className="bookingHistoryCardFooterNote" title={String(booking.id || "").trim()}>
                  {footerNote}
                </span>

                {(canShowDepositAction || canCancelBooking) && (
                  <div className="bookingHistoryItemActions fieldActions">
                    {canShowDepositAction && (
                      <Link
                        className="outlineBtnLink"
                        to={`${createDepositPaymentRoute(paymentTargetIds[0] || booking.id)}${paymentQuery}`}
                        state={{
                          booking,
                          bookingIds: paymentTargetIds,
                          field: booking.field || null,
                        }}
                      >
                        {paymentActionLabel}
                      </Link>
                    )}

                    {canCancelBooking && (
                      <button
                        className="outlineBtnInline adminDangerBtn"
                        type="button"
                        onClick={() => onCancelBooking(booking)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? "Äang há»§y..." : "Há»§y Ä‘Æ¡n"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    )}
  </section>
)
const BookingView = ({
  authToken,
  currentUser,
  fields,
  bookings,
  catalogMessage,
  fieldSlug,
  scheduleRows,
  timeline,
  selectedField,
  selectedSubField,
  selectedTimeSlotIds,
  hasSelectedSlot,
  loadingFields,
  loadingAvailability,
  loadingBookings,
  form,
  submitting,
  cancellingBookingId,
  feedback,
  bookingStep,
  loginPath,
  fieldsPath,
  adminFieldsPath,
  adminUsersPath,
  adminOwnerFieldsPath,
  onFieldChange,
  onSlotSelect,
  onContinueToConfirm,
  onBackToSchedule,
  onCancelBooking,
  onSubmit,
  minBookingDate,
  formatDateTime,
  formatStatus,
}) => {
  const location = useLocation()
  const timeColumnWidth = timeline.length > 26 ? 62 : 72
  const boardGridTemplate = `160px repeat(${Math.max(timeline.length, 1)}, minmax(${timeColumnWidth}px, ${timeColumnWidth}px))`
  const hasRequestedField = Boolean(fieldSlug || form.fieldId)
  const hasBookingTarget = Boolean(selectedField)
  const hasInvalidFieldSelection = hasRequestedField && !loadingFields && !selectedField
  const isAdminPortal = isAdminUser(currentUser)
  const isOwnerPortal = isOwnerUser(currentUser)
  const ownerFields = isOwnerPortal ? fields : []
  const displayName = currentUser?.fullName || currentUser?.name || currentUser?.email || ""
  const loginState = {
    from: `${location.pathname}${location.search}`,
    message: "ÄÄƒng nháº­p Ä‘á»ƒ tiáº¿p tá»¥c Ä‘áº·t sÃ¢n.",
  }

  const durationMinutes = getBookingDurationMinutes(form.timeSlot)
  const totalPrice = calculateBookingTotalPrice(
    selectedSubField?.pricePerHour || selectedField?.pricePerHour,
    form.timeSlot
  )
  const selectedSlotCount = Array.isArray(selectedTimeSlotIds) ? selectedTimeSlotIds.length : 0
  const bookingDateLabel = formatBookingDateLabel(form.date)
  const compactTimeSlot = formatCompactTimeSlot(form.timeSlot)

  if (isAdminPortal) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Äáº·t sÃ¢n thá»§ cÃ´ng</h1>
        </div>

        <div className="container bookingHistoryPage">
          <section className="formCard bookingHistoryNotice">
            <div className="bookingHistoryNoticeText">
              <h2>Chuyá»ƒn sang Ä‘Ãºng khu vá»±c</h2>
            </div>

            <div className="bookingHistoryActions">
              <Link className="btn smallBtn" to={adminUsersPath}>
                Quáº£n lÃ½ tÃ i khoáº£n
              </Link>
              <Link className="outlineBtnLink" to={adminOwnerFieldsPath}>
                Quáº£n lÃ½ sÃ¢n chá»§ sÃ¢n
              </Link>
            </div>
          </section>
        </div>
      </section>
    )
  }

  if (hasRequestedField && loadingFields) {
    return (
        <section className="page section">
          <div className="container pageHeader">
            <h1>Äang táº£i thÃ´ng tin sÃ¢n</h1>
          </div>
        </section>
    )
  }

  if (!hasBookingTarget) {
    if (isOwnerPortal) {
      return (
        <section className="page section">
          <div className="container pageHeader">
            <h1>Äáº·t sÃ¢n thá»§ cÃ´ng cho khÃ¡ch</h1>
          </div>

          <div className="container bookingHistoryPage">
            {catalogMessage && <p className="message warning">{catalogMessage}</p>}

            {hasInvalidFieldSelection && (
              <p className="message error">
                KhÃ´ng tÃ¬m tháº¥y sÃ¢n cáº§n Ä‘áº·t. Vui lÃ²ng quay láº¡i Quáº£n lÃ½ sÃ¢n vÃ  chá»n Ä‘Ãºng sÃ¢n.
              </p>
            )}

            <section className="formCard bookingHistoryNotice">
              <div className="bookingHistoryNoticeText">
                <h2>Äáº·t tay tá»« Quáº£n lÃ½ sÃ¢n</h2>
                <p className="helperText">
                  Vui lÃ²ng vÃ o Quáº£n lÃ½ sÃ¢n vÃ  nháº¥n <strong>Äáº·t tay trÃªn sÃ¢n nÃ y</strong> táº¡i sÃ¢n cáº§n táº¡o Ä‘Æ¡n.
                </p>
              </div>

              <div className="bookingHistoryActions">
                <Link className="btn" to={adminFieldsPath}>
                  Vá» quáº£n lÃ½ sÃ¢n
                </Link>
              </div>
            </section>
          </div>
        </section>
      )
    }

    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>SÃ¢n Ä‘Ã£ Ä‘áº·t</h1>
        </div>

        <div className="container bookingHistoryPage">
          {catalogMessage && <p className="message warning">{catalogMessage}</p>}

          {hasInvalidFieldSelection && (
            <p className="message error">
              KhÃ´ng tÃ¬m tháº¥y sÃ¢n cáº§n Ä‘áº·t. Vui lÃ²ng quay láº¡i danh sÃ¡ch sÃ¢n vÃ  chá»n láº¡i.
            </p>
          )}

          {!authToken && (
            <p className="message warning">
              Báº¡n chÆ°a Ä‘Äƒng nháº­p. Vui lÃ²ng <Link to={loginPath} state={loginState}>Ä‘Äƒng nháº­p</Link>{" "}
              Ä‘á»ƒ xem lá»‹ch sá»­ vÃ  xÃ¡c nháº­n Ä‘áº·t sÃ¢n.
            </p>
          )}

          <section className="formCard bookingHistoryNotice">
            <div className="bookingHistoryNoticeText">
              <h2>Äáº·t lá»‹ch tá»« tá»«ng sÃ¢n</h2>
            </div>

            <div className="bookingHistoryActions">
              <Link className="btn" to={fieldsPath}>
                Xem danh sÃ¡ch sÃ¢n
              </Link>
            </div>
          </section>

          <BookingHistoryPanel
            currentUser={currentUser}
            bookings={bookings}
            authToken={authToken}
            loadingBookings={loadingBookings}
            cancellingBookingId={cancellingBookingId}
            formatDateTime={formatDateTime}
            formatStatus={formatStatus}
            onCancelBooking={onCancelBooking}
            className="bookingHistoryOnly"
          />
        </div>
      </section>
    )
  }

  if (bookingStep === "confirm") {
    return (
      <section className="page section bookingCheckoutPage">
        <div className="container bookingCheckoutContainer">
          <div className="bookingCheckoutHeader">
            <button type="button" className="bookingStepBackButton" onClick={onBackToSchedule}>
              Quay láº¡i
            </button>
            <div>
              <h1>{isOwnerPortal ? "Äáº·t sÃ¢n thá»§ cÃ´ng cho khÃ¡ch" : "Äáº·t lá»‹ch ngay trá»±c quan"}</h1>
            </div>
            {isOwnerPortal && (
              <div className="bookingCheckoutHeaderActions">
                <Link className="outlineBtnLink bookingBackLink" to={adminFieldsPath}>
                  Vá» quáº£n lÃ½ sÃ¢n
                </Link>
              </div>
            )}
          </div>

          {!authToken && (
            <p className="message warning bookingCheckoutMessage">
              Báº¡n chÆ°a Ä‘Äƒng nháº­p. Vui lÃ²ng <Link to={loginPath} state={loginState}>Ä‘Äƒng nháº­p</Link>{" "}
              trÆ°á»›c khi xÃ¡c nháº­n Ä‘áº·t sÃ¢n.
            </p>
          )}

          {catalogMessage && <p className="message warning bookingCheckoutMessage">{catalogMessage}</p>}

          <form className="bookingCheckoutCard" onSubmit={onSubmit}>
            <section className="bookingCheckoutSection">
              <h2>ThÃ´ng tin sÃ¢n</h2>
              <div className="bookingCheckoutInfoGrid">
                <p>
                  <strong>TÃªn sÃ¢n:</strong> {selectedField.name}
                </p>
                <p>
                  <strong>Äá»‹a chá»‰:</strong> {selectedField.address}
                </p>
                <p>
                  <strong>Khu vá»±c:</strong> {selectedField.district}
                </p>
                <p>
                  <strong>Giá» má»Ÿ cá»­a:</strong> {selectedField.openHours}
                </p>
              </div>
            </section>

            <section className="bookingCheckoutSection">
              <h2>ThÃ´ng tin lá»‹ch Ä‘áº·t</h2>
              <div className="bookingCheckoutInfoGrid">
                <p>
                  <strong>NgÃ y:</strong> {bookingDateLabel}
                </p>
                <p>
                  <strong>Lá»‹ch Ä‘Ã£ chá»n:</strong> {selectedSubField?.name}: {compactTimeSlot}
                </p>
                <p>
                  <strong>Loáº¡i sÃ¢n:</strong> {selectedSubField?.type || selectedField?.type || "--"}
                </p>
                <p>
                  <strong>Tá»•ng giá»:</strong> {formatBookingDurationLabel(durationMinutes)}
                </p>
                <p>
                  <strong>GiÃ¡ sÃ¢n con:</strong>{" "}
                  {formatPrice(selectedSubField?.pricePerHour || selectedField?.pricePerHour)} VND/giá»
                </p>
                <p className="bookingCheckoutTotal">
                  <strong>Tá»•ng tiá»n:</strong> {formatPrice(totalPrice)} VND
                </p>
              </div>
            </section>

            <button type="button" className="bookingServiceButton" disabled>
              ThÃªm dá»‹ch vá»¥
            </button>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-customer-name">
                {isOwnerPortal ? "TÃ i khoáº£n táº¡o Ä‘Æ¡n" : "TÃªn cá»§a báº¡n"}
              </label>
              <input
                id="booking-customer-name"
                type="text"
                value={displayName}
                placeholder="ÄÄƒng nháº­p Ä‘á»ƒ hiá»‡n tÃªn"
                readOnly
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-phone">
                {isOwnerPortal ? "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ¡ch" : "Sá»‘ Ä‘iá»‡n thoáº¡i"}
              </label>
              <input
                id="booking-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                placeholder="09xxxxxxxx"
                disabled={!hasSelectedSlot}
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-confirm-phone">
                {isOwnerPortal ? "XÃ¡c nháº­n sá»‘ Ä‘iá»‡n thoáº¡i khÃ¡ch" : "XÃ¡c nháº­n sá»‘ Ä‘iá»‡n thoáº¡i"}
              </label>
              <input
                id="booking-confirm-phone"
                type="tel"
                inputMode="numeric"
                value={form.confirmPhone}
                onChange={(event) => onFieldChange("confirmPhone", event.target.value)}
                placeholder="Nháº­p láº¡i sá»‘ Ä‘iá»‡n thoáº¡i"
                disabled={!hasSelectedSlot}
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-note">
                {isOwnerPortal ? "Ghi chÃº ná»™i bá»™ cho Ä‘Æ¡n Ä‘áº·t tay" : "Ghi chÃº cho chá»§ sÃ¢n"}
              </label>
              <textarea
                id="booking-note"
                rows={4}
                value={form.note}
                onChange={(event) => onFieldChange("note", event.target.value)}
                placeholder="Nháº­p ghi chÃº náº¿u cÃ³"
                disabled={!hasSelectedSlot}
              />
            </div>

            {feedback.text && (
              <p className={getFeedbackClassName(feedback)}>
                {feedback.text}
              </p>
            )}

            <button
              className="bookingCheckoutSubmit"
              type="submit"
              disabled={submitting || !authToken || !hasSelectedSlot}
            >
              {submitting
                ? isOwnerPortal
                  ? "Äang táº¡o Ä‘Æ¡n..."
                  : "Äang gá»­i yÃªu cáº§u..."
                : isOwnerPortal
                  ? "XÃ¡c nháº­n vÃ  khÃ³a lá»‹ch"
                  : selectedSlotCount > 1
                    ? "XÃ¡c nháº­n vÃ  táº¡o cÃ¡c Ä‘Æ¡n"
                    : "XÃ¡c nháº­n vÃ  thanh toÃ¡n"}
            </button>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="page section">
      <div className="container pageHeader">
        <h1>{isOwnerPortal ? `Äáº·t sÃ¢n thá»§ cÃ´ng: ${selectedField.name}` : `Äáº·t lá»‹ch ${selectedField.name}`}</h1>
      </div>

      <div className="container bookingStagePage bookingStagePage--visual">
        {!authToken && (
          <p className="message warning">
            Báº¡n chÆ°a Ä‘Äƒng nháº­p. Vui lÃ²ng <Link to={loginPath} state={loginState}>Ä‘Äƒng nháº­p</Link>{" "}
            trÆ°á»›c khi xÃ¡c nháº­n Ä‘áº·t sÃ¢n.
          </p>
        )}

        {catalogMessage && <p className="message warning">{catalogMessage}</p>}

        {feedback.text && (
          <p className={getFeedbackClassName(feedback)}>
            {feedback.text}
          </p>
        )}

        <section className="bookingPlanner bookingPlanner--visual">
          <div className="bookingPlannerHeader">
            <div>
              <h2>{isOwnerPortal ? "Táº¡o Ä‘Æ¡n Ä‘áº·t thá»§ cÃ´ng" : "Äáº·t lá»‹ch ngay trá»±c quan"}</h2>
            </div>

            <div className="bookingPlannerControls">
              <label className="bookingDateControl" htmlFor="booking-date">
                <span>NgÃ y Ä‘áº·t</span>
                <input
                  id="booking-date"
                  type="date"
                  value={form.date}
                  min={minBookingDate}
                  onChange={(event) => onFieldChange("date", event.target.value)}
                />
              </label>

              {isOwnerPortal && ownerFields.length > 1 && (
                <label className="bookingDateControl" htmlFor="owner-booking-field">
                  <span>SÃ¢n cá»§a báº¡n</span>
                  <select
                    id="owner-booking-field"
                    value={form.fieldId}
                    onChange={(event) => onFieldChange("fieldId", event.target.value)}
                  >
                    {ownerFields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {isOwnerPortal ? (
                <Link className="btn smallBtn bookingBackLink" to={adminFieldsPath}>
                  Vá» quáº£n lÃ½ sÃ¢n
                </Link>
              ) : (
                <Link className="outlineBtnLink bookingBackLink" to={fieldsPath}>
                  Vá» danh sÃ¡ch sÃ¢n
                </Link>
              )}
            </div>
          </div>

          <div className="bookingPlannerMeta bookingPlannerMeta--visual">
            <div className="bookingPlannerMetaText">
              <h3>{selectedField.name}</h3>
              <p>{selectedField.address}</p>
              <p>
                {selectedField.district} | Giá» má»Ÿ cá»­a: {selectedField.openHours}
              </p>
            </div>

            <div className="bookingSubFieldList bookingSubFieldList--visual">
              {(selectedField.subFields || []).map((subField) => (
                <span key={subField.key} className="bookingSubFieldTag bookingSubFieldTag--visual">
                  {subField.name}
                  {subField.type ? ` | ${getFieldTypeLabel(subField.type, subField.type)}` : ""}
                  {subField.pricePerHour
                    ? ` | ${formatPrice(subField.pricePerHour)} VND/giá»`
                    : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="bookingLegend bookingLegend--visual">
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--available" />
              Trá»‘ng
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--booked" />
              ÄÃ£ Ä‘áº·t
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--closed" />
              KhÃ´ng chá»n Ä‘Æ°á»£c
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--selected" />
              Äang chá»n
            </span>
          </div>

                    <p className="bookingVisualNotice">
            Luu y: o do la da dat, o xam la khong the chon. Ban co the bam them cac o trong lien ke tren cung mot san con de chon nhieu gio lien tiep.
          </p>

          <div className="bookingBoardWrap bookingBoardWrap--visual">
            <div className="bookingBoard">
              <div className="bookingBoardHeader" style={{ gridTemplateColumns: boardGridTemplate }}>
                <div className="bookingBoardCorner">SÃ¢n con / Giá»</div>
                {timeline.map((slot) => {
                  const headerRange = getTimelineHeaderRange(slot)

                  return (
                  <div key={slot.key} className="bookingBoardTime" title={headerRange.fullLabel}>
                    <span className="bookingBoardTimeStart">{headerRange.startLabel}</span>
                    <span className="bookingBoardTimeEnd">{headerRange.endLabel}</span>
                  </div>
                  )
                })}
              </div>

              {loadingAvailability && (
                <p className="helperText bookingBoardStatus">Äang táº£i lá»‹ch sÃ¢n...</p>
              )}

              {!loadingAvailability && scheduleRows.length === 0 && (
                <p className="helperText bookingBoardStatus">
                  SÃ¢n nÃ y chÆ°a cÃ³ sÃ¢n con Ä‘á»ƒ hiá»ƒn thá»‹.
                </p>
              )}

              {!loadingAvailability &&
                scheduleRows.map((row) => (
                  <div
                    key={row.subField.key}
                    className="bookingBoardRow"
                    style={{ gridTemplateColumns: boardGridTemplate }}
                  >
                    <div className="bookingBoardField">
                      <strong>{row.subField.name}</strong>
                      <span>
                        {getFieldTypeLabel(
                          row.subField.type || selectedField.type,
                          row.subField.type || selectedField.type
                        )}
                        {row.subField.pricePerHour
                          ? ` | ${formatPrice(row.subField.pricePerHour)} VND/giá»`
                          : ""}
                      </span>
                    </div>

                    {row.slots.map((slot) => (
                      <button
                        key={`${row.subField.key}-${slot.key}`}
                        type="button"
                        className={`bookingSlot bookingSlot--${slot.state}`}
                        onClick={() => onSlotSelect(row.subField, slot, row.slots)}
                        disabled={slot.disabled}
                        title={getSlotTitle(selectedField.name, row.subField.name, slot)}
                      >
                        {slot.state === "selected" ? "âœ“" : ""}
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="bookingSelectionBar bookingSelectionBar--visual">
          <div className="bookingSelectionBarText">
            {hasSelectedSlot ? (
              <>
                <strong>
                  {selectedSubField?.name} | {bookingDateLabel} | {compactTimeSlot}
                </strong>
                <span>
                  {selectedSubField?.type ? `${selectedSubField.type} | ` : ""}
                  {selectedSlotCount > 1 ? `${selectedSlotCount} khung giá» liÃªn tiáº¿p | ` : ""}
                  Tá»•ng giá» {formatBookingDurationLabel(durationMinutes)} | Tá»•ng tiá»n{" "}
                  {formatPrice(totalPrice)} VND
                </span>
                {!isOwnerPortal && selectedSlotCount > 1 && (
                  <span>
                    Há»‡ thá»‘ng sáº½ táº¡o {selectedSlotCount} Ä‘Æ¡n Ä‘áº·t liÃªn tiáº¿p vÃ  báº¡n cÃ³ thá»ƒ thanh toÃ¡n tá»«ng Ä‘Æ¡n sau khi táº¡o.
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>ChÆ°a chá»n khung giá»</strong>
                <span>Chá»n khung giá»</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="bookingNextButton bookingNextButton--visual"
            onClick={onContinueToConfirm}
            disabled={!hasSelectedSlot}
          >
            Tiáº¿p theo
          </button>
        </section>
      </div>
    </section>
  )
}

export default BookingView

