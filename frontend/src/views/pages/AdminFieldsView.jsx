import React from "react"
import { Link } from "react-router-dom"
import {
  formatBookingDateLabel,
  formatBookingDateTime,
} from "../../models/bookingModel"
import {
  formatBookingStatusVi,
  formatPaymentStatusVi,
} from "../../models/bookingTextModel"
import { formatPrice, getFieldTypeSummary } from "../../models/fieldModel"
import { FIELD_TYPE_OPTIONS } from "../../models/fieldTypeModel"

const OWNER_DASHBOARD_CARDS = (stats) => [
  { key: "fields", label: "Tổng sân", value: stats.totalFields, tone: "primary" },
  { key: "bookings", label: "Tổng lượt đặt", value: stats.totalBookings, tone: "neutral" },
  { key: "pending", label: "Chờ xác nhận", value: stats.pendingBookings, tone: "warning" },
  { key: "confirmed", label: "Đã xác nhận", value: stats.confirmedBookings, tone: "success" },
  { key: "revenue", label: "Doanh thu", value: `${formatPrice(stats.totalRevenue)} VND`, tone: "success" },
]

const getFieldModerationState = (field) => {
  const rawStatus = String(field?.approvalStatus || field?.status || field?.fieldStatus || "")
    .trim()
    .toUpperCase()
  const isLocked = Boolean(field?.isLocked || field?.locked)

  if (isLocked || rawStatus === "LOCKED" || rawStatus === "REJECTED") {
    return "LOCKED"
  }

  if (rawStatus === "PENDING") {
    return "PENDING"
  }

  if (rawStatus === "APPROVED" || rawStatus === "ACTIVE") {
    return "APPROVED"
  }

  return "APPROVED"
}

const getFieldStatusLabel = (field) => {
  const moderationState = getFieldModerationState(field)

  if (moderationState === "PENDING") {
    return "Chờ admin duyệt"
  }

  if (moderationState === "LOCKED") {
    return "Đã khóa / từ chối"
  }

  return "Đã duyệt"
}

const canShareFieldPublicly = (field) => getFieldModerationState(field) === "APPROVED"

const AdminFieldsView = ({
  authToken,
  currentUser,
  canAccessFieldDashboard,
  isAdminPortal,
  isOwnerPortal,
  fields,
  stats,
  managedBookings,
  loading,
  submitting,
  uploadingCover,
  uploadingGallery,
  processingBookingId,
  processingBookingAction,
  deletingFieldId,
  fieldStatusActionId,
  fieldStatusActionMode,
  error,
  noticeMessage,
  successMessage,
  form,
  isEditingField,
  loginPath,
  fieldsPath,
  manualBookingPath,
  adminUsersPath,
  manageFieldsSectionId,
  fieldListSectionId,
  ownerBookingsSectionId,
  manageFieldsSectionPath,
  fieldListSectionPath,
  ownerBookingsSectionPath,
  publicOrigin,
  createPublicBookingUrl,
  handleFieldChange,
  handleSubFieldChange,
  handleAddSubField,
  handleRemoveSubField,
  handleCoverImageUpload,
  handleGalleryImagesUpload,
  handleRemoveCoverImage,
  handleRemoveGalleryImage,
  handleEditField,
  handleCancelFieldEdit,
  handleDeleteField,
  handleFieldModeration,
  handleSubmit,
  handleConfirmBooking,
  handleConfirmDeposit,
  handleConfirmPayment,
  handleCancelBooking,
}) => {
  if (!authToken) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Khu quản lý sân</h1>
          <p>
            Vui lòng <Link to={loginPath}>đăng nhập</Link> bằng tài khoản Admin hoặc Chủ sân để
            quản lý sân.
          </p>
        </div>
      </section>
    )
  }

  if (!canAccessFieldDashboard) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Khu quản lý sân</h1>
          <p>Tài khoản {currentUser?.email} không có quyền truy cập khu vực quản lý sân.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page section adminDashboardPage">
      <div className="container adminDashboardHero">
        <div>
          <p className="usersEyebrow">
            {isAdminPortal ? "Khu quản lý dành cho Admin" : "Khu quản lý dành cho Chủ sân"}
          </p>
          <h1>{isAdminPortal ? "Quản lý sân bóng" : "Bảng điều khiển chủ sân"}</h1>
          <p>
            {isAdminPortal
              ? "Admin chỉ có quản lý tài khoản và quản lý sân. Mọi sân do Chủ sân tạo sẽ đi qua bước chờ duyệt."
              : "Chủ sân có đặt sân thủ công cho khách, danh sách sân, quản lý sân và quản lý đơn đặt của khách."}
          </p>
        </div>
        <div className="adminDashboardOwner">
          <span>{isAdminPortal ? "Tài khoản admin" : "Tài khoản chủ sân"}</span>
          <strong>{currentUser?.email}</strong>
        </div>
      </div>

      {successMessage && (
        <div className="container">
          <p className="message success">{successMessage}</p>
        </div>
      )}
      {noticeMessage && (
        <div className="container">
          <p className="message warning">{noticeMessage}</p>
        </div>
      )}
      {error && (
        <div className="container">
          <p className="message error">{error}</p>
        </div>
      )}

      {isOwnerPortal && (
        <div className="container adminDashboardStats">
          {OWNER_DASHBOARD_CARDS(stats).map((card) => (
            <article className={`adminStatCard adminStatCard--${card.tone}`} key={card.key}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>
      )}

      <div className="container adminDashboardGrid">
        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>{isAdminPortal ? "Nhóm chức năng Admin" : "Nhóm chức năng Chủ sân"}</h2>
            <span>{isAdminPortal ? "2 mục chính" : "4 mục chính"}</span>
          </div>

          <p className="helperText">
            {isAdminPortal
              ? "Admin dùng khu này để duyệt sân, chỉnh sửa, khóa hoặc xóa sân. Quản lý tài khoản tách riêng ở khu quản trị tài khoản."
              : "Chủ sân dùng khu này để quản lý sân và đơn khách. Việc đặt sân thủ công cho khách bắt đầu từ màn đặt sân hoặc danh sách sân."}
          </p>

          <div className="fieldActions">
            {isAdminPortal ? (
              <>
                <Link className="btn smallBtn" to={adminUsersPath}>
                  Quản lý tài khoản
                </Link>
                <Link className="outlineBtnLink" to={manageFieldsSectionPath}>
                  Quản lý sân
                </Link>
              </>
            ) : (
              <>
                <Link className="btn smallBtn" to={manualBookingPath}>
                  Đặt sân thủ công
                </Link>
                <Link className="outlineBtnLink" to={fieldsPath}>
                  Danh sách sân
                </Link>
                <Link className="outlineBtnLink" to={manageFieldsSectionPath}>
                  Quản lý sân
                </Link>
                <Link className="outlineBtnLink" to={ownerBookingsSectionPath}>
                  Đơn đặt của khách
                </Link>
              </>
            )}
          </div>
        </section>

        <aside className="usersSidebar" id={manageFieldsSectionId}>
          <form className="formCard usersForm adminCreateFieldForm" onSubmit={handleSubmit}>
            <div className="usersPanelHeader">
              <h2>
                {isEditingField
                  ? "Cập nhật sân"
                  : isOwnerPortal
                    ? "Gửi yêu cầu tạo sân"
                    : "Tạo sân mới"}
              </h2>
              {isEditingField && <span>Đang chỉnh sửa</span>}
            </div>
            {isEditingField && (
              <p className="helperText">
                Bạn đang chỉnh sửa sân hiện có. Lưu để cập nhật, hoặc hủy để tạo mới.
              </p>
            )}
            {!isEditingField && isOwnerPortal && (
              <p className="helperText">
                Sau khi gửi yêu cầu, Admin sẽ duyệt sân trước khi mở link đặt sân công khai.
              </p>
            )}

            <label htmlFor="admin-field-name">Tên sân</label>
            <input
              id="admin-field-name"
              type="text"
              value={form.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="Sân Bóng Riverside"
            />

            <label htmlFor="admin-field-address">Địa chỉ</label>
            <input
              id="admin-field-address"
              type="text"
              value={form.address}
              onChange={(event) => handleFieldChange("address", event.target.value)}
              placeholder="123 Nguyễn Huệ, Quận 1"
            />

            <label htmlFor="admin-field-district">Khu vực</label>
            <input
              id="admin-field-district"
              type="text"
              value={form.district}
              onChange={(event) => handleFieldChange("district", event.target.value)}
              placeholder="Quận 1"
            />

            <label htmlFor="admin-field-type">Loại sân mặc định</label>
            <select
              id="admin-field-type"
              value={form.type}
              onChange={(event) => handleFieldChange("type", event.target.value)}
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label htmlFor="admin-field-open-hours">Giờ mở cửa</label>
            <input
              id="admin-field-open-hours"
              type="text"
              value={form.openHours}
              onChange={(event) => handleFieldChange("openHours", event.target.value)}
              placeholder="06:00 - 22:00"
            />

            <label htmlFor="admin-field-price">Giá mặc định theo giờ</label>
            <input
              id="admin-field-price"
              type="number"
              min="1000"
              step="1000"
              value={form.pricePerHour}
              onChange={(event) => handleFieldChange("pricePerHour", event.target.value)}
              placeholder="350000"
            />

            <label htmlFor="admin-field-cover">Ảnh đại diện</label>
            <input
              id="admin-field-cover"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                await handleCoverImageUpload(file)
                event.target.value = ""
              }}
            />
            <p className="helperText">Hỗ trợ JPG, PNG, WEBP, GIF. Tối đa 8MB.</p>
            {uploadingCover && <p className="helperText">Đang tải ảnh đại diện...</p>}
            {form.coverImage && (
              <div className="adminUploadPreviewCard">
                <img
                  src={form.coverImage}
                  alt="Ảnh đại diện sân"
                  className="adminUploadPreviewImage"
                />
                <div className="adminUploadPreviewMeta">
                  <span>Ảnh đại diện đã tải lên</span>
                  <button
                    type="button"
                    className="outlineBtnInline adminDangerBtn"
                    onClick={handleRemoveCoverImage}
                    disabled={uploadingCover}
                  >
                    Xóa ảnh
                  </button>
                </div>
              </div>
            )}

            <label htmlFor="admin-field-article">Mô tả</label>
            <textarea
              id="admin-field-article"
              rows={4}
              value={form.article}
              onChange={(event) => handleFieldChange("article", event.target.value)}
              placeholder="Mô tả ngắn về sân bóng của bạn"
            />

            <div className="adminSubFieldBuilderHeader">
              <label>Thiết lập từng sân con</label>
              <button type="button" className="outlineBtnInline" onClick={handleAddSubField}>
                Thêm sân con
              </button>
            </div>
            <p className="helperText">
              Mỗi sân con có tên, loại sân và giá riêng. Chỉ hỗ trợ Sân 5, Sân 7, Sân 11 và
              Futsal.
            </p>
            <div className="adminSubFieldConfigList">
              {(form.subFields || []).map((subField, index) => (
                <article className="adminSubFieldConfigCard" key={subField.id}>
                  <div className="adminSubFieldConfigHeader">
                    <strong>Sân con {index + 1}</strong>
                    <button
                      type="button"
                      className="outlineBtnInline adminDangerBtn"
                      onClick={() => handleRemoveSubField(subField.id)}
                      disabled={(form.subFields || []).length === 1}
                    >
                      Xóa
                    </button>
                  </div>
                  <label htmlFor={`admin-subfield-name-${subField.id}`}>Tên sân con</label>
                  <input
                    id={`admin-subfield-name-${subField.id}`}
                    type="text"
                    value={subField.name}
                    onChange={(event) =>
                      handleSubFieldChange(subField.id, "name", event.target.value)
                    }
                    placeholder={`Sân ${index + 1}`}
                  />
                  <label htmlFor={`admin-subfield-type-${subField.id}`}>Loại sân</label>
                  <select
                    id={`admin-subfield-type-${subField.id}`}
                    value={subField.type}
                    onChange={(event) =>
                      handleSubFieldChange(subField.id, "type", event.target.value)
                    }
                  >
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <label htmlFor={`admin-subfield-price-${subField.id}`}>Giá theo giờ</label>
                  <input
                    id={`admin-subfield-price-${subField.id}`}
                    type="number"
                    min="1000"
                    step="1000"
                    value={subField.pricePerHour}
                    onChange={(event) =>
                      handleSubFieldChange(subField.id, "pricePerHour", event.target.value)
                    }
                    placeholder={form.pricePerHour || "350000"}
                  />
                </article>
              ))}
            </div>

            <label htmlFor="admin-field-images">Ảnh thư viện</label>
            <input
              id="admin-field-images"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              onChange={async (event) => {
                await handleGalleryImagesUpload(event.target.files)
                event.target.value = ""
              }}
            />
            <p className="helperText">Bạn có thể chọn nhiều ảnh cùng lúc cho thư viện ảnh.</p>
            {uploadingGallery && <p className="helperText">Đang tải ảnh thư viện...</p>}
            {form.galleryImages.length > 0 && (
              <div className="adminUploadPreviewGrid">
                {form.galleryImages.map((imageUrl, index) => (
                  <article className="adminUploadPreviewCard" key={`${imageUrl}-${index}`}>
                    <img
                      src={imageUrl}
                      alt={`Ảnh thư viện sân ${index + 1}`}
                      className="adminUploadPreviewImage"
                    />
                    <div className="adminUploadPreviewMeta">
                      <span>Ảnh thư viện {index + 1}</span>
                      <button
                        type="button"
                        className="outlineBtnInline adminDangerBtn"
                        onClick={() => handleRemoveGalleryImage(imageUrl)}
                        disabled={uploadingGallery}
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="fieldActions">
              <button
                className="btn"
                type="submit"
                disabled={submitting || uploadingCover || uploadingGallery}
              >
                {submitting
                  ? isEditingField
                    ? "Đang cập nhật..."
                    : isOwnerPortal
                      ? "Đang gửi yêu cầu..."
                      : "Đang tạo sân..."
                  : isEditingField
                    ? "Lưu cập nhật"
                    : isOwnerPortal
                      ? "Gửi yêu cầu tạo sân"
                      : "Tạo sân mới"}
              </button>
              {isEditingField && (
                <button
                  className="outlineBtnInline"
                  type="button"
                  onClick={handleCancelFieldEdit}
                  disabled={submitting}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </form>
        </aside>
      </div>

      <div className="container" id={fieldListSectionId}>
        <article className="usersPanel adminFieldListPanel">
          <div className="usersPanelHeader">
            <h2>{isAdminPortal ? "Quản lý các sân gửi lên" : "Danh sách sân của bạn"}</h2>
            <span>{fields.length} sân</span>
          </div>
          {loading ? (
            <p>Đang tải danh sách sân...</p>
          ) : fields.length === 0 ? (
            <p className="usersEmptyState">
              Bạn chưa tạo sân nào. Sau khi tạo, link công khai đặt sân sẽ hiển thị ở đây.
            </p>
          ) : (
            <div className="adminFieldList">
              {fields.map((field) => {
                const publicBookingUrl = createPublicBookingUrl(publicOrigin, field.slug)
                const isDeleting = String(deletingFieldId) === String(field.id)
                const moderationState = getFieldModerationState(field)
                const canModerateField = isAdminPortal
                const isFieldStatusProcessing =
                  String(fieldStatusActionId) === String(field.id)
                const canOpenPublicLink = canShareFieldPublicly(field)
                const fieldStatusActionLabel =
                  moderationState === "APPROVED"
                    ? "Khóa sân"
                    : moderationState === "LOCKED"
                      ? "Mở khóa"
                      : "Duyệt sân"
                return (
                  <article className="adminFieldCard" key={field.id}>
                    <div className="adminFieldCardHeader">
                      <div>
                        <h3>{field.name}</h3>
                        <p>{field.address}</p>
                      </div>
                      <span className="adminFieldPrice">
                        {formatPrice(field.pricePerHour)} VND/giờ
                      </span>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Trạng thái: {getFieldStatusLabel(field)}</span>
                      <span>Khu vực: {field.district}</span>
                      <span>Loại sân: {getFieldTypeSummary(field) || field.type}</span>
                      <span>Giờ mở cửa: {field.openHours}</span>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Slug: /dat-san/{field.slug}</span>
                      <span>Số sân con: {(field.subFields || []).length}</span>
                    </div>
                    <div className="adminFieldSubFieldList">
                      {(field.subFields || []).map((item, index) => (
                        <span
                          className="adminSlotTag"
                          key={`${field.id}-${item.key || item.name || index}`}
                        >
                          {item.name}
                          {item.type ? ` | ${item.type}` : ""}
                          {item.pricePerHour
                            ? ` | ${formatPrice(item.pricePerHour)} VND/giờ`
                            : ""}
                        </span>
                      ))}
                    </div>
                    {canOpenPublicLink ? (
                      <>
                        <label
                          className="adminFieldLinkLabel"
                          htmlFor={`booking-url-${field.id}`}
                        >
                          Link đặt sân công khai
                        </label>
                        <input
                          id={`booking-url-${field.id}`}
                          type="text"
                          readOnly
                          value={publicBookingUrl}
                        />
                      </>
                    ) : (
                      <p className="helperText">
                        Sân này chưa mở link công khai vì đang chờ Admin duyệt hoặc đã bị khóa.
                      </p>
                    )}
                    <div className="fieldActions">
                      {canOpenPublicLink && (
                        <a
                          className="btn smallBtn"
                          href={publicBookingUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Mở link đặt sân
                        </a>
                      )}
                      {canModerateField && (
                        <button
                          type="button"
                          className="outlineBtnInline"
                          onClick={() => handleFieldModeration(field)}
                          disabled={isDeleting || isFieldStatusProcessing}
                        >
                          {isFieldStatusProcessing
                            ? fieldStatusActionMode === "approve"
                              ? "Đang duyệt..."
                              : "Đang khóa..."
                            : fieldStatusActionLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        className="outlineBtnInline"
                        onClick={() => handleEditField(field)}
                        disabled={isDeleting || isFieldStatusProcessing}
                      >
                        Sửa sân
                      </button>
                      <button
                        type="button"
                        className="outlineBtnInline adminDangerBtn"
                        onClick={() => handleDeleteField(field)}
                        disabled={isDeleting || isFieldStatusProcessing}
                      >
                        {isDeleting ? "Đang xóa..." : "Xóa sân"}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </article>
      </div>

      {isOwnerPortal && (
        <div className="container" id={ownerBookingsSectionId}>
          <section className="usersPanel adminDashboardPanel">
            <div className="usersPanelHeader">
              <h2>Quản lý đơn đặt của khách</h2>
              <span>{managedBookings.length} đơn</span>
            </div>
            {loading ? (
              <p>Đang tải danh sách đơn đặt của khách...</p>
            ) : managedBookings.length === 0 ? (
              <p className="usersEmptyState">
                Chưa có đơn đặt nào trong danh sách quản lý của chủ sân.
              </p>
            ) : (
              <div className="adminManagedBookingList">
                {managedBookings.map((booking) => {
                  const isProcessing = String(processingBookingId) === String(booking.id)
                  const bookingStatus = String(booking.status || "").trim().toLowerCase()
                  const paymentStatus = String(
                    booking.paymentStatus || (booking.depositPaid ? "deposit_paid" : "unpaid")
                  )
                    .trim()
                    .toLowerCase()
                  const isConfirmingBooking = isProcessing && processingBookingAction === "confirm"
                  const isConfirmingDeposit = isProcessing && processingBookingAction === "deposit"
                  const isConfirmingPayment = isProcessing && processingBookingAction === "payment"
                  const isCancelling = isProcessing && processingBookingAction === "cancel"
                  const canConfirm = bookingStatus === "pending"
                  const canConfirmDeposit =
                    bookingStatus !== "cancelled"
                    && paymentStatus !== "paid"
                    && paymentStatus !== "deposit_paid"
                  const canConfirmPayment = bookingStatus !== "cancelled" && paymentStatus !== "paid"
                  const canCancel = bookingStatus !== "cancelled"

                  return (
                    <article className="adminManagedBookingCard" key={booking.id}>
                      <div className="adminRecentBookingHeader">
                        <div>
                          <h3>{booking.fieldName}</h3>
                          <p>
                            {booking.subFieldName || "Sân tổng"}
                            {booking.subFieldType ? ` | ${booking.subFieldType}` : ""}
                            {" | "}
                            {formatBookingDateLabel(booking.date)} | {booking.timeSlot}
                          </p>
                        </div>
                        <div className="adminManagedBookingStatusGroup">
                          <span className="adminRecentBookingStatus">
                            {formatBookingStatusVi(booking.status)}
                          </span>
                          <span className="adminDepositBadge">
                            {formatPaymentStatusVi(booking.paymentStatus, booking.depositStatus)}
                          </span>
                        </div>
                      </div>
                      <div className="adminFieldMeta">
                        <span>Khách: {booking.customer?.fullName || "Khách hàng"}</span>
                        {booking.customer?.email && <span>Email: {booking.customer.email}</span>}
                        {booking.customer?.phone && <span>SĐT: {booking.customer.phone}</span>}
                      </div>
                      <div className="adminFieldMeta">
                        <span>Tổng tiền: {formatPrice(booking.totalPrice)} VND</span>
                        <span>Đặt cọc: {formatPrice(booking.depositAmount)} VND</span>
                        <span>Còn lại: {formatPrice(booking.remainingAmount)} VND</span>
                        <span>Tạo lúc: {formatBookingDateTime(booking.createdAt)}</span>
                      </div>
                      {booking.note && (
                        <p className="adminBookingNote">
                          <strong>Ghi chú:</strong> {booking.note}
                        </p>
                      )}
                      {(canConfirm || canConfirmDeposit || canConfirmPayment || canCancel) && (
                        <div className="fieldActions">
                          {canConfirm && (
                            <button
                              type="button"
                              className="outlineBtnInline"
                              disabled={isProcessing}
                              onClick={() => handleConfirmBooking(booking.id)}
                            >
                              {isConfirmingBooking ? "Đang xác nhận..." : "Xác nhận đặt sân"}
                            </button>
                          )}
                          {canConfirmDeposit && (
                            <button
                              type="button"
                              className="outlineBtnInline"
                              disabled={isProcessing}
                              onClick={() => handleConfirmDeposit(booking.id)}
                            >
                              {isConfirmingDeposit
                                ? "Đang xác nhận cọc..."
                                : "Xác nhận đặt cọc thành công"}
                            </button>
                          )}
                          {canConfirmPayment && (
                            <button
                              type="button"
                              className="outlineBtnInline"
                              disabled={isProcessing}
                              onClick={() => handleConfirmPayment(booking.id)}
                            >
                              {isConfirmingPayment
                                ? "Đang xác nhận thanh toán..."
                                : "Xác nhận thanh toán thành công"}
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              className="outlineBtnInline adminDangerBtn"
                              disabled={isProcessing}
                              onClick={() => handleCancelBooking(booking.id)}
                            >
                              {isCancelling ? "Đang hủy..." : "Hủy đơn đặt"}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}

export default AdminFieldsView
