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
  const contactText = slot?.booking?.phone ? ` | Liên hệ: ${slot.booking.phone}` : ""

  switch (slot.state) {
    case "booked":
      return `${label}: đã có lịch ${slot.timeSlot}${contactText}`
    case "closed":
      return `${label}: ngoài giờ hoạt động`
    case "past":
      return `${label}: khung giờ đã qua`
    case "selected":
      return `${label}: đang chọn ${slot.timeSlot}`
    default:
      return `${label}: có thể đặt ${slot.timeSlot}`
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

// eslint-disable-next-line no-unused-vars
const BookingHistoryPanel = (props) => <BookingHistoryPanelUtf8 {...props} />

// eslint-disable-next-line no-unused-vars
const BookingHistoryPanelClean = (props) => <BookingHistoryPanelUtf8 {...props} />
const BookingHistoryPanelUtf8 = ({
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
    <h2>Sân đã đặt</h2>
    {currentUser && <p className="helperText">Tài khoản: {currentUser.email}</p>}
    {loadingBookings && <p>Đang tải lịch sử đặt sân...</p>}
    {!loadingBookings && !authToken && <p>Đăng nhập để xem lịch sử đặt sân của bạn.</p>}
    {!loadingBookings && authToken && bookings.length === 0 && <p>Bạn chưa có đơn đặt sân nào.</p>}

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
          const paymentActionLabel = paymentSummary.actionLabel || "Thanh toán"
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
            ? `${groupedBookingCount} khung giờ liên tiếp`
            : `Mã đơn: ${String(booking.id || "").trim().slice(0, 12)}...`
          const bookingCode = String(booking.id || paymentTargetIds[0] || "").trim()
          const totalAmount = Number(paymentSummary.totalAmount || booking.totalPrice || 0)
          const paidDepositAmount = Number(paymentSummary.paidDepositAmount || 0)
          const remainingPaidAmount = Number(paymentSummary.remainingPaidAmount || 0)
          const remainingAmount = Number(paymentSummary.remainingAmount || 0)
          const detailItems = [
            bookingCode ? { label: "Mã đặt", value: `#${bookingCode.slice(0, 8)}` } : null,
            totalAmount > 0 ? { label: "Tổng tiền", value: `${formatPrice(totalAmount)} VND`, accent: true } : null,
            paidDepositAmount > 0 ? { label: "Đã cọc", value: `${formatPrice(paidDepositAmount)} VND` } : null,
            remainingPaidAmount > 0
              ? { label: "Đã thanh toán phần còn lại", value: `${formatPrice(remainingPaidAmount)} VND` }
              : null,
            totalAmount > 0
              ? {
                  label: "Còn nợ",
                  value: `${formatPrice(remainingAmount)} VND`,
                  accent: remainingAmount > 0,
                }
              : null,
            { label: "Ngày đặt", value: booking.date || "--" },
            { label: "Khung giờ", value: booking.timeSlot || "--", accent: true },
            ownerPhone ? { label: "Số điện thoại chủ sân", value: ownerPhone } : null,
            booking.fieldAddress ? { label: "Địa chỉ sân", value: booking.fieldAddress } : null,
            shouldShowHoldExpiry
              ? { label: "Giữ chỗ đến", value: formatDateTime(holdExpiresAt) || holdExpiresAt }
              : null,
            { label: "Tạo lúc", value: formatDateTime(booking.createdAt) || "--" },
          ].filter(Boolean)

          return (
            <li
              key={booking.id}
              className={`bookingItem bookingHistoryCard bookingHistoryCard--${cardTone}`.trim()}
            >
              <div className="bookingHistoryCardTop">
                <div className="bookingHistoryCardHeading">
                  <span className="bookingHistoryCardEyebrow">Lịch sân của bạn</span>
                  <h3>{booking.fieldName}</h3>
                  <p className="bookingHistoryCardSubline">
                    {booking.subFieldName ? `Sân con: ${booking.subFieldName}` : "Sân chưa gắn sân con"}
                    {groupedBookingCount > 1 ? ` • ${groupedBookingCount} khung giờ liên tiếp` : ""}
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
                        {isCancelling ? "Đang hủy..." : "Hủy đơn"}
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
  bookingIdWarning,
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
    message: "Đăng nhập để tiếp tục đặt sân.",
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
          <h1>Đặt sân thủ công</h1>
        </div>

        <div className="container bookingHistoryPage">
          <section className="formCard bookingHistoryNotice">
            <div className="bookingHistoryNoticeText">
              <h2>Chuyển sang đúng khu vực</h2>
            </div>

            <div className="bookingHistoryActions">
              <Link className="btn smallBtn" to={adminUsersPath}>
                Quản lý tài khoản
              </Link>
              <Link className="outlineBtnLink" to={adminOwnerFieldsPath}>
                Quản lý sân chủ sân
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
            <h1>Đang tải thông tin sân</h1>
          </div>
        </section>
    )
  }

  if (!hasBookingTarget) {
    if (isOwnerPortal) {
      return (
        <section className="page section">
          <div className="container pageHeader">
            <h1>Đặt sân thủ công cho khách</h1>
          </div>

          <div className="container bookingHistoryPage">
            {catalogMessage && <p className="message warning">{catalogMessage}</p>}

            {hasInvalidFieldSelection && (
              <p className="message error">
                Không tìm thấy sân cần đặt. Vui lòng chọn lại trong danh sách sân của bạn.
              </p>
            )}

            <section className="formCard bookingHistoryNotice">
              <div className="bookingHistoryNoticeText">
                <h2>Chọn sân của bạn</h2>
              </div>

              <div className="bookingHistoryActions">
                <Link className="outlineBtnLink" to={adminFieldsPath}>
                  Về quản lý sân
                </Link>
              </div>
            </section>

            {loadingFields ? (
              <p className="helperText">Đang tải danh sách sân của bạn...</p>
            ) : ownerFields.length === 0 ? (
              <section className="formCard bookingHistoryNotice">
                <div className="bookingHistoryNoticeText">
                  <h2>Chưa có sân để đặt tay</h2>
                </div>

                <div className="bookingHistoryActions">
                  <Link className="btn" to={adminFieldsPath}>
                    Tạo hoặc cập nhật sân
                  </Link>
                </div>
              </section>
            ) : (
              <section className="bookingFieldPickerGrid">
                {ownerFields.map((field) => (
                  <article key={field.id} className="bookingFieldPickerCard">
                    <div className="bookingFieldPickerContent">
                      <h2>{field.name}</h2>
                      <p>{field.address}</p>
                      <div className="bookingFieldPickerMeta">
                        <span>{field.district || "Đang cập nhật khu vực"}</span>
                        <span>{field.openHours || "Chưa có giờ mở cửa"}</span>
                        <span>{(field.subFields || []).length} sân con</span>
                      </div>
                    </div>

                    <button
                      className="btn smallBtn"
                      type="button"
                      onClick={() => onFieldChange("fieldId", String(field.id))}
                    >
                      Chọn sân này
                    </button>
                  </article>
                ))}
              </section>
            )}
          </div>
        </section>
      )
    }

    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Sân đã đặt</h1>
        </div>

        <div className="container bookingHistoryPage">
          {catalogMessage && <p className="message warning">{catalogMessage}</p>}

          {hasInvalidFieldSelection && (
            <p className="message error">
              Không tìm thấy sân cần đặt. Vui lòng quay lại danh sách sân và chọn lại.
            </p>
          )}

          {!authToken && (
            <p className="message warning">
              Bạn chưa đăng nhập. Vui lòng <Link to={loginPath} state={loginState}>đăng nhập</Link>{" "}
              để xem lịch sử và xác nhận đặt sân.
            </p>
          )}

          <section className="formCard bookingHistoryNotice">
            <div className="bookingHistoryNoticeText">
              <h2>Đặt lịch từ từng sân</h2>
            </div>

            <div className="bookingHistoryActions">
              <Link className="btn" to={fieldsPath}>
                Xem danh sách sân
              </Link>
            </div>
          </section>

          <BookingHistoryPanelUtf8
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
              Quay lại
            </button>
            <div>
              <h1>{isOwnerPortal ? "Đặt sân thủ công cho khách" : "Đặt lịch ngay trực quan"}</h1>
            </div>
            {isOwnerPortal && (
              <div className="bookingCheckoutHeaderActions">
                <Link className="outlineBtnLink bookingBackLink" to={adminFieldsPath}>
                  Về quản lý sân
                </Link>
              </div>
            )}
          </div>

          {!authToken && (
            <p className="message warning bookingCheckoutMessage">
              Bạn chưa đăng nhập. Vui lòng <Link to={loginPath} state={loginState}>đăng nhập</Link>{" "}
              trước khi xác nhận đặt sân.
            </p>
          )}

          {catalogMessage && <p className="message warning bookingCheckoutMessage">{catalogMessage}</p>}

          <form className="bookingCheckoutCard" onSubmit={onSubmit}>
            <section className="bookingCheckoutSection">
              <h2>Thông tin sân</h2>
              <div className="bookingCheckoutInfoGrid">
                <p>
                  <strong>Tên sân:</strong> {selectedField.name}
                </p>
                <p>
                  <strong>Địa chỉ:</strong> {selectedField.address}
                </p>
                <p>
                  <strong>Khu vực:</strong> {selectedField.district}
                </p>
                <p>
                  <strong>Giờ mở cửa:</strong> {selectedField.openHours}
                </p>
              </div>
            </section>

            <section className="bookingCheckoutSection">
              <h2>Thông tin lịch đặt</h2>
              <div className="bookingCheckoutInfoGrid">
                <p>
                  <strong>Ngày:</strong> {bookingDateLabel}
                </p>
                <p>
                  <strong>Lịch đã chọn:</strong> {selectedSubField?.name}: {compactTimeSlot}
                </p>
                <p>
                  <strong>Loại sân:</strong> {selectedSubField?.type || selectedField?.type || "--"}
                </p>
                <p>
                  <strong>Tổng giờ:</strong> {formatBookingDurationLabel(durationMinutes)}
                </p>
                <p>
                  <strong>Giá sân con:</strong>{" "}
                  {formatPrice(selectedSubField?.pricePerHour || selectedField?.pricePerHour)} VND/giờ
                </p>
                <p className="bookingCheckoutTotal">
                  <strong>Tổng tiền:</strong> {formatPrice(totalPrice)} VND
                </p>
              </div>
            </section>

            <button type="button" className="bookingServiceButton" disabled>
              Thêm dịch vụ
            </button>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-customer-name">
                {isOwnerPortal ? "Tài khoản tạo đơn" : "Tên của bạn"}
              </label>
              <input
                id="booking-customer-name"
                type="text"
                value={displayName}
                placeholder="Đăng nhập để hiện tên"
                readOnly
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-phone">
                {isOwnerPortal ? "Số điện thoại khách" : "Số điện thoại"}
              </label>
              <input
                id="booking-phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                placeholder="09xxxxxxxx"
                disabled={!hasSelectedSlot || Boolean(bookingIdWarning)}
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-confirm-phone">
                {isOwnerPortal ? "Xác nhận số điện thoại khách" : "Xác nhận số điện thoại"}
              </label>
              <input
                id="booking-confirm-phone"
                type="tel"
                inputMode="numeric"
                value={form.confirmPhone}
                onChange={(event) => onFieldChange("confirmPhone", event.target.value)}
                placeholder="Nhập lại số điện thoại"
                disabled={!hasSelectedSlot || Boolean(bookingIdWarning)}
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-note">
                {isOwnerPortal ? "Ghi chú nội bộ cho đơn đặt tay" : "Ghi chú cho chủ sân"}
              </label>
              <textarea
                id="booking-note"
                rows={4}
                value={form.note}
                onChange={(event) => onFieldChange("note", event.target.value)}
                placeholder="Nhập ghi chú nếu có"
                disabled={!hasSelectedSlot || Boolean(bookingIdWarning)}
              />
            </div>

            {feedback.text && (
              <p className={feedback.type === "success" ? "message success" : "message error"}>
                {feedback.text}
              </p>
            )}

            <button
              className="bookingCheckoutSubmit"
              type="submit"
              disabled={submitting || !authToken || !hasSelectedSlot || Boolean(bookingIdWarning)}
            >
              {submitting
                ? isOwnerPortal
                  ? "Đang tạo đơn..."
                  : "Đang gửi yêu cầu..."
                : isOwnerPortal
                  ? "Xác nhận và khóa lịch"
                  : selectedSlotCount > 1
                    ? "Xác nhận và tạo các đơn"
                    : "Xác nhận và thanh toán"}
            </button>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="page section">
      <div className="container pageHeader">
        <h1>{isOwnerPortal ? `Đặt sân thủ công: ${selectedField.name}` : `Đặt lịch ${selectedField.name}`}</h1>
      </div>

      <div className="container bookingStagePage bookingStagePage--visual">
        {!authToken && (
          <p className="message warning">
            Bạn chưa đăng nhập. Vui lòng <Link to={loginPath} state={loginState}>đăng nhập</Link>{" "}
            trước khi xác nhận đặt sân.
          </p>
        )}

        {catalogMessage && <p className="message warning">{catalogMessage}</p>}

        {feedback.text && (
          <p className={feedback.type === "success" ? "message success" : "message error"}>
            {feedback.text}
          </p>
        )}

        {bookingIdWarning && (
          <p className="message warning">
            {bookingIdWarning}. Hãy nhờ admin vào Quản lý sân và bấm `Khởi tạo khung giờ mẫu`
            trước khi xác nhận đặt sân.
          </p>
        )}

        <section className="bookingPlanner bookingPlanner--visual">
          <div className="bookingPlannerHeader">
            <div>
              <h2>{isOwnerPortal ? "Tạo đơn đặt thủ công" : "Đặt lịch ngay trực quan"}</h2>
            </div>

            <div className="bookingPlannerControls">
              <label className="bookingDateControl" htmlFor="booking-date">
                <span>Ngày đặt</span>
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
                  <span>Sân của bạn</span>
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
                  Về quản lý sân
                </Link>
              ) : (
                <Link className="outlineBtnLink bookingBackLink" to={fieldsPath}>
                  Về danh sách sân
                </Link>
              )}
            </div>
          </div>

          <div className="bookingPlannerMeta bookingPlannerMeta--visual">
            <div className="bookingPlannerMetaText">
              <h3>{selectedField.name}</h3>
              <p>{selectedField.address}</p>
              <p>
                {selectedField.district} | Giờ mở cửa: {selectedField.openHours}
              </p>
            </div>

            <div className="bookingSubFieldList bookingSubFieldList--visual">
              {(selectedField.subFields || []).map((subField) => (
                <span key={subField.key} className="bookingSubFieldTag bookingSubFieldTag--visual">
                  {subField.name}
                  {subField.type ? ` | ${getFieldTypeLabel(subField.type, subField.type)}` : ""}
                  {subField.pricePerHour
                    ? ` | ${formatPrice(subField.pricePerHour)} VND/giờ`
                    : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="bookingLegend bookingLegend--visual">
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--available" />
              Trống
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--booked" />
              Đã đặt
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--closed" />
              Không chọn được
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--selected" />
              Đang chọn
            </span>
          </div>

          <p className="bookingVisualNotice">
            {bookingIdWarning
              ? "Backend chưa có timeSlot thật nên bảng này đang ở chế độ chỉ xem. Sau khi admin khởi tạo khung giờ mẫu, bạn có thể chọn nhiều ô trống liền kề để đặt nhiều giờ liên tiếp."
              : "Lưu ý: ô đỏ là đã đặt, ô xám là không thể chọn. Bạn có thể bấm thêm các ô trống liền kề trên cùng một sân con để chọn nhiều giờ liên tiếp."}
          </p>

          <div className="bookingBoardWrap bookingBoardWrap--visual">
            <div className="bookingBoard">
              <div className="bookingBoardHeader" style={{ gridTemplateColumns: boardGridTemplate }}>
                <div className="bookingBoardCorner">Sân con / Giờ</div>
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
                <p className="helperText bookingBoardStatus">Đang tải lịch sân...</p>
              )}

              {!loadingAvailability && scheduleRows.length === 0 && (
                <p className="helperText bookingBoardStatus">
                  Sân này chưa có sân con để hiển thị.
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
                          ? ` | ${formatPrice(row.subField.pricePerHour)} VND/giờ`
                          : ""}
                      </span>
                    </div>

                    {row.slots.map((slot) => (
                      <button
                        key={`${row.subField.key}-${slot.key}`}
                        type="button"
                        className={`bookingSlot bookingSlot--${slot.state}`}
                        onClick={() => onSlotSelect(row.subField, slot, row.slots)}
                        disabled={slot.disabled || Boolean(bookingIdWarning)}
                        title={getSlotTitle(selectedField.name, row.subField.name, slot)}
                      >
                        {slot.state === "selected" ? "✓" : ""}
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
                  {selectedSlotCount > 1 ? `${selectedSlotCount} khung giờ liên tiếp | ` : ""}
                  Tổng giờ {formatBookingDurationLabel(durationMinutes)} | Tổng tiền{" "}
                  {formatPrice(totalPrice)} VND
                </span>
                {!isOwnerPortal && selectedSlotCount > 1 && (
                  <span>
                    Hệ thống sẽ tạo {selectedSlotCount} đơn đặt liên tiếp và bạn có thể thanh toán từng đơn sau khi tạo.
                  </span>
                )}
              </>
            ) : (
              <>
                <strong>Chưa chọn khung giờ</strong>
                <span>Chọn khung giờ</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="bookingNextButton bookingNextButton--visual"
            onClick={onContinueToConfirm}
            disabled={!hasSelectedSlot || Boolean(bookingIdWarning)}
          >
            Tiếp theo
          </button>
        </section>
      </div>
    </section>
  )
}

export default BookingView
