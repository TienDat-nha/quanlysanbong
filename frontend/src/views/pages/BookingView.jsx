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
import { formatPaymentStatusVi } from "../../models/bookingTextModel"
import { createDepositPaymentRoute } from "../../models/routeModel"

const BOOKING_NOTES = [
  "Thanh toan dat coc duoc thuc hien truc tiep giua ban va chu san.",
  "Nen den som truoc gio da dat de nhan san dung khung thoi gian.",
  "Neu can doi lich, hay lien he chu san som de duoc ho tro.",
]

const getSlotTitle = (fieldName, subFieldName, slot) => {
  const label = `${fieldName} - ${subFieldName}`
  const contactText = slot?.booking?.phone ? ` | Lien he: ${slot.booking.phone}` : ""

  switch (slot.state) {
    case "booked":
      return `${label}: da co lich ${slot.timeSlot}${contactText}`
    case "closed":
      return `${label}: ngoai gio hoat dong`
    case "past":
      return `${label}: khung gio da qua`
    case "selected":
      return `${label}: dang chon ${slot.timeSlot}`
    default:
      return `${label}: co the dat ${slot.timeSlot}`
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
    <h2>San da dat</h2>
    {currentUser && <p className="helperText">Tai khoan: {currentUser.email}</p>}
    {loadingBookings && <p>Dang tai lich su dat san...</p>}
    {!loadingBookings && !authToken && <p>Dang nhap de xem lich su dat san cua ban.</p>}
    {!loadingBookings && authToken && bookings.length === 0 && <p>Ban chua co don dat san nao.</p>}

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
              ? "Xem trang thai thanh toan"
              : paymentStatus === "pending"
                ? "Xem yeu cau thanh toan"
                : "Thanh toan dat coc"

          return (
            <li key={booking.id} className="bookingItem">
              <h3>{booking.fieldName}</h3>
              {booking.subFieldName && <p>San con: {booking.subFieldName}</p>}
              <p>Ngay: {booking.date}</p>
              <p>Gio: {booking.timeSlot}</p>
              {booking.phone && <p>SDT: {booking.phone}</p>}
              {!booking.phone && booking.address && <p>Lien he: {booking.address}</p>}
              <p>Trang thai: {formatStatus(booking.status)}</p>
              <p>Thanh toan: {formatPaymentStatusVi(booking.paymentStatus, booking.depositStatus)}</p>

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
                      {isCancelling ? "Dang huy..." : "Huy don"}
                    </button>
                  )}
                </div>
              )}

              <small>Tao luc: {formatDateTime(booking.createdAt)}</small>
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
    message: "Dang nhap de tiep tuc dat san.",
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
          <h1>Dat san thu cong</h1>
          <p>Tai khoan admin khong su dung man dat san thu cong cho khach.</p>
        </div>

        <div className="container bookingHistoryPage">
          <section className="formCard bookingHistoryNotice">
            <div className="bookingHistoryNoticeText">
              <h2>Chuyen sang dung khu vuc</h2>
              <p>
                Admin chi quan ly tai khoan va quan ly san. Viec dat san thu cong va khoa lich
                thuoc man chu san.
              </p>
            </div>

            <div className="bookingHistoryActions">
              <Link className="btn smallBtn" to={adminUsersPath}>
                Quan ly tai khoan
              </Link>
              <Link className="outlineBtnLink" to={adminFieldsPath}>
                Quan ly san
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
          <h1>Dang tai thong tin san</h1>
          <p>He thong dang mo lich cua san ban vua chon.</p>
        </div>
      </section>
    )
  }

  if (!hasBookingTarget) {
    if (isOwnerPortal) {
      return (
        <section className="page section">
          <div className="container pageHeader">
            <h1>Dat san thu cong cho khach</h1>
            <p>
              Dat tay chi ap dung tren chinh san cua ban. Chon mot san ben duoi de mo bang lich va
              danh dau cac khung gio da co khach dat truc tiep.
            </p>
          </div>

          <div className="container bookingHistoryPage">
            {catalogMessage && <p className="message warning">{catalogMessage}</p>}

            {hasInvalidFieldSelection && (
              <p className="message error">
                Khong tim thay san can dat. Vui long chon lai trong danh sach san cua ban.
              </p>
            )}

            <section className="formCard bookingHistoryNotice">
              <div className="bookingHistoryNoticeText">
                <h2>Chon san cua ban</h2>
                <p>
                  Moi don dat thu cong se duoc tao tren san ban quan ly va cac o trung lich se bi
                  khoa ngay tren bang thoi gian.
                </p>
              </div>

              <div className="bookingHistoryActions">
                <Link className="outlineBtnLink" to={adminFieldsPath}>
                  Ve quan ly san
                </Link>
              </div>
            </section>

            {loadingFields ? (
              <p className="helperText">Dang tai danh sach san cua ban...</p>
            ) : ownerFields.length === 0 ? (
              <section className="formCard bookingHistoryNotice">
                <div className="bookingHistoryNoticeText">
                  <h2>Chua co san de dat tay</h2>
                  <p>
                    Hay tao san trong Quan ly san. Sau khi san duoc admin duyet, ban co the quay lai
                    day de dat san truc tiep cho khach.
                  </p>
                </div>

                <div className="bookingHistoryActions">
                  <Link className="btn" to={adminFieldsPath}>
                    Tao hoac cap nhat san
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
                        <span>{field.district || "Dang cap nhat khu vuc"}</span>
                        <span>{field.openHours || "Chua co gio mo cua"}</span>
                        <span>{(field.subFields || []).length} san con</span>
                      </div>
                    </div>

                    <button
                      className="btn smallBtn"
                      type="button"
                      onClick={() => onFieldChange("fieldId", String(field.id))}
                    >
                      Chon san nay
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
          <h1>San da dat</h1>
          <p>Muon dat san moi, vao danh sach san va bam Dat lich tren san ban muon dat.</p>
        </div>

        <div className="container bookingHistoryPage">
          {catalogMessage && <p className="message warning">{catalogMessage}</p>}

          {hasInvalidFieldSelection && (
            <p className="message error">
              Khong tim thay san can dat. Vui long quay lai danh sach san va chon lai.
            </p>
          )}

          {!authToken && (
            <p className="message warning">
              Ban chua dang nhap. Vui long <Link to={loginPath} state={loginState}>dang nhap</Link>{" "}
              de xem lich su va xac nhan dat san.
            </p>
          )}

          <section className="formCard bookingHistoryNotice">
            <div className="bookingHistoryNoticeText">
              <h2>Dat lich tu tung san</h2>
              <p>
                Trang nay chi dung de xem san da dat. De dat lich moi, hay mo danh sach san va chon
                dung san ban muon dat.
              </p>
            </div>

            <div className="bookingHistoryActions">
              <Link className="btn" to={fieldsPath}>
                Xem danh sach san
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
              Quay lai
            </button>
            <div>
              <h1>{isOwnerPortal ? "Dat san thu cong cho khach" : "Dat lich ngay truc quan"}</h1>
              <p>
                {isOwnerPortal
                  ? "Xac nhan lai thong tin truoc khi tao don va khoa lich tren san cua ban."
                  : "Xac nhan lai thong tin truoc khi gui yeu cau dat san."}
              </p>
            </div>
            {isOwnerPortal && (
              <div className="bookingCheckoutHeaderActions">
                <Link className="outlineBtnLink bookingBackLink" to={adminFieldsPath}>
                  Ve quan ly san
                </Link>
              </div>
            )}
          </div>

          {!authToken && (
            <p className="message warning bookingCheckoutMessage">
              Ban chua dang nhap. Vui long <Link to={loginPath} state={loginState}>dang nhap</Link>{" "}
              truoc khi xac nhan dat san.
            </p>
          )}

          {catalogMessage && <p className="message warning bookingCheckoutMessage">{catalogMessage}</p>}

          <form className="bookingCheckoutCard" onSubmit={onSubmit}>
            <section className="bookingCheckoutSection">
              <h2>Thong tin san</h2>
              <div className="bookingCheckoutInfoGrid">
                <p>
                  <strong>Ten san:</strong> {selectedField.name}
                </p>
                <p>
                  <strong>Dia chi:</strong> {selectedField.address}
                </p>
                <p>
                  <strong>Khu vuc:</strong> {selectedField.district}
                </p>
                <p>
                  <strong>Gio mo cua:</strong> {selectedField.openHours}
                </p>
              </div>
            </section>

            <section className="bookingCheckoutSection">
              <h2>Thong tin lich dat</h2>
              <div className="bookingCheckoutInfoGrid">
                <p>
                  <strong>Ngay:</strong> {bookingDateLabel}
                </p>
                <p>
                  <strong>Lich da chon:</strong> {selectedSubField?.name}: {compactTimeSlot}
                </p>
                <p>
                  <strong>Loai san:</strong> {selectedSubField?.type || selectedField?.type || "--"}
                </p>
                <p>
                  <strong>Tong gio:</strong> {formatBookingDurationLabel(durationMinutes)}
                </p>
                <p>
                  <strong>Gia san con:</strong>{" "}
                  {formatPrice(selectedSubField?.pricePerHour || selectedField?.pricePerHour)} VND/gio
                </p>
                <p className="bookingCheckoutTotal">
                  <strong>Tong tien:</strong> {formatPrice(totalPrice)} VND
                </p>
              </div>
            </section>

            <button type="button" className="bookingServiceButton" disabled>
              Them dich vu
            </button>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-customer-name">
                {isOwnerPortal ? "Tai khoan tao don" : "Ten cua ban"}
              </label>
              <input
                id="booking-customer-name"
                type="text"
                value={displayName}
                placeholder="Dang nhap de hien ten"
                readOnly
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-phone">
                {isOwnerPortal ? "So dien thoai khach" : "So dien thoai"}
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
                {isOwnerPortal ? "Xac nhan so dien thoai khach" : "Xac nhan so dien thoai"}
              </label>
              <input
                id="booking-confirm-phone"
                type="tel"
                inputMode="numeric"
                value={form.confirmPhone}
                onChange={(event) => onFieldChange("confirmPhone", event.target.value)}
                placeholder="Nhap lai so dien thoai"
                disabled={!hasSelectedSlot}
              />
            </div>

            <div className="bookingCheckoutFieldGroup">
              <label htmlFor="booking-note">
                {isOwnerPortal ? "Ghi chu noi bo cho don dat tay" : "Ghi chu cho chu san"}
              </label>
              <textarea
                id="booking-note"
                rows={4}
                value={form.note}
                onChange={(event) => onFieldChange("note", event.target.value)}
                placeholder="Nhap ghi chu neu co"
                disabled={!hasSelectedSlot}
              />
            </div>

            <section className="bookingWarningBox">
              <strong>Luu y:</strong>
              <ul>
                {BOOKING_NOTES.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>

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
                  ? "Dang tao don..."
                  : "Dang gui yeu cau..."
                : isOwnerPortal
                  ? "Xac nhan va khoa lich"
                  : "Xac nhan va thanh toan"}
            </button>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="page section">
      <div className="container pageHeader">
        <h1>{isOwnerPortal ? `Dat san thu cong: ${selectedField.name}` : `Dat lich ${selectedField.name}`}</h1>
        <p>
          {isOwnerPortal
            ? "Chon san con va bam vao bang thoi gian de tao don dat thu cong tren chinh san cua ban."
            : "Chon san con va bam vao bang thoi gian de chon khung gio muon dat."}
        </p>
      </div>

      <div className="container bookingStagePage">
        {!authToken && (
          <p className="message warning">
            Ban chua dang nhap. Vui long <Link to={loginPath} state={loginState}>dang nhap</Link>{" "}
            truoc khi xac nhan dat san.
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
              <h2>{isOwnerPortal ? "Tao don dat thu cong" : "Dat lich ngay truc quan"}</h2>
              <p>
                {isOwnerPortal
                  ? "Cac o mau xam la khung gio da co lich, bao gom don dat truc tiep do ban tao."
                  : "Sau khi chon san con, bam cac o lien ke de ghep thanh khung gio dai hon."}
              </p>
            </div>

            <div className="bookingPlannerControls">
              <label className="bookingDateControl" htmlFor="booking-date">
                <span>Ngay dat</span>
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
                  <span>San cua ban</span>
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
                  Ve quan ly san
                </Link>
              ) : (
                <Link className="outlineBtnLink bookingBackLink" to={fieldsPath}>
                  Ve danh sach san
                </Link>
              )}
            </div>
          </div>

          <div className="bookingPlannerMeta">
            <div className="bookingPlannerMetaText">
              <h3>{selectedField.name}</h3>
              <p>{selectedField.address}</p>
              <p>
                {selectedField.district} | Gio mo cua: {selectedField.openHours}
              </p>
            </div>

            <div className="bookingSubFieldList">
              {(selectedField.subFields || []).map((subField) => (
                <span key={subField.key} className="bookingSubFieldTag">
                  {subField.name}
                  {subField.type ? ` | ${subField.type}` : ""}
                  {subField.pricePerHour
                    ? ` | ${formatPrice(subField.pricePerHour)} VND/gio`
                    : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="bookingLegend">
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--available" />
              Trong
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--booked" />
              Da dat
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--closed" />
              Khong chon duoc
            </span>
            <span className="bookingLegendItem">
              <span className="bookingLegendSwatch bookingLegendSwatch--selected" />
              Dang chon
            </span>
          </div>

          {isOwnerPortal && (
            <p className="helperText bookingLegendNote">
              O mau xam dam bao gom ca khung gio khach da dat truc tiep qua chu san, khong can qua
              ben thu ba.
            </p>
          )}

          <div className="bookingBoardWrap">
            <div className="bookingBoard">
              <div className="bookingBoardHeader" style={{ gridTemplateColumns: boardGridTemplate }}>
                <div className="bookingBoardCorner">San con / Gio</div>
                {timeline.map((slot) => (
                  <div key={slot.key} className="bookingBoardTime">
                    {slot.label}
                  </div>
                ))}
              </div>

              {loadingAvailability && (
                <p className="helperText bookingBoardStatus">Dang tai lich san...</p>
              )}

              {!loadingAvailability && scheduleRows.length === 0 && (
                <p className="helperText bookingBoardStatus">
                  San nay chua co san con de hien thi.
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
                        {row.subField.type || selectedField.type}
                        {row.subField.pricePerHour
                          ? ` | ${formatPrice(row.subField.pricePerHour)} VND/gio`
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
                  Tong gio {formatBookingDurationLabel(durationMinutes)} | Tong tien{" "}
                  {formatPrice(totalPrice)} VND
                </span>
              </>
            ) : (
              <>
                <strong>Chua chon khung gio</strong>
                <span>Hay bam vao bang thoi gian de chon san con va khung gio.</span>
              </>
            )}
          </div>

          <button
            type="button"
            className="bookingNextButton"
            onClick={onContinueToConfirm}
            disabled={!hasSelectedSlot}
          >
            Tiep theo
          </button>
        </section>
      </div>
    </section>
  )
}

export default BookingView
