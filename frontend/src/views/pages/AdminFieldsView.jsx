import React from "react"
import { Link } from "react-router-dom"
import {
  FiArrowRight,
  FiCalendar,
  FiExternalLink,
  FiImage,
  FiLayers,
  FiLink2,
  FiMapPin,
  FiTool,
} from "react-icons/fi"
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
  {
    key: "revenue",
    label: "Doanh thu",
    value: `${formatPrice(stats.totalRevenue)} VND`,
    tone: "success",
  },
]

const createOwnerQuickActions = ({ manualBookingPath }) => [
  {
    key: "manual",
    title: "Đặt sân thủ công",
    path: manualBookingPath,
    icon: FiCalendar,
    tone: "primary",
  },
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

const getFieldStatusTone = (field) => {
  const moderationState = getFieldModerationState(field)

  if (moderationState === "PENDING") {
    return "warning"
  }

  if (moderationState === "LOCKED") {
    return "danger"
  }

  return "success"
}

const canShareFieldPublicly = (field) => getFieldModerationState(field) === "APPROVED"

const buildManualBookingFieldPath = (manualBookingPath, fieldId) =>
  `${manualBookingPath}?fieldId=${encodeURIComponent(String(fieldId || "").trim())}`

const QuickActionGrid = ({ actions }) => (
  <section className="ownerQuickActionGrid">
    {actions.map((action) => {
      const ActionIcon = action.icon

      return (
        <Link
          key={action.key}
          className={`ownerQuickActionCard ownerQuickActionCard--${action.tone}`}
          to={action.path}
        >
          <span className="ownerQuickActionIcon" aria-hidden="true">
            <ActionIcon />
          </span>
          <strong>{action.title}</strong>
          <span className="ownerQuickActionLink">
            Mở mục này <FiArrowRight aria-hidden="true" />
          </span>
        </Link>
      )
    })}
  </section>
)

const FieldFormPanel = ({
  isAdminPortal,
  isOwnerPortal,
  form,
  isEditingField,
  submitting,
  uploadingCover,
  uploadingGallery,
  manageFieldsSectionId,
  handleFieldChange,
  handleSubFieldChange,
  handleAddSubField,
  handleRemoveSubField,
  handleCoverImageUpload,
  handleGalleryImagesUpload,
  handleRemoveCoverImage,
  handleRemoveGalleryImage,
  handleCancelFieldEdit,
  handleSubmit,
}) => (
  <section className="ownerSectionCard ownerSectionCard--form" id={manageFieldsSectionId}>
    <form className="formCard ownerCreateFieldForm" onSubmit={handleSubmit}>
      <div className="ownerSectionHeading">
        <div className="ownerSectionTitle">
          <p className="ownerSectionEyebrow">
            {isAdminPortal ? "Quản lý hồ sơ sân" : "Không gian gửi sân"}
          </p>
          <h2>
            {isEditingField
              ? "Cập nhật sân"
              : isOwnerPortal
                ? "Gửi yêu cầu tạo sân"
                : "Tạo sân mới"}
          </h2>
        </div>

        <div className="ownerSectionMeta">
          {isEditingField && <span className="ownerSectionBadge">Đang chỉnh sửa</span>}
          {!isEditingField && isOwnerPortal && (
            <span className="ownerSectionBadge ownerSectionBadge--warning">Chờ admin duyệt</span>
          )}
        </div>
      </div>

      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader">
          <div>
            <h3>Thông tin cơ bản</h3>
          </div>
          <span className="ownerFormSectionChip">
            <FiMapPin aria-hidden="true" /> Cơ bản
          </span>
        </div>

        <div className="ownerFormGrid">
          <label className="ownerFormField" htmlFor="admin-field-name">
            <span>Tên sân</span>
            <input
              id="admin-field-name"
              type="text"
              value={form.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="Sân Bóng Riverside"
            />
          </label>

          <label className="ownerFormField ownerFormField--wide" htmlFor="admin-field-address">
            <span>Địa chỉ</span>
            <input
              id="admin-field-address"
              type="text"
              value={form.address}
              onChange={(event) => handleFieldChange("address", event.target.value)}
              placeholder="123 Nguyễn Huệ, Quận 1"
            />
          </label>

          <label className="ownerFormField" htmlFor="admin-field-district">
            <span>Khu vực</span>
            <input
              id="admin-field-district"
              type="text"
              value={form.district}
              onChange={(event) => handleFieldChange("district", event.target.value)}
              placeholder="Quận 1"
            />
          </label>

          <label className="ownerFormField" htmlFor="admin-field-type">
            <span>Loại sân mặc định</span>
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
          </label>

          <label className="ownerFormField" htmlFor="admin-field-open-hours">
            <span>Giờ mở cửa</span>
            <input
              id="admin-field-open-hours"
              type="text"
              value={form.openHours}
              onChange={(event) => handleFieldChange("openHours", event.target.value)}
              placeholder="06:00 - 22:00"
            />
          </label>

          <label className="ownerFormField" htmlFor="admin-field-price">
            <span>Giá mặc định theo giờ</span>
            <input
              id="admin-field-price"
              type="number"
              min="1000"
              step="1000"
              value={form.pricePerHour}
              onChange={(event) => handleFieldChange("pricePerHour", event.target.value)}
              placeholder="350000"
            />
          </label>
        </div>
      </section>

      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader">
          <div>
            <h3>Ảnh và mô tả</h3>
          </div>
          <span className="ownerFormSectionChip">
            <FiImage aria-hidden="true" /> Trình bày
          </span>
        </div>

        <div className="ownerUploadGrid">
          <div className="ownerUploadBox">
            <label className="ownerFormField" htmlFor="admin-field-cover">
              <span>Ảnh đại diện</span>
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
            </label>
            {uploadingCover && <p className="helperText ownerInlineHelper">Đang tải ảnh đại diện...</p>}
            {form.coverImage ? (
              <div className="adminUploadPreviewCard ownerUploadPreviewCard">
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
            ) : (
              <div className="ownerUploadPlaceholder">
                <FiImage aria-hidden="true" />
                <span>Chưa có ảnh đại diện</span>
              </div>
            )}
          </div>

          <div className="ownerUploadBox">
            <label className="ownerFormField" htmlFor="admin-field-images">
              <span>Thư viện ảnh</span>
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
            </label>
            {uploadingGallery && <p className="helperText ownerInlineHelper">Đang tải ảnh thư viện...</p>}
            {form.galleryImages.length > 0 ? (
              <div className="adminUploadPreviewGrid ownerGalleryGrid">
                {form.galleryImages.map((imageUrl, index) => (
                  <article className="adminUploadPreviewCard ownerUploadPreviewCard" key={`${imageUrl}-${index}`}>
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
            ) : (
              <div className="ownerUploadPlaceholder ownerUploadPlaceholder--soft">
                <FiLayers aria-hidden="true" />
                <span>Chưa có thư viện ảnh</span>
              </div>
            )}
          </div>
        </div>

        <label className="ownerFormField ownerFormField--wide" htmlFor="admin-field-article">
          <span>Mô tả sân</span>
          <textarea
            id="admin-field-article"
            rows={4}
            value={form.article}
            onChange={(event) => handleFieldChange("article", event.target.value)}
            placeholder="Mô tả ngắn về sân bóng của bạn"
          />
        </label>
      </section>

      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader">
          <div>
            <h3>Cấu hình sân con</h3>
          </div>

          <div className="ownerFormSectionActions">
            <span className="ownerFormSectionChip">
              <FiTool aria-hidden="true" /> {(form.subFields || []).length} sân con
            </span>
            <button type="button" className="outlineBtnInline" onClick={handleAddSubField}>
              Thêm sân con
            </button>
          </div>
        </div>

        <div className="ownerSubFieldGrid">
          {(form.subFields || []).map((subField, index) => (
            <article className="ownerSubFieldCard" key={subField.id}>
              <div className="ownerSubFieldHeader">
                <div>
                  <strong>Sân con {index + 1}</strong>
                </div>
                <button
                  type="button"
                  className="outlineBtnInline adminDangerBtn"
                  onClick={() => handleRemoveSubField(subField.id)}
                  disabled={(form.subFields || []).length === 1}
                >
                  Xóa
                </button>
              </div>

              <div className="ownerFormGrid ownerFormGrid--subfield">
                <label className="ownerFormField ownerFormField--wide" htmlFor={`admin-subfield-name-${subField.id}`}>
                  <span>Tên sân con</span>
                  <input
                    id={`admin-subfield-name-${subField.id}`}
                    type="text"
                    value={subField.name}
                    onChange={(event) =>
                      handleSubFieldChange(subField.id, "name", event.target.value)
                    }
                    placeholder={`Sân ${index + 1}`}
                  />
                </label>

                <label className="ownerFormField" htmlFor={`admin-subfield-type-${subField.id}`}>
                  <span>Loại sân</span>
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
                </label>

                <label className="ownerFormField" htmlFor={`admin-subfield-price-${subField.id}`}>
                  <span>Giá theo giờ</span>
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
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="ownerFormActions">
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
  </section>
)

const FieldListSection = ({
  isAdminPortal,
  isOwnerPortal,
  fields,
  loading,
  deletingFieldId,
  fieldStatusActionId,
  fieldStatusActionMode,
  fieldListSectionId,
  manualBookingPath,
  fieldsPath,
  publicOrigin,
  createPublicBookingUrl,
  handleFieldModeration,
  handleEditField,
  handleDeleteField,
}) => (
  <section className="ownerSectionCard ownerSectionCard--list" id={fieldListSectionId}>
    <div className="ownerSectionHeading">
      <div className="ownerSectionTitle">
        <p className="ownerSectionEyebrow">
          {isAdminPortal ? "Danh sách cần duyệt" : "Kho sân đang quản lý"}
        </p>
        <h2>{isAdminPortal ? "Quản lý các sân gửi lên" : "Danh sách sân của bạn"}</h2>
      </div>

      <div className="ownerSectionMeta">
        <span className="ownerSectionBadge">{fields.length} sân</span>
        {isOwnerPortal && (
          <Link className="outlineBtnLink" to={fieldsPath}>
            Xem giao diện công khai
          </Link>
        )}
      </div>
    </div>

    {loading ? (
      <p>Đang tải danh sách sân...</p>
    ) : fields.length === 0 ? (
      <p className="usersEmptyState">
        {isAdminPortal
          ? "Chưa có sân nào được gửi lên để quản lý."
          : "Bạn chưa tạo sân nào."}
      </p>
    ) : (
      <div className="ownerFieldList">
        {fields.map((field) => {
          const publicBookingUrl = createPublicBookingUrl(publicOrigin, field.slug)
          const isDeleting = String(deletingFieldId) === String(field.id)
          const moderationState = getFieldModerationState(field)
          const isFieldStatusProcessing = String(fieldStatusActionId) === String(field.id)
          const canModerateField = isAdminPortal
          const canOpenPublicLink = canShareFieldPublicly(field)
          const fieldStatusActionLabel =
            moderationState === "APPROVED"
              ? "Khóa sân"
              : moderationState === "LOCKED"
                ? "Mở khóa"
                : "Duyệt sân"

          return (
            <article className="ownerFieldCard" key={field.id}>
              <div className="ownerFieldMedia">
                {field.coverImage ? (
                  <img src={field.coverImage} alt={field.name} />
                ) : (
                  <div className="ownerFieldMediaFallback">
                    <FiMapPin aria-hidden="true" />
                    <span>{field.district || "Sân bóng"}</span>
                  </div>
                )}
              </div>

              <div className="ownerFieldBody">
                <div className="ownerFieldHeader">
                  <div>
                    <h3>{field.name}</h3>
                    <p>{field.address}</p>
                  </div>
                  <span className={`ownerStatusPill ownerStatusPill--${getFieldStatusTone(field)}`}>
                    {getFieldStatusLabel(field)}
                  </span>
                </div>

                <div className="ownerFieldMetrics">
                  <article className="ownerFieldMetric">
                    <span>Giá / giờ</span>
                    <strong>{formatPrice(field.pricePerHour)} VND</strong>
                  </article>
                  <article className="ownerFieldMetric">
                    <span>Giờ mở cửa</span>
                    <strong>{field.openHours || "--"}</strong>
                  </article>
                  <article className="ownerFieldMetric">
                    <span>Loại sân</span>
                    <strong>{getFieldTypeSummary(field) || field.type || "--"}</strong>
                  </article>
                  <article className="ownerFieldMetric">
                    <span>Sân con</span>
                    <strong>{(field.subFields || []).length}</strong>
                  </article>
                </div>

                <div className="ownerFieldChipRow">
                  <span className="ownerFieldChip">
                    <FiLink2 aria-hidden="true" /> /dat-san/{field.slug}
                  </span>
                  <span className="ownerFieldChip">
                    <FiMapPin aria-hidden="true" /> {field.district || "Đang cập nhật khu vực"}
                  </span>
                </div>

                <div className="ownerFieldSubFieldList">
                  {(field.subFields || []).map((item, index) => (
                    <span
                      className="adminSlotTag ownerFieldSubFieldChip"
                      key={`${field.id}-${item.key || item.name || index}`}
                    >
                      {item.name}
                      {item.type ? ` | ${item.type}` : ""}
                      {item.pricePerHour ? ` | ${formatPrice(item.pricePerHour)} VND/giờ` : ""}
                    </span>
                  ))}
                </div>

                {canOpenPublicLink ? (
                  <div className="ownerFieldLinkBox">
                    <label className="adminFieldLinkLabel" htmlFor={`booking-url-${field.id}`}>
                      Link đặt sân công khai
                    </label>
                    <input id={`booking-url-${field.id}`} type="text" readOnly value={publicBookingUrl} />
                  </div>
                ) : null}

                <div className="fieldActions ownerFieldActions">
                  {isOwnerPortal && (
                    <Link className="btn smallBtn" to={buildManualBookingFieldPath(manualBookingPath, field.id)}>
                      Đặt tay trên sân này
                    </Link>
                  )}

                  {canOpenPublicLink && (
                    <a
                      className="outlineBtnLink"
                      href={publicBookingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mở link công khai <FiExternalLink aria-hidden="true" />
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
              </div>
            </article>
          )
        })}
      </div>
    )}
  </section>
)

const ManagedBookingsSection = ({
  loading,
  managedBookings,
  processingBookingId,
  processingBookingAction,
  ownerBookingsSectionId,
  manualBookingPath,
  handleConfirmBooking,
  handleConfirmDeposit,
  handleConfirmPayment,
  handleCancelBooking,
}) => (
  <section className="ownerSectionCard ownerSectionCard--bookings" id={ownerBookingsSectionId}>
    <div className="ownerSectionHeading">
      <div className="ownerSectionTitle">
        <p className="ownerSectionEyebrow">Đơn đặt của khách</p>
        <h2>Quản lý đơn đặt của khách</h2>
      </div>

      <div className="ownerSectionMeta">
        <span className="ownerSectionBadge">{managedBookings.length} đơn</span>
        <Link className="outlineBtnLink" to={manualBookingPath}>
          Tạo đơn mới
        </Link>
      </div>
    </div>

    {loading ? (
      <p>Đang tải danh sách đơn đặt của khách...</p>
    ) : managedBookings.length === 0 ? (
      <p className="usersEmptyState">Chưa có đơn đặt nào trong danh sách quản lý của chủ sân.</p>
    ) : (
      <div className="ownerBookingList">
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
            <article className="ownerBookingCard" key={booking.id}>
              <div className="ownerBookingHeader">
                <div>
                  <h3>{booking.fieldName}</h3>
                  <p>
                    {booking.subFieldName || "Sân tổng"}
                    {booking.subFieldType ? ` | ${booking.subFieldType}` : ""}
                    {" | "}
                    {formatBookingDateLabel(booking.date)} | {booking.timeSlot}
                  </p>
                </div>

                <div className="ownerBookingStatusGroup">
                  <span className="ownerStatusPill ownerStatusPill--warning">
                    {formatBookingStatusVi(booking.status)}
                  </span>
                  <span className="ownerStatusPill ownerStatusPill--neutral">
                    {formatPaymentStatusVi(booking.paymentStatus, booking.depositStatus)}
                  </span>
                </div>
              </div>

              <div className="ownerBookingMetaGrid">
                <article className="ownerBookingMetaItem">
                  <span>Khách</span>
                  <strong>{booking.customer?.fullName || "Khách hàng"}</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Liên hệ</span>
                  <strong>{booking.customer?.phone || booking.customer?.email || "--"}</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Tổng tiền</span>
                  <strong>{formatPrice(booking.totalPrice)} VND</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Đặt cọc</span>
                  <strong>{formatPrice(booking.depositAmount)} VND</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Còn lại</span>
                  <strong>{formatPrice(booking.remainingAmount)} VND</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Tạo lúc</span>
                  <strong>{formatBookingDateTime(booking.createdAt)}</strong>
                </article>
              </div>

              {booking.note && (
                <p className="adminBookingNote">
                  <strong>Ghi chú:</strong> {booking.note}
                </p>
              )}

              {(canConfirm || canConfirmDeposit || canConfirmPayment || canCancel) && (
                <div className="fieldActions ownerFieldActions">
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
)

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
            Vui lòng <Link to={loginPath}>đăng nhập</Link> bằng tài khoản Admin hoặc Chủ sân để quản
            lý sân.
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

  const ownerQuickActions = createOwnerQuickActions({
    manualBookingPath,
  })

  if (isOwnerPortal) {
    return (
      <section className="page section adminDashboardPage ownerDashboardPage">
        <div className="container ownerHeroCard">
          <div className="ownerHeroCopy">
            <p className="ownerHeroEyebrow">Không gian chủ sân</p>
            <h1>Quản lý sân</h1>

            <div className="ownerHeroActions">
              <Link className="btn" to={manualBookingPath}>
                Đặt sân thủ công
              </Link>
              <Link className="outlineBtnLink" to={fieldsPath}>
                Danh sách sân
              </Link>
            </div>
          </div>

          <aside className="ownerHeroAside">
            <div className="ownerAccountCard">
              <span>Tài khoản chủ sân</span>
              <strong>{currentUser?.email}</strong>
            </div>
          </aside>
        </div>

        {(successMessage || noticeMessage || error) && (
          <div className="container ownerMessageStack">
            {successMessage && <p className="message success">{successMessage}</p>}
            {noticeMessage && <p className="message warning">{noticeMessage}</p>}
            {error && <p className="message error">{error}</p>}
          </div>
        )}

        <div className="container ownerDashboardStats">
          {OWNER_DASHBOARD_CARDS(stats).map((card) => (
            <article className={`adminStatCard adminStatCard--${card.tone} ownerStatCard`} key={card.key}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>

        <div className="container">
          <QuickActionGrid actions={ownerQuickActions} />
        </div>

        <div className="container ownerDashboardStack">
          <FieldFormPanel
            isAdminPortal={isAdminPortal}
            isOwnerPortal={isOwnerPortal}
            form={form}
            isEditingField={isEditingField}
            submitting={submitting}
            uploadingCover={uploadingCover}
            uploadingGallery={uploadingGallery}
            manageFieldsSectionId={manageFieldsSectionId}
            handleFieldChange={handleFieldChange}
            handleSubFieldChange={handleSubFieldChange}
            handleAddSubField={handleAddSubField}
            handleRemoveSubField={handleRemoveSubField}
            handleCoverImageUpload={handleCoverImageUpload}
            handleGalleryImagesUpload={handleGalleryImagesUpload}
            handleRemoveCoverImage={handleRemoveCoverImage}
            handleRemoveGalleryImage={handleRemoveGalleryImage}
            handleCancelFieldEdit={handleCancelFieldEdit}
            handleSubmit={handleSubmit}
          />

          <FieldListSection
            isAdminPortal={isAdminPortal}
            isOwnerPortal={isOwnerPortal}
            fields={fields}
            loading={loading}
            deletingFieldId={deletingFieldId}
            fieldStatusActionId={fieldStatusActionId}
            fieldStatusActionMode={fieldStatusActionMode}
            fieldListSectionId={fieldListSectionId}
            manualBookingPath={manualBookingPath}
            fieldsPath={fieldsPath}
            publicOrigin={publicOrigin}
            createPublicBookingUrl={createPublicBookingUrl}
            handleFieldModeration={handleFieldModeration}
            handleEditField={handleEditField}
            handleDeleteField={handleDeleteField}
          />

          <ManagedBookingsSection
            loading={loading}
            managedBookings={managedBookings}
            processingBookingId={processingBookingId}
            processingBookingAction={processingBookingAction}
            ownerBookingsSectionId={ownerBookingsSectionId}
            manualBookingPath={manualBookingPath}
            handleConfirmBooking={handleConfirmBooking}
            handleConfirmDeposit={handleConfirmDeposit}
            handleConfirmPayment={handleConfirmPayment}
            handleCancelBooking={handleCancelBooking}
          />
        </div>
      </section>
    )
  }

  return (
    <section className="page section adminDashboardPage">
      <div className="container adminDashboardHero">
        <div>
          <p className="usersEyebrow">Khu quản lý dành cho Admin</p>
          <h1>Quản lý sân bóng</h1>
        </div>
        <div className="adminDashboardOwner">
          <span>Tài khoản admin</span>
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

      <div className="container adminDashboardGrid">
        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Nhóm chức năng Admin</h2>
            <span>2 mục chính</span>
          </div>

          <div className="fieldActions">
            <Link className="btn smallBtn" to={adminUsersPath}>
              Quản lý tài khoản
            </Link>
            <Link className="outlineBtnLink" to={manageFieldsSectionPath}>
              Quản lý sân
            </Link>
          </div>

        </section>

        <FieldFormPanel
          isAdminPortal={isAdminPortal}
          isOwnerPortal={isOwnerPortal}
          form={form}
          isEditingField={isEditingField}
          submitting={submitting}
          uploadingCover={uploadingCover}
          uploadingGallery={uploadingGallery}
          manageFieldsSectionId={manageFieldsSectionId}
          handleFieldChange={handleFieldChange}
          handleSubFieldChange={handleSubFieldChange}
          handleAddSubField={handleAddSubField}
          handleRemoveSubField={handleRemoveSubField}
          handleCoverImageUpload={handleCoverImageUpload}
          handleGalleryImagesUpload={handleGalleryImagesUpload}
          handleRemoveCoverImage={handleRemoveCoverImage}
          handleRemoveGalleryImage={handleRemoveGalleryImage}
          handleCancelFieldEdit={handleCancelFieldEdit}
          handleSubmit={handleSubmit}
        />
      </div>

      <div className="container ownerDashboardStack">
        <FieldListSection
          isAdminPortal={isAdminPortal}
          isOwnerPortal={isOwnerPortal}
          fields={fields}
          loading={loading}
          deletingFieldId={deletingFieldId}
          fieldStatusActionId={fieldStatusActionId}
          fieldStatusActionMode={fieldStatusActionMode}
          fieldListSectionId={fieldListSectionId}
          manualBookingPath={manualBookingPath}
          fieldsPath={fieldsPath}
          publicOrigin={publicOrigin}
          createPublicBookingUrl={createPublicBookingUrl}
          handleFieldModeration={handleFieldModeration}
          handleEditField={handleEditField}
          handleDeleteField={handleDeleteField}
        />
      </div>
    </section>
  )
}

export default AdminFieldsView
