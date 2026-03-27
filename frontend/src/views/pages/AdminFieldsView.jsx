import React from "react"
import { Link } from "react-router-dom"
import { FiCalendar, FiExternalLink, FiImage, FiLink2, FiMapPin, FiTool } from "react-icons/fi"
import { formatBookingDateLabel, formatBookingDateTime } from "../../models/bookingModel"
import { formatBookingStatusVi, formatPaymentStatusVi } from "../../models/bookingTextModel"
import { formatPrice, getFieldTypeSummary } from "../../models/fieldModel"
import { FIELD_TYPE_OPTIONS } from "../../models/fieldTypeModel"

const statsCards = (stats) => [
  ["Tổng sân", stats.totalFields],
  ["Tổng lượt đặt", stats.totalBookings],
  ["Chờ xác nhận", stats.pendingBookings],
  ["Đã xác nhận", stats.confirmedBookings],
  ["Doanh thu", `${formatPrice(stats.totalRevenue)} VND`],
]

const getFieldModerationState = (field) => {
  const status = String(field?.approvalStatus || field?.status || field?.fieldStatus || "").trim().toUpperCase()
  if (field?.isLocked || field?.locked || status === "LOCKED" || status === "REJECTED") return "LOCKED"
  if (status === "PENDING") return "PENDING"
  return "APPROVED"
}

const getFieldStatusLabel = (field) => {
  const state = getFieldModerationState(field)
  if (state === "PENDING") return "Chờ admin duyệt"
  if (state === "LOCKED") return "Đã khóa / từ chối"
  return "Đã duyệt"
}

const getFieldStatusTone = (field) => {
  const state = getFieldModerationState(field)
  if (state === "PENDING") return "warning"
  if (state === "LOCKED") return "danger"
  return "success"
}

const fieldLink = (manualBookingPath, fieldId) =>
  `${manualBookingPath}?fieldId=${encodeURIComponent(String(fieldId || "").trim())}`

const controlClass = (error) => `ownerFormControl${error ? " ownerFormControl--error" : ""}`

const ErrorText = ({ text }) => (text ? <span className="ownerFieldError">{text}</span> : null)

const InputField = ({ id, label, error, wide = false, children }) => (
  <label className={`ownerFormField${wide ? " ownerFormField--wide" : ""}`} htmlFor={id}>
    <span>{label}</span>
    {children}
    <ErrorText text={error} />
  </label>
)

const QuickActionGrid = ({ manualBookingPath }) => (
  <section className="ownerQuickActionGrid">
    <Link className="ownerQuickActionCard ownerQuickActionCard--primary" to={manualBookingPath}>
      <span className="ownerQuickActionIcon" aria-hidden="true">
        <FiCalendar />
      </span>
      <strong>Đặt sân thủ công</strong>
    </Link>
  </section>
)

const FormPanel = ({
  isAdminPortal,
  isOwnerPortal,
  form,
  formErrors,
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
          <p className="ownerSectionEyebrow">{isAdminPortal ? "Quản lý hồ sơ sân" : "Không gian gửi sân"}</p>
          <h2>{isEditingField ? "Cập nhật sân" : isOwnerPortal ? "Gửi yêu cầu tạo sân" : "Tạo sân mới"}</h2>
        </div>
      </div>
      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader"><h3>Thông tin cơ bản</h3></div>
        <div className="ownerFormGrid">
          <InputField id="admin-field-name" label="Tên sân" error={formErrors?.name}><input id="admin-field-name" className={controlClass(formErrors?.name)} value={form.name} onChange={(e) => handleFieldChange("name", e.target.value)} /></InputField>
          <InputField id="admin-field-address" label="Địa chỉ" error={formErrors?.address} wide><input id="admin-field-address" className={controlClass(formErrors?.address)} value={form.address} onChange={(e) => handleFieldChange("address", e.target.value)} /></InputField>
          <InputField id="admin-field-district" label="Khu vực" error={formErrors?.district}><input id="admin-field-district" className={controlClass(formErrors?.district)} value={form.district} onChange={(e) => handleFieldChange("district", e.target.value)} /></InputField>
          <InputField id="admin-field-type" label="Loại sân mặc định" error={formErrors?.type}><select id="admin-field-type" className={controlClass(formErrors?.type)} value={form.type} onChange={(e) => handleFieldChange("type", e.target.value)}>{FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField>
          <InputField id="admin-field-open-hours" label="Giờ mở cửa" error={formErrors?.openHours}><input id="admin-field-open-hours" className={controlClass(formErrors?.openHours)} value={form.openHours} onChange={(e) => handleFieldChange("openHours", e.target.value)} /></InputField>
          <InputField id="admin-field-price" label="Giá mặc định theo giờ" error={formErrors?.pricePerHour}><input id="admin-field-price" className={controlClass(formErrors?.pricePerHour)} type="number" min="1000" step="1000" value={form.pricePerHour} onChange={(e) => handleFieldChange("pricePerHour", e.target.value)} /></InputField>
        </div>
      </section>
      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader"><h3>Ảnh và mô tả</h3></div>
        <div className="ownerUploadGrid">
          <div className="ownerUploadBox">
            <InputField id="admin-field-cover" label="Ảnh đại diện" error=""><input id="admin-field-cover" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async (e) => { await handleCoverImageUpload(e.target.files?.[0]); e.target.value = "" }} /></InputField>
            {uploadingCover && <p className="helperText ownerInlineHelper">Đang tải ảnh đại diện...</p>}
            {form.coverImage ? <div className="adminUploadPreviewCard ownerUploadPreviewCard"><img src={form.coverImage} alt="Ảnh đại diện sân" className="adminUploadPreviewImage" /><div className="adminUploadPreviewMeta"><span>Ảnh đại diện đã tải lên</span><button type="button" className="outlineBtnInline adminDangerBtn" onClick={handleRemoveCoverImage}>Xóa ảnh</button></div></div> : <div className="ownerUploadPlaceholder"><FiImage aria-hidden="true" /><span>Chưa có ảnh đại diện</span></div>}
          </div>
          <div className="ownerUploadBox">
            <InputField id="admin-field-images" label="Thư viện ảnh" error=""><input id="admin-field-images" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={async (e) => { await handleGalleryImagesUpload(e.target.files); e.target.value = "" }} /></InputField>
            {uploadingGallery && <p className="helperText ownerInlineHelper">Đang tải ảnh thư viện...</p>}
            {form.galleryImages.length > 0 ? <div className="adminUploadPreviewGrid ownerGalleryGrid">{form.galleryImages.map((imageUrl, index) => <article className="adminUploadPreviewCard ownerUploadPreviewCard" key={`${imageUrl}-${index}`}><img src={imageUrl} alt={`Ảnh thư viện ${index + 1}`} className="adminUploadPreviewImage" /><div className="adminUploadPreviewMeta"><span>Ảnh thư viện {index + 1}</span><button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleRemoveGalleryImage(imageUrl)}>Xóa ảnh</button></div></article>)}</div> : <div className="ownerUploadPlaceholder ownerUploadPlaceholder--soft"><FiImage aria-hidden="true" /><span>Chưa có thư viện ảnh</span></div>}
          </div>
        </div>
        <InputField id="admin-field-article" label="Mô tả sân" error="" wide><textarea id="admin-field-article" className="ownerFormControl" rows={4} value={form.article} onChange={(e) => handleFieldChange("article", e.target.value)} /></InputField>
      </section>
      <section className="ownerFormSection">
        <div className="ownerFormSectionHeader"><h3>Cấu hình sân con</h3><button type="button" className="outlineBtnInline" onClick={handleAddSubField}>Thêm sân con</button></div>
        <ErrorText text={formErrors?.subFieldsMessage} />
        <div className="ownerSubFieldGrid">
          {(form.subFields || []).map((subField, index) => {
            const subErrors = formErrors?.subFields?.[index] || {}
            return <article className="ownerSubFieldCard" key={subField.id}><div className="ownerSubFieldHeader"><strong>Sân con {index + 1}</strong><button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleRemoveSubField(subField.id)} disabled={(form.subFields || []).length === 1}>Xóa</button></div><div className="ownerFormGrid ownerFormGrid--subfield"><InputField id={`admin-subfield-name-${subField.id}`} label="Tên sân con" error={subErrors.name} wide><input id={`admin-subfield-name-${subField.id}`} className={controlClass(subErrors.name)} value={subField.name} onChange={(e) => handleSubFieldChange(subField.id, "name", e.target.value)} /></InputField><InputField id={`admin-subfield-type-${subField.id}`} label="Loại sân" error={subErrors.type}><select id={`admin-subfield-type-${subField.id}`} className={controlClass(subErrors.type)} value={subField.type} onChange={(e) => handleSubFieldChange(subField.id, "type", e.target.value)}>{FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InputField><InputField id={`admin-subfield-price-${subField.id}`} label="Giá theo giờ" error={subErrors.pricePerHour}><input id={`admin-subfield-price-${subField.id}`} className={controlClass(subErrors.pricePerHour)} type="number" min="1000" step="1000" value={subField.pricePerHour} onChange={(e) => handleSubFieldChange(subField.id, "pricePerHour", e.target.value)} /></InputField></div></article>
          })}
        </div>
      </section>
      <div className="ownerFormActions"><button className="btn" type="submit" disabled={submitting || uploadingCover || uploadingGallery}>{submitting ? "Đang xử lý..." : isEditingField ? "Lưu cập nhật" : isOwnerPortal ? "Gửi yêu cầu tạo sân" : "Tạo sân mới"}</button>{isEditingField && <button className="outlineBtnInline" type="button" onClick={handleCancelFieldEdit}>Hủy chỉnh sửa</button>}</div>
    </form>
  </section>
)

const FieldListSection = ({ isAdminPortal, isOwnerPortal, fields, loading, deletingFieldId, fieldStatusActionId, fieldStatusActionMode, fieldListSectionId, manualBookingPath, fieldsPath, publicOrigin, createPublicBookingUrl, getFieldDeletionState, handleFieldModeration, handleEditField, handleDeleteField }) => (
  <section className="ownerSectionCard ownerSectionCard--list" id={fieldListSectionId}>
    <div className="ownerSectionHeading"><div className="ownerSectionTitle"><p className="ownerSectionEyebrow">{isAdminPortal ? "Danh sách cần duyệt" : "Kho sân đang quản lý"}</p><h2>{isAdminPortal ? "Quản lý các sân gửi lên" : "Danh sách sân của bạn"}</h2></div>{isOwnerPortal && <Link className="outlineBtnLink" to={fieldsPath}>Xem giao diện công khai</Link>}</div>
    {loading ? <p>Đang tải danh sách sân...</p> : fields.length === 0 ? <p className="usersEmptyState">{isAdminPortal ? "Chưa có sân nào được gửi lên để quản lý." : "Bạn chưa tạo sân nào."}</p> : <div className="ownerFieldList">{fields.map((field) => {
      const moderationState = getFieldModerationState(field)
      const canManualBook = isOwnerPortal && moderationState === "APPROVED"
      const canOpenPublic = moderationState === "APPROVED"
      const isDeleting = String(deletingFieldId) === String(field.id)
      const isStatusProcessing = String(fieldStatusActionId) === String(field.id)
      const deletionState = getFieldDeletionState ? getFieldDeletionState(field) : { canDelete: true, reason: "" }
      const statusActionLabel = moderationState === "APPROVED" ? "Khóa sân" : moderationState === "LOCKED" ? "Mở khóa" : "Duyệt sân"
      const manualHint = !canManualBook && isOwnerPortal ? moderationState === "PENDING" ? "Sân đang chờ admin duyệt, chưa thể đặt thủ công." : "Sân đang bị khóa, chưa thể đặt thủ công." : ""
      const publicBookingUrl = createPublicBookingUrl(publicOrigin, field.slug)
      return <article className="ownerFieldCard" key={field.id}><div className="ownerFieldMedia">{field.coverImage ? <img src={field.coverImage} alt={field.name} /> : <div className="ownerFieldMediaFallback"><FiMapPin aria-hidden="true" /><span>{field.district || "Sân bóng"}</span></div>}</div><div className="ownerFieldBody"><div className="ownerFieldHeader"><div><h3>{field.name}</h3><p>{field.address}</p></div><span className={`ownerStatusPill ownerStatusPill--${getFieldStatusTone(field)}`}>{getFieldStatusLabel(field)}</span></div><div className="ownerFieldMetrics"><article className="ownerFieldMetric"><span>Giá / giờ</span><strong>{formatPrice(field.pricePerHour)} VND</strong></article><article className="ownerFieldMetric"><span>Giờ mở cửa</span><strong>{field.openHours || "--"}</strong></article><article className="ownerFieldMetric"><span>Loại sân</span><strong>{getFieldTypeSummary(field) || field.type || "--"}</strong></article><article className="ownerFieldMetric"><span>Sân con</span><strong>{(field.subFields || []).length}</strong></article></div><div className="ownerFieldChipRow"><span className="ownerFieldChip"><FiLink2 aria-hidden="true" /> /dat-san/{field.slug}</span><span className="ownerFieldChip"><FiMapPin aria-hidden="true" /> {field.district || "Đang cập nhật khu vực"}</span></div>{canOpenPublic && <div className="ownerFieldLinkBox"><label className="adminFieldLinkLabel" htmlFor={`booking-url-${field.id}`}>Link đặt sân công khai</label><input id={`booking-url-${field.id}`} type="text" readOnly value={publicBookingUrl} /></div>}<div className="fieldActions ownerFieldActions">{isOwnerPortal && (canManualBook ? <Link className="btn smallBtn" to={fieldLink(manualBookingPath, field.id)}>Đặt tay trên sân này</Link> : <button type="button" className="btn smallBtn" disabled>Chưa thể đặt sân này</button>)}{canOpenPublic && <a className="outlineBtnLink" href={publicBookingUrl} target="_blank" rel="noreferrer">Mở link công khai <FiExternalLink aria-hidden="true" /></a>}{isAdminPortal && <button type="button" className="outlineBtnInline" onClick={() => handleFieldModeration(field)} disabled={isDeleting || isStatusProcessing}>{isStatusProcessing ? fieldStatusActionMode === "approve" ? "Đang duyệt..." : "Đang khóa..." : statusActionLabel}</button>}<button type="button" className="outlineBtnInline" onClick={() => handleEditField(field)} disabled={isDeleting || isStatusProcessing}>Sửa sân</button><button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleDeleteField(field)} disabled={!deletionState.canDelete || isDeleting || isStatusProcessing} title={deletionState.reason || ""}>{isDeleting ? "Đang xóa..." : "Xóa sân"}</button></div>{(manualHint || deletionState.reason) && <div className="ownerFieldNoteBox"><FiTool aria-hidden="true" /><div className="ownerAdminMiniCard">{manualHint && <span>{manualHint}</span>}{deletionState.reason && <span>{deletionState.reason}</span>}</div></div>}</div></article>
    })}</div>}
  </section>
)

const ManagedBookingsSection = ({ loading, managedBookings, processingBookingId, processingBookingAction, ownerBookingsSectionId, manualBookingPath, handleConfirmBooking, handleConfirmDeposit, handleConfirmPayment, handleCancelBooking }) => (
  <section className="ownerSectionCard ownerSectionCard--bookings" id={ownerBookingsSectionId}>
    <div className="ownerSectionHeading"><div className="ownerSectionTitle"><p className="ownerSectionEyebrow">Đơn đặt của khách</p><h2>Quản lý đơn đặt của khách</h2></div><Link className="outlineBtnLink" to={manualBookingPath}>Tạo đơn mới</Link></div>
    {loading ? <p>Đang tải đơn đặt...</p> : managedBookings.length === 0 ? <p className="usersEmptyState">Chưa có đơn đặt nào trong danh sách quản lý của chủ sân.</p> : <div className="ownerBookingList">{managedBookings.map((booking) => {
      const isProcessing = String(processingBookingId) === String(booking.id)
      const bookingStatus = String(booking.status || "").trim().toLowerCase()
      const paymentStatus = String(booking.paymentStatus || (booking.depositPaid ? "deposit_paid" : "unpaid")).trim().toLowerCase()
      return <article className="ownerBookingCard" key={booking.id}><div className="ownerBookingHeader"><div><h3>{booking.fieldName}</h3><p>{booking.subFieldName || "Sân tổng"} | {formatBookingDateLabel(booking.date)} | {booking.timeSlot}</p></div><div className="ownerBookingStatusGroup"><span className="ownerStatusPill ownerStatusPill--warning">{formatBookingStatusVi(booking.status)}</span><span className="ownerStatusPill ownerStatusPill--neutral">{formatPaymentStatusVi(booking.paymentStatus, booking.depositStatus)}</span></div></div><div className="ownerBookingMetaGrid"><article className="ownerBookingMetaItem"><span>Khách</span><strong>{booking.customer?.fullName || "Khách hàng"}</strong></article><article className="ownerBookingMetaItem"><span>Liên hệ</span><strong>{booking.customer?.phone || booking.customer?.email || "--"}</strong></article><article className="ownerBookingMetaItem"><span>Tổng tiền</span><strong>{formatPrice(booking.totalPrice)} VND</strong></article><article className="ownerBookingMetaItem"><span>Tạo lúc</span><strong>{formatBookingDateTime(booking.createdAt)}</strong></article></div><div className="fieldActions ownerFieldActions">{bookingStatus === "pending" && <button type="button" className="outlineBtnInline" disabled={isProcessing} onClick={() => handleConfirmBooking(booking.id)}>{isProcessing && processingBookingAction === "confirm" ? "Đang xác nhận..." : "Xác nhận đặt sân"}</button>}{bookingStatus !== "cancelled" && paymentStatus !== "paid" && paymentStatus !== "deposit_paid" && <button type="button" className="outlineBtnInline" disabled={isProcessing} onClick={() => handleConfirmDeposit(booking.id)}>{isProcessing && processingBookingAction === "deposit" ? "Đang xác nhận cọc..." : "Xác nhận đặt cọc"}</button>}{bookingStatus !== "cancelled" && paymentStatus !== "paid" && <button type="button" className="outlineBtnInline" disabled={isProcessing} onClick={() => handleConfirmPayment(booking.id)}>{isProcessing && processingBookingAction === "payment" ? "Đang xác nhận..." : "Xác nhận thanh toán"}</button>}{bookingStatus !== "cancelled" && <button type="button" className="outlineBtnInline adminDangerBtn" disabled={isProcessing} onClick={() => handleCancelBooking(booking.id)}>{isProcessing && processingBookingAction === "cancel" ? "Đang hủy..." : "Hủy đơn đặt"}</button>}</div></article>
    })}</div>}
  </section>
)

const AdminFieldsView = (props) => {
  const { authToken, currentUser, canAccessFieldDashboard, isAdminPortal, isOwnerPortal, fields, stats, managedBookings, loading, submitting, uploadingCover, uploadingGallery, processingBookingId, processingBookingAction, deletingFieldId, fieldStatusActionId, fieldStatusActionMode, error, noticeMessage, successMessage, form, formErrors, isEditingField, loginPath, fieldsPath, manualBookingPath, adminUsersPath, manageFieldsSectionId, fieldListSectionId, ownerBookingsSectionId, manageFieldsSectionPath, publicOrigin, createPublicBookingUrl, getFieldDeletionState, handleFieldChange, handleSubFieldChange, handleAddSubField, handleRemoveSubField, handleCoverImageUpload, handleGalleryImagesUpload, handleRemoveCoverImage, handleRemoveGalleryImage, handleEditField, handleCancelFieldEdit, handleDeleteField, handleFieldModeration, handleSubmit, handleConfirmBooking, handleConfirmDeposit, handleConfirmPayment, handleCancelBooking } = props
  if (!authToken) return <section className="page section"><div className="container pageHeader"><h1>Khu quản lý sân</h1><p>Vui lòng <Link to={loginPath}>đăng nhập</Link> bằng tài khoản Admin hoặc Chủ sân để quản lý sân.</p></div></section>
  if (!canAccessFieldDashboard) return <section className="page section"><div className="container pageHeader"><h1>Khu quản lý sân</h1><p>Tài khoản {currentUser?.email} không có quyền truy cập khu vực quản lý sân.</p></div></section>
  if (isOwnerPortal) return <section className="page section adminDashboardPage ownerDashboardPage"><div className="container ownerHeroCard"><div className="ownerHeroCopy"><p className="ownerHeroEyebrow">Không gian chủ sân</p><h1>Quản lý sân</h1><div className="ownerHeroActions"><Link className="btn" to={manualBookingPath}>Đặt sân thủ công</Link><Link className="outlineBtnLink" to={fieldsPath}>Danh sách sân</Link></div></div><aside className="ownerHeroAside"><div className="ownerAccountCard"><span>Tài khoản chủ sân</span><strong>{currentUser?.email}</strong></div></aside></div>{(successMessage || noticeMessage || error) && <div className="container ownerMessageStack">{successMessage && <p className="message success">{successMessage}</p>}{noticeMessage && <p className="message warning">{noticeMessage}</p>}{error && <p className="message error">{error}</p>}</div>}<div className="container ownerDashboardStats">{statsCards(stats).map(([label, value], index) => <article className="adminStatCard ownerStatCard" key={`${label}-${index}`}><span>{label}</span><strong>{value}</strong></article>)}</div><div className="container"><QuickActionGrid manualBookingPath={manualBookingPath} /></div><div className="container ownerDashboardStack"><FormPanel isAdminPortal={isAdminPortal} isOwnerPortal={isOwnerPortal} form={form} formErrors={formErrors} isEditingField={isEditingField} submitting={submitting} uploadingCover={uploadingCover} uploadingGallery={uploadingGallery} manageFieldsSectionId={manageFieldsSectionId} handleFieldChange={handleFieldChange} handleSubFieldChange={handleSubFieldChange} handleAddSubField={handleAddSubField} handleRemoveSubField={handleRemoveSubField} handleCoverImageUpload={handleCoverImageUpload} handleGalleryImagesUpload={handleGalleryImagesUpload} handleRemoveCoverImage={handleRemoveCoverImage} handleRemoveGalleryImage={handleRemoveGalleryImage} handleCancelFieldEdit={handleCancelFieldEdit} handleSubmit={handleSubmit} /><FieldListSection isAdminPortal={isAdminPortal} isOwnerPortal={isOwnerPortal} fields={fields} loading={loading} deletingFieldId={deletingFieldId} fieldStatusActionId={fieldStatusActionId} fieldStatusActionMode={fieldStatusActionMode} fieldListSectionId={fieldListSectionId} manualBookingPath={manualBookingPath} fieldsPath={fieldsPath} publicOrigin={publicOrigin} createPublicBookingUrl={createPublicBookingUrl} getFieldDeletionState={getFieldDeletionState} handleFieldModeration={handleFieldModeration} handleEditField={handleEditField} handleDeleteField={handleDeleteField} /><ManagedBookingsSection loading={loading} managedBookings={managedBookings} processingBookingId={processingBookingId} processingBookingAction={processingBookingAction} ownerBookingsSectionId={ownerBookingsSectionId} manualBookingPath={manualBookingPath} handleConfirmBooking={handleConfirmBooking} handleConfirmDeposit={handleConfirmDeposit} handleConfirmPayment={handleConfirmPayment} handleCancelBooking={handleCancelBooking} /></div></section>
  return <section className="page section adminDashboardPage"><div className="container adminDashboardHero"><div><p className="usersEyebrow">Khu quản lý dành cho Admin</p><h1>Quản lý sân bóng</h1></div><div className="adminDashboardOwner"><span>Tài khoản admin</span><strong>{currentUser?.email}</strong></div></div>{successMessage && <div className="container"><p className="message success">{successMessage}</p></div>}{noticeMessage && <div className="container"><p className="message warning">{noticeMessage}</p></div>}{error && <div className="container"><p className="message error">{error}</p></div>}<div className="container adminDashboardGrid"><section className="usersPanel adminDashboardPanel"><div className="usersPanelHeader"><h2>Nhóm chức năng Admin</h2><span>2 mục chính</span></div><div className="fieldActions"><Link className="btn smallBtn" to={adminUsersPath}>Quản lý tài khoản</Link><Link className="outlineBtnLink" to={manageFieldsSectionPath}>Quản lý sân</Link></div></section><FormPanel isAdminPortal={isAdminPortal} isOwnerPortal={isOwnerPortal} form={form} formErrors={formErrors} isEditingField={isEditingField} submitting={submitting} uploadingCover={uploadingCover} uploadingGallery={uploadingGallery} manageFieldsSectionId={manageFieldsSectionId} handleFieldChange={handleFieldChange} handleSubFieldChange={handleSubFieldChange} handleAddSubField={handleAddSubField} handleRemoveSubField={handleRemoveSubField} handleCoverImageUpload={handleCoverImageUpload} handleGalleryImagesUpload={handleGalleryImagesUpload} handleRemoveCoverImage={handleRemoveCoverImage} handleRemoveGalleryImage={handleRemoveGalleryImage} handleCancelFieldEdit={handleCancelFieldEdit} handleSubmit={handleSubmit} /></div><div className="container ownerDashboardStack"><FieldListSection isAdminPortal={isAdminPortal} isOwnerPortal={isOwnerPortal} fields={fields} loading={loading} deletingFieldId={deletingFieldId} fieldStatusActionId={fieldStatusActionId} fieldStatusActionMode={fieldStatusActionMode} fieldListSectionId={fieldListSectionId} manualBookingPath={manualBookingPath} fieldsPath={fieldsPath} publicOrigin={publicOrigin} createPublicBookingUrl={createPublicBookingUrl} getFieldDeletionState={getFieldDeletionState} handleFieldModeration={handleFieldModeration} handleEditField={handleEditField} handleDeleteField={handleDeleteField} /></div></section>
}

export default AdminFieldsView
