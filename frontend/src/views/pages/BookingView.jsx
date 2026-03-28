import React from "react"
import { Link, useLocation } from "react-router-dom"
import { isAdminUser, isOwnerUser } from "../../models/authModel"
import {
  calculateBookingTotalPrice,
  formatBookingDateLabel,
  formatBookingDurationLabel,
  formatCompactTimeSlot,
  getBookingDurationMinutes,
} from "../../models/bookingModel"
import { formatPrice } from "../../models/fieldModel"
import { getFieldTypeLabel } from "../../models/fieldTypeModel"
import { formatPaymentStatusVi } from "../../models/bookingTextModel"
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
    <h2>Sân đã đặt</h2>
    {currentUser && <p className="helperText">Tài khoản: {currentUser.email}</p>}
    {loadingBookings && <p>Đang tải lịch sử đặt sân...</p>}
    {!loadingBookings && !authToken && <p>Đăng nhập để xem lịch sử đặt sân của bạn.</p>}
    {!loadingBookings && authToken && bookings.length === 0 && <p>Bạn chưa có đơn đặt sân nào.</p>}

    {!loadingBookings && bookings.length > 0 && (
      <ul>
        {bookings.map((booking) => {
          const bookingStatus = String(booking.status || "").trim().toLowerCase()
          const paymentStatus = String(
            booking.paymentStatus || (booking.depositPaid ? "deposit_paid" : "unpaid")
          )
            .trim()
            .toLowerCase()
          const canShowDepositAction =
            Boolean(authToken) && bookingStatus !== "cancelled" && paymentStatus !== "paid"
          const canCancelBooking = Boolean(authToken) && bookingStatus !== "cancelled"
          const isCancelling = String(cancellingBookingId) === String(booking.id)
          const paymentActionLabel =
            paymentStatus === "deposit_paid"
              ? "Xem trạng thái thanh toán"
              : paymentStatus === "pending"
                ? "Xem yêu cầu thanh toán"
                : "Thanh toán đặt cọc"

          return (
            <li key={booking.id} className="bookingItem">
              <h3>{booking.fieldName}</h3>
              {booking.subFieldName && <p>Sân con: {booking.subFieldName}</p>}
              <p>Ngày: {booking.date}</p>
              <p>Giờ: {booking.timeSlot}</p>
              {booking.phone && <p>SDT: {booking.phone}</p>}
              {!booking.phone && booking.address && <p>Liên hệ: {booking.address}</p>}
              <p>Trạng thái: {formatStatus(booking.status)}</p>
              <p>Thanh toán: {formatPaymentStatusVi(booking.paymentStatus, booking.depositStatus)}</p>

              {(canShowDepositAction || canCancelBooking) && (
                <div className="bookingHistoryItemActions fieldActions">
                  {canShowDepositAction && (
                    <Link className="outlineBtnLink" to={createDepositPaymentRoute(booking.id)}>
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

              <small>Tạo lúc: {formatDateTime(booking.createdAt)}</small>
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
  const boardGridTemplate = `180px repeat(${timeline.length}, minmax(68px, 68px))`
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
              <Link className="outlineBtnLink" to={adminFieldsPath}>
                Quản lý sân
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
                disabled={!hasSelectedSlot}
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
                disabled={!hasSelectedSlot}
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
                disabled={!hasSelectedSlot}
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
              disabled={submitting || !authToken || !hasSelectedSlot}
            >
              {submitting
                ? isOwnerPortal
                  ? "Đang tạo đơn..."
                  : "Đang gửi yêu cầu..."
                : isOwnerPortal
                  ? "Xác nhận và khóa lịch"
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

      <div className="container bookingStagePage">
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

        <section className="bookingPlanner">
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

          <div className="bookingPlannerMeta">
            <div className="bookingPlannerMetaText">
              <h3>{selectedField.name}</h3>
              <p>{selectedField.address}</p>
              <p>
                {selectedField.district} | Giờ mở cửa: {selectedField.openHours}
              </p>
            </div>

            <div className="bookingSubFieldList">
              {(selectedField.subFields || []).map((subField) => (
                <span key={subField.key} className="bookingSubFieldTag">
                  {subField.name}
                  {subField.type ? ` | ${getFieldTypeLabel(subField.type, subField.type)}` : ""}
                  {subField.pricePerHour
                    ? ` | ${formatPrice(subField.pricePerHour)} VND/giờ`
                    : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="bookingLegend">
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

          <div className="bookingBoardWrap">
            <div className="bookingBoard">
              <div className="bookingBoardHeader" style={{ gridTemplateColumns: boardGridTemplate }}>
                <div className="bookingBoardCorner">Sân con / Giờ</div>
                {timeline.map((slot) => (
                  <div key={slot.key} className="bookingBoardTime">
                    {slot.label}
                  </div>
                ))}
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
                        onClick={() => onSlotSelect(row.subField, slot)}
                        disabled={slot.disabled}
                        title={getSlotTitle(selectedField.name, row.subField.name, slot)}
                      >
                        {slot.state === "selected" ? "OK" : ""}
                      </button>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="bookingSelectionBar">
          <div className="bookingSelectionBarText">
            {hasSelectedSlot ? (
              <>
                <strong>
                  {selectedSubField?.name} | {bookingDateLabel} | {compactTimeSlot}
                </strong>
                <span>
                  {selectedSubField?.type ? `${selectedSubField.type} | ` : ""}
                  Tổng giờ {formatBookingDurationLabel(durationMinutes)} | Tổng tiền{" "}
                  {formatPrice(totalPrice)} VND
                </span>
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
            className="bookingNextButton"
            onClick={onContinueToConfirm}
            disabled={!hasSelectedSlot}
          >
            Tiếp theo
          </button>
        </section>
      </div>
    </section>
  )
}

export default BookingView
