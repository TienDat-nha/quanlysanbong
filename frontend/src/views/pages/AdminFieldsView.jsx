import React from "react"
import { Link } from "react-router-dom"
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiExternalLink,
  FiFileText,
  FiFolderPlus,
  FiGrid,
  FiImage,
  FiLayers,
  FiLink2,
  FiMapPin,
  FiShield,
  FiTool,
  FiUsers,
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
  { key: "fields", label: "Tong san", value: stats.totalFields, tone: "primary" },
  { key: "bookings", label: "Tong luot dat", value: stats.totalBookings, tone: "neutral" },
  { key: "pending", label: "Cho xac nhan", value: stats.pendingBookings, tone: "warning" },
  { key: "confirmed", label: "Da xac nhan", value: stats.confirmedBookings, tone: "success" },
  {
    key: "revenue",
    label: "Doanh thu",
    value: `${formatPrice(stats.totalRevenue)} VND`,
    tone: "success",
  },
]

const OWNER_HIGHLIGHT_STEPS = [
  {
    key: "request",
    title: "Gui san",
    text: "Hoan thien ho so san, san con va hinh anh truoc khi gui admin duyet.",
    icon: FiFolderPlus,
  },
  {
    key: "approval",
    title: "Cho duyet",
    text: "Admin co the duyet, khoa hoac yeu cau cap nhat lai thong tin.",
    icon: FiShield,
  },
  {
    key: "manual",
    title: "Dat tay tai san",
    text: "Nhan khach truc tiep va khoa lich ngay trong bang dat san thu cong.",
    icon: FiCalendar,
  },
]

const createOwnerQuickActions = ({
  manualBookingPath,
  fieldListSectionPath,
  manageFieldsSectionPath,
  ownerBookingsSectionPath,
}) => [
  {
    key: "manual",
    title: "Dat san thu cong",
    text: "Tao don ngay tren san cua ban cho khach dat truc tiep.",
    path: manualBookingPath,
    icon: FiCalendar,
    tone: "primary",
  },
  {
    key: "fields",
    title: "Kho san cua ban",
    text: "Xem nhanh tat ca san dang cho duyet, da duyet hoac dang bi khoa.",
    path: fieldListSectionPath,
    icon: FiGrid,
    tone: "neutral",
  },
  {
    key: "manage",
    title: "Gui va cap nhat san",
    text: "Them thong tin, san con, hinh anh va mo ta trong mot form ro rang hon.",
    path: manageFieldsSectionPath,
    icon: FiEdit3,
    tone: "warning",
  },
  {
    key: "bookings",
    title: "Don dat cua khach",
    text: "Theo doi don dang cho xac nhan, coc va thanh toan.",
    path: ownerBookingsSectionPath,
    icon: FiUsers,
    tone: "success",
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
    return "Cho admin duyet"
  }

  if (moderationState === "LOCKED") {
    return "Da khoa / tu choi"
  }

  return "Da duyet"
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

const getFieldStatusDescription = (field, isOwnerPortal) => {
  const moderationState = getFieldModerationState(field)

  if (moderationState === "PENDING") {
    return isOwnerPortal
      ? "San dang cho admin kiem tra truoc khi mo link cong khai."
      : "Can admin duyet truoc khi cho phep dat cong khai."
  }

  if (moderationState === "LOCKED") {
    return "San dang tam dung hien thi hoac da bi tu choi boi admin."
  }

  return "San da san sang cho dat cong khai va dat tay tai san."
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
          <p>{action.text}</p>
          <span className="ownerQuickActionLink">
            Mo muc nay <FiArrowRight aria-hidden="true" />
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
            {isAdminPortal ? "Quan ly ho so san" : "Khong gian gui san"}
          </p>
          <h2>
            {isEditingField
              ? "Cap nhat san"
              : isOwnerPortal
                ? "Gui yeu cau tao san"
                : "Tao san moi"}
          </h2>
          <p>
            {isAdminPortal
              ? "Admin co the tao nhanh, cap nhat, khoa va quan ly san trong cung mot bieu mau."
              : "Form nay duoc tach theo tung nhom de chu san nhap thong tin gon va de canh hon."}
          </p>
        </div>

        <div className="ownerSectionMeta">
          {isEditingField && <span className="ownerSectionBadge">Dang chinh sua</span>}
          {!isEditingField && isOwnerPortal && (
            <span className="ownerSectionBadge ownerSectionBadge--warning">Cho admin duyet</span>
          )}
        </div>
      </div>

      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader">
          <div>
            <h3>Thong tin co ban</h3>
            <p>Ten san, dia chi, khu vuc va khung gia de admin / khach nhan dien nhanh.</p>
          </div>
          <span className="ownerFormSectionChip">
            <FiMapPin aria-hidden="true" /> Co ban
          </span>
        </div>

        <div className="ownerFormGrid">
          <label className="ownerFormField" htmlFor="admin-field-name">
            <span>Ten san</span>
            <input
              id="admin-field-name"
              type="text"
              value={form.name}
              onChange={(event) => handleFieldChange("name", event.target.value)}
              placeholder="San Bong Riverside"
            />
          </label>

          <label className="ownerFormField ownerFormField--wide" htmlFor="admin-field-address">
            <span>Dia chi</span>
            <input
              id="admin-field-address"
              type="text"
              value={form.address}
              onChange={(event) => handleFieldChange("address", event.target.value)}
              placeholder="123 Nguyen Hue, Quan 1"
            />
          </label>

          <label className="ownerFormField" htmlFor="admin-field-district">
            <span>Khu vuc</span>
            <input
              id="admin-field-district"
              type="text"
              value={form.district}
              onChange={(event) => handleFieldChange("district", event.target.value)}
              placeholder="Quan 1"
            />
          </label>

          <label className="ownerFormField" htmlFor="admin-field-type">
            <span>Loai san mac dinh</span>
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
            <span>Gio mo cua</span>
            <input
              id="admin-field-open-hours"
              type="text"
              value={form.openHours}
              onChange={(event) => handleFieldChange("openHours", event.target.value)}
              placeholder="06:00 - 22:00"
            />
          </label>

          <label className="ownerFormField" htmlFor="admin-field-price">
            <span>Gia mac dinh theo gio</span>
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
            <h3>Anh va mo ta</h3>
            <p>Bo phan upload duoc doi thanh khu xem truoc de chu san de canh noi dung hon.</p>
          </div>
          <span className="ownerFormSectionChip">
            <FiImage aria-hidden="true" /> Trinh bay
          </span>
        </div>

        <div className="ownerUploadGrid">
          <div className="ownerUploadBox">
            <label className="ownerFormField" htmlFor="admin-field-cover">
              <span>Anh dai dien</span>
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
            <p className="helperText ownerInlineHelper">Ho tro JPG, PNG, WEBP, GIF. Toi da 8MB.</p>
            {uploadingCover && <p className="helperText ownerInlineHelper">Dang tai anh dai dien...</p>}
            {form.coverImage ? (
              <div className="adminUploadPreviewCard ownerUploadPreviewCard">
                <img
                  src={form.coverImage}
                  alt="Anh dai dien san"
                  className="adminUploadPreviewImage"
                />
                <div className="adminUploadPreviewMeta">
                  <span>Anh dai dien da tai len</span>
                  <button
                    type="button"
                    className="outlineBtnInline adminDangerBtn"
                    onClick={handleRemoveCoverImage}
                    disabled={uploadingCover}
                  >
                    Xoa anh
                  </button>
                </div>
              </div>
            ) : (
              <div className="ownerUploadPlaceholder">
                <FiImage aria-hidden="true" />
                <span>Chua co anh dai dien</span>
              </div>
            )}
          </div>

          <div className="ownerUploadBox">
            <label className="ownerFormField" htmlFor="admin-field-images">
              <span>Thu vien anh</span>
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
            <p className="helperText ownerInlineHelper">
              Ban co the chon nhieu anh cung luc cho gallery.
            </p>
            {uploadingGallery && <p className="helperText ownerInlineHelper">Dang tai anh thu vien...</p>}
            {form.galleryImages.length > 0 ? (
              <div className="adminUploadPreviewGrid ownerGalleryGrid">
                {form.galleryImages.map((imageUrl, index) => (
                  <article className="adminUploadPreviewCard ownerUploadPreviewCard" key={`${imageUrl}-${index}`}>
                    <img
                      src={imageUrl}
                      alt={`Anh thu vien san ${index + 1}`}
                      className="adminUploadPreviewImage"
                    />
                    <div className="adminUploadPreviewMeta">
                      <span>Anh thu vien {index + 1}</span>
                      <button
                        type="button"
                        className="outlineBtnInline adminDangerBtn"
                        onClick={() => handleRemoveGalleryImage(imageUrl)}
                        disabled={uploadingGallery}
                      >
                        Xoa anh
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ownerUploadPlaceholder ownerUploadPlaceholder--soft">
                <FiLayers aria-hidden="true" />
                <span>Gallery se hien o day sau khi tai anh.</span>
              </div>
            )}
          </div>
        </div>

        <label className="ownerFormField ownerFormField--wide" htmlFor="admin-field-article">
          <span>Mo ta san</span>
          <textarea
            id="admin-field-article"
            rows={4}
            value={form.article}
            onChange={(event) => handleFieldChange("article", event.target.value)}
            placeholder="Mo ta ngan ve san bong cua ban"
          />
        </label>
      </section>

      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader">
          <div>
            <h3>Cau hinh san con</h3>
            <p>Moi san con co ten, loai san va gia rieng de thao tac dat tay khong bi nham.</p>
          </div>

          <div className="ownerFormSectionActions">
            <span className="ownerFormSectionChip">
              <FiTool aria-hidden="true" /> {(form.subFields || []).length} san con
            </span>
            <button type="button" className="outlineBtnInline" onClick={handleAddSubField}>
              Them san con
            </button>
          </div>
        </div>

        <div className="ownerSubFieldGrid">
          {(form.subFields || []).map((subField, index) => (
            <article className="ownerSubFieldCard" key={subField.id}>
              <div className="ownerSubFieldHeader">
                <div>
                  <strong>San con {index + 1}</strong>
                  <p>Dat ten ro rang de nhan dien nhanh trong dat san thu cong.</p>
                </div>
                <button
                  type="button"
                  className="outlineBtnInline adminDangerBtn"
                  onClick={() => handleRemoveSubField(subField.id)}
                  disabled={(form.subFields || []).length === 1}
                >
                  Xoa
                </button>
              </div>

              <div className="ownerFormGrid ownerFormGrid--subfield">
                <label className="ownerFormField ownerFormField--wide" htmlFor={`admin-subfield-name-${subField.id}`}>
                  <span>Ten san con</span>
                  <input
                    id={`admin-subfield-name-${subField.id}`}
                    type="text"
                    value={subField.name}
                    onChange={(event) =>
                      handleSubFieldChange(subField.id, "name", event.target.value)
                    }
                    placeholder={`San ${index + 1}`}
                  />
                </label>

                <label className="ownerFormField" htmlFor={`admin-subfield-type-${subField.id}`}>
                  <span>Loai san</span>
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
                  <span>Gia theo gio</span>
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
              ? "Dang cap nhat..."
              : isOwnerPortal
                ? "Dang gui yeu cau..."
                : "Dang tao san..."
            : isEditingField
              ? "Luu cap nhat"
              : isOwnerPortal
                ? "Gui yeu cau tao san"
                : "Tao san moi"}
        </button>

        {isEditingField && (
          <button
            className="outlineBtnInline"
            type="button"
            onClick={handleCancelFieldEdit}
            disabled={submitting}
          >
            Huy chinh sua
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
          {isAdminPortal ? "Danh sach can duyet" : "Kho san dang quan ly"}
        </p>
        <h2>{isAdminPortal ? "Quan ly cac san gui len" : "Danh sach san cua ban"}</h2>
        <p>
          {isAdminPortal
            ? "Admin co the duyet, khoa, sua hoac xoa tung san tu danh sach nay."
            : "Moi the san cho biet ro trang thai duyet, link cong khai va loi di nhanh sang dat san thu cong."}
        </p>
      </div>

      <div className="ownerSectionMeta">
        <span className="ownerSectionBadge">{fields.length} san</span>
        {isOwnerPortal && (
          <Link className="outlineBtnLink" to={fieldsPath}>
            Xem giao dien cong khai
          </Link>
        )}
      </div>
    </div>

    {loading ? (
      <p>Dang tai danh sach san...</p>
    ) : fields.length === 0 ? (
      <p className="usersEmptyState">
        {isAdminPortal
          ? "Chua co san nao duoc gui len de quan ly."
          : "Ban chua tao san nao. Sau khi gui san, trang thai va link cong khai se hien o day."}
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
              ? "Khoa san"
              : moderationState === "LOCKED"
                ? "Mo khoa"
                : "Duyet san"

          return (
            <article className="ownerFieldCard" key={field.id}>
              <div className="ownerFieldMedia">
                {field.coverImage ? (
                  <img src={field.coverImage} alt={field.name} />
                ) : (
                  <div className="ownerFieldMediaFallback">
                    <FiMapPin aria-hidden="true" />
                    <span>{field.district || "San bong"}</span>
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

                <p className="ownerFieldStatusText">
                  {getFieldStatusDescription(field, isOwnerPortal)}
                </p>

                <div className="ownerFieldMetrics">
                  <article className="ownerFieldMetric">
                    <span>Gia / gio</span>
                    <strong>{formatPrice(field.pricePerHour)} VND</strong>
                  </article>
                  <article className="ownerFieldMetric">
                    <span>Gio mo cua</span>
                    <strong>{field.openHours || "--"}</strong>
                  </article>
                  <article className="ownerFieldMetric">
                    <span>Loai san</span>
                    <strong>{getFieldTypeSummary(field) || field.type || "--"}</strong>
                  </article>
                  <article className="ownerFieldMetric">
                    <span>San con</span>
                    <strong>{(field.subFields || []).length}</strong>
                  </article>
                </div>

                <div className="ownerFieldChipRow">
                  <span className="ownerFieldChip">
                    <FiLink2 aria-hidden="true" /> /dat-san/{field.slug}
                  </span>
                  <span className="ownerFieldChip">
                    <FiMapPin aria-hidden="true" /> {field.district || "Dang cap nhat khu vuc"}
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
                      {item.pricePerHour ? ` | ${formatPrice(item.pricePerHour)} VND/gio` : ""}
                    </span>
                  ))}
                </div>

                {canOpenPublicLink ? (
                  <div className="ownerFieldLinkBox">
                    <label className="adminFieldLinkLabel" htmlFor={`booking-url-${field.id}`}>
                      Link dat san cong khai
                    </label>
                    <input id={`booking-url-${field.id}`} type="text" readOnly value={publicBookingUrl} />
                  </div>
                ) : (
                  <div className="ownerFieldNoteBox">
                    <FiShield aria-hidden="true" />
                    <span>Link cong khai se mo sau khi admin duyet xong ho so san.</span>
                  </div>
                )}

                <div className="fieldActions ownerFieldActions">
                  {isOwnerPortal && (
                    <Link className="btn smallBtn" to={buildManualBookingFieldPath(manualBookingPath, field.id)}>
                      Dat tay tren san nay
                    </Link>
                  )}

                  {canOpenPublicLink && (
                    <a
                      className="outlineBtnLink"
                      href={publicBookingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Mo link cong khai <FiExternalLink aria-hidden="true" />
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
                          ? "Dang duyet..."
                          : "Dang khoa..."
                        : fieldStatusActionLabel}
                    </button>
                  )}

                  <button
                    type="button"
                    className="outlineBtnInline"
                    onClick={() => handleEditField(field)}
                    disabled={isDeleting || isFieldStatusProcessing}
                  >
                    Sua san
                  </button>

                  <button
                    type="button"
                    className="outlineBtnInline adminDangerBtn"
                    onClick={() => handleDeleteField(field)}
                    disabled={isDeleting || isFieldStatusProcessing}
                  >
                    {isDeleting ? "Dang xoa..." : "Xoa san"}
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
        <p className="ownerSectionEyebrow">Don dat cua khach</p>
        <h2>Quan ly don dat cua khach</h2>
        <p>Theo doi tien do xac nhan san, coc va thanh toan trong mot danh sach ro rang hon.</p>
      </div>

      <div className="ownerSectionMeta">
        <span className="ownerSectionBadge">{managedBookings.length} don</span>
        <Link className="outlineBtnLink" to={manualBookingPath}>
          Tao don moi
        </Link>
      </div>
    </div>

    {loading ? (
      <p>Dang tai danh sach don dat cua khach...</p>
    ) : managedBookings.length === 0 ? (
      <p className="usersEmptyState">Chua co don dat nao trong danh sach quan ly cua chu san.</p>
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
                    {booking.subFieldName || "San tong"}
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
                  <span>Khach</span>
                  <strong>{booking.customer?.fullName || "Khach hang"}</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Lien he</span>
                  <strong>{booking.customer?.phone || booking.customer?.email || "--"}</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Tong tien</span>
                  <strong>{formatPrice(booking.totalPrice)} VND</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Dat coc</span>
                  <strong>{formatPrice(booking.depositAmount)} VND</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Con lai</span>
                  <strong>{formatPrice(booking.remainingAmount)} VND</strong>
                </article>
                <article className="ownerBookingMetaItem">
                  <span>Tao luc</span>
                  <strong>{formatBookingDateTime(booking.createdAt)}</strong>
                </article>
              </div>

              {booking.note && (
                <p className="adminBookingNote">
                  <strong>Ghi chu:</strong> {booking.note}
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
                      {isConfirmingBooking ? "Dang xac nhan..." : "Xac nhan dat san"}
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
                        ? "Dang xac nhan coc..."
                        : "Xac nhan dat coc thanh cong"}
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
                        ? "Dang xac nhan thanh toan..."
                        : "Xac nhan thanh toan thanh cong"}
                    </button>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      className="outlineBtnInline adminDangerBtn"
                      disabled={isProcessing}
                      onClick={() => handleCancelBooking(booking.id)}
                    >
                      {isCancelling ? "Dang huy..." : "Huy don dat"}
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
          <h1>Khu quan ly san</h1>
          <p>
            Vui long <Link to={loginPath}>dang nhap</Link> bang tai khoan Admin hoac Chu san de quan
            ly san.
          </p>
        </div>
      </section>
    )
  }

  if (!canAccessFieldDashboard) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Khu quan ly san</h1>
          <p>Tai khoan {currentUser?.email} khong co quyen truy cap khu vuc quan ly san.</p>
        </div>
      </section>
    )
  }

  const ownerQuickActions = createOwnerQuickActions({
    manualBookingPath,
    fieldListSectionPath,
    manageFieldsSectionPath,
    ownerBookingsSectionPath,
  })

  if (isOwnerPortal) {
    return (
      <section className="page section adminDashboardPage ownerDashboardPage">
        <div className="container ownerHeroCard">
          <div className="ownerHeroCopy">
            <p className="ownerHeroEyebrow">Khong gian chu san</p>
            <h1>Quan ly san theo mot luong ro rang hon</h1>
            <p className="ownerHeroLead">
              Giao dien nay duoc tach lai de Chu san co the gui san, theo doi trang thai duyet,
              dat san thu cong va xu ly don khach ma khong bi cac khoi trong vo nghia.
            </p>

            <div className="ownerHeroActions">
              <Link className="btn" to={manageFieldsSectionPath}>
                Gui / cap nhat san
              </Link>
              <Link className="outlineBtnLink" to={manualBookingPath}>
                Dat san thu cong
              </Link>
              <Link className="outlineBtnLink" to={fieldsPath}>
                Xem giao dien cong khai
              </Link>
            </div>

            <div className="ownerHeroStepGrid">
              {OWNER_HIGHLIGHT_STEPS.map((item) => {
                const ItemIcon = item.icon

                return (
                  <article className="ownerHeroStepCard" key={item.key}>
                    <span className="ownerHeroStepIcon" aria-hidden="true">
                      <ItemIcon />
                    </span>
                    <strong>{item.title}</strong>
                    <p>{item.text}</p>
                  </article>
                )
              })}
            </div>
          </div>

          <aside className="ownerHeroAside">
            <div className="ownerAccountCard">
              <span>Tai khoan chu san</span>
              <strong>{currentUser?.email}</strong>
              <p>Toan bo san do ban gui se duoc admin phe duyet truoc khi mo cong khai.</p>
            </div>

            <div className="ownerHeroTipCard">
              <div className="ownerHeroTipHeader">
                <FiCheckCircle aria-hidden="true" />
                <strong>Nhung gi nen lam tiep theo</strong>
              </div>
              <ul className="ownerHeroTipList">
                <li>Bo sung anh dai dien va mo ta ngan de san de duoc duyet hon.</li>
                <li>Tach ro san con va gia de thao tac dat tay khong bi nham.</li>
                <li>Kiem tra don dat ben duoi sau moi lan nhan khach tai san.</li>
              </ul>
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
          <p className="usersEyebrow">Khu quan ly danh cho Admin</p>
          <h1>Quan ly san bong</h1>
          <p>
            Admin chi co quan ly tai khoan va quan ly san. Moi san do Chu san tao se di qua buoc
            cho duyet, khoa hoac chinh sua tai day.
          </p>
        </div>
        <div className="adminDashboardOwner">
          <span>Tai khoan admin</span>
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
            <h2>Nhom chuc nang Admin</h2>
            <span>2 muc chinh</span>
          </div>

          <p className="helperText">
            Admin dung khu nay de duyet san, chinh sua, khoa hoac xoa san. Quan ly tai khoan tach
            rieng o khu quan tri tai khoan.
          </p>

          <div className="fieldActions">
            <Link className="btn smallBtn" to={adminUsersPath}>
              Quan ly tai khoan
            </Link>
            <Link className="outlineBtnLink" to={manageFieldsSectionPath}>
              Quan ly san
            </Link>
          </div>

          <div className="ownerAdminMiniGrid">
            <article className="ownerAdminMiniCard">
              <FiShield aria-hidden="true" />
              <strong>Duyet san moi</strong>
              <p>Kiem tra thong tin Chu san gui len truoc khi mo cong khai.</p>
            </article>
            <article className="ownerAdminMiniCard">
              <FiFileText aria-hidden="true" />
              <strong>Cap nhat du lieu</strong>
              <p>Sua ten san, san con, gia va mo ta ngay trong cung mot form.</p>
            </article>
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
