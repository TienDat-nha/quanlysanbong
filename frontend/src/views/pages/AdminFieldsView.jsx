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

const DASHBOARD_CARDS = (stats) => [
  { key: "fields", label: "Tổng sân", value: stats.totalFields, tone: "primary" },
  { key: "bookings", label: "Tổng lượt đặt", value: stats.totalBookings, tone: "neutral" },
  { key: "pending", label: "Chờ xác nhận", value: stats.pendingBookings, tone: "warning" },
  { key: "confirmed", label: "Đã xác nhận", value: stats.confirmedBookings, tone: "success" },
  { key: "customers", label: "Khách hàng", value: stats.totalCustomers, tone: "neutral" },
  { key: "revenue", label: "Doanh thu", value: `${formatPrice(stats.totalRevenue)} VND`, tone: "success" },
]

const getAvailabilityBadgeLabel = (isAvailable) => (isAvailable ? "Còn trống" : "Đã có khách")

const AdminFieldsView = ({
  authToken,
  currentUser,
  isAdmin,
  fields,
  contacts,
  stats,
  recentBookings,
  managedBookings,
  dailyAvailability,
  customerMonthlyStats,
  customerSummaries,
  selectedDate,
  loading,
  submitting,
  uploadingCover,
  uploadingGallery,
  processingBookingId,
  processingBookingAction,
  deletingFieldId,
  deletingContactId,
  error,
  noticeMessage,
  successMessage,
  form,
  isEditingField,
  loginPath,
  publicOrigin,
  createPublicBookingUrl,
  handleFieldChange,
  handleSubFieldChange,
  handleAddSubField,
  handleRemoveSubField,
  handleDashboardDateChange,
  handleCoverImageUpload,
  handleGalleryImagesUpload,
  handleRemoveCoverImage,
  handleRemoveGalleryImage,
  handleEditField,
  handleCancelFieldEdit,
  handleDeleteField,
  handleDeleteContact,
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
          <h1>Bảng điều khiển quản trị</h1>
          <p>
            Vui lòng <Link to={loginPath}>đăng nhập</Link> bằng tài khoản admin để xem lịch sân, đơn đặt,
            liên hệ và tạo sân mới.
          </p>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Bảng điều khiển quản trị</h1>
          <p>Tài khoản {currentUser?.email} không có quyền truy cập khu vực admin.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page section adminDashboardPage">
      <div className="container adminDashboardHero">
        <div>
          <p className="usersEyebrow">Bảng điều khiển quản trị</p>
          <h1>Quản trị sân bóng</h1>
          <p>
            Admin có thể cập nhật, xóa sân, xử lý đơn đặt của khách, xem thống kê và quản lý liên hệ
            trong cùng một màn hình.
          </p>
        </div>
        <div className="adminDashboardOwner">
          <span>Tài khoản admin</span>
          <strong>{currentUser?.email}</strong>
        </div>
      </div>

      {successMessage && <div className="container"><p className="message success">{successMessage}</p></div>}
      {noticeMessage && <div className="container"><p className="message warning">{noticeMessage}</p></div>}
      {error && <div className="container"><p className="message error">{error}</p></div>}

      <div className="container adminDashboardStats">
        {DASHBOARD_CARDS(stats).map((card) => (
          <article className={`adminStatCard adminStatCard--${card.tone}`} key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="container adminDashboardGrid">
        <section className="usersPanel adminDashboardPanel">
          <div className="adminPanelToolbar">
            <div>
              <p className="usersEyebrow">Theo dõi theo ngày</p>
              <h2>Lịch sân và sân con còn trống</h2>
              <p className="helperText">Chọn ngày để xem sân con còn trống hay đã có lịch.</p>
            </div>
            <label className="adminDateFilter" htmlFor="admin-dashboard-date">
              <span>Ngày xem lịch</span>
              <input
                id="admin-dashboard-date"
                type="date"
                value={selectedDate}
                onChange={(event) => handleDashboardDateChange(event.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <p>Đang tải lịch sân theo ngày...</p>
          ) : dailyAvailability.length === 0 ? (
            <p className="usersEmptyState">Bạn chưa tạo sân nào để theo dõi lịch sân.</p>
          ) : (
            <div className="adminAvailabilityList">
              {dailyAvailability.map((field) => (
                <article className="adminAvailabilityCard" key={field.id}>
                  <div className="adminAvailabilityHeader">
                    <div>
                      <h3>{field.name}</h3>
                      <p>{field.address}</p>
                    </div>
                    <div className="adminAvailabilitySummary">
                      <strong>{field.availableSubFields}/{field.totalSubFields}</strong>
                      <span>sân con trống cả ngày</span>
                    </div>
                  </div>
                  <div className="adminFieldMeta">
                    <span>Khu vực: {field.district}</span>
                    <span>Giờ mở cửa: {field.openHours}</span>
                    <span>Lượt đặt trong ngày: {field.bookingCount}</span>
                  </div>
                  <div className="adminSubFieldList">
                    {(field.subFields || []).map((subField) => (
                      <article
                        className={`adminSubFieldCard ${subField.isAvailable ? "isAvailable" : "isBooked"}`}
                        key={subField.key}
                      >
                        <div className="adminSubFieldHeader">
                          <div>
                            <strong>{subField.name}</strong>
                            <p>
                              {subField.type ? `${subField.type} | ` : ""}
                              {formatPrice(subField.pricePerHour)} VND/giờ
                            </p>
                          </div>
                          <span className={`adminAvailabilityBadge ${subField.isAvailable ? "isAvailable" : "isBooked"}`}>
                            {getAvailabilityBadgeLabel(subField.isAvailable)}
                          </span>
                        </div>
                        {!subField.isAvailable && (
                          <div className="adminSlotTagList">
                            {(subField.bookings || []).map((booking) => (
                              <span className="adminSlotTag" key={booking.id}>
                                {booking.timeSlot} | {booking.customerName}
                                {booking.phone ? ` | ${booking.phone}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="usersSidebar">
          <form className="formCard usersForm adminCreateFieldForm" onSubmit={handleSubmit}>
            <div className="usersPanelHeader">
              <h2>{isEditingField ? "Cập nhật sân" : "Tạo sân mới"}</h2>
              {isEditingField && <span>Đang chỉnh sửa</span>}
            </div>
            {isEditingField && (
              <p className="helperText">Bạn đang chỉnh sửa sân hiện có. Lưu để cập nhật, hoặc hủy để tạo mới.</p>
            )}

            <label htmlFor="admin-field-name">Tên sân</label>
            <input id="admin-field-name" type="text" value={form.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="Sân Bóng Riverside" />

            <label htmlFor="admin-field-address">Địa chỉ</label>
            <input id="admin-field-address" type="text" value={form.address} onChange={(event) => handleFieldChange("address", event.target.value)} placeholder="123 Nguyễn Huệ, Quận 1" />

            <label htmlFor="admin-field-district">Khu vực</label>
            <input id="admin-field-district" type="text" value={form.district} onChange={(event) => handleFieldChange("district", event.target.value)} placeholder="Quận 1" />

            <label htmlFor="admin-field-type">Loại sân mặc định</label>
            <select id="admin-field-type" value={form.type} onChange={(event) => handleFieldChange("type", event.target.value)}>
              {FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <label htmlFor="admin-field-open-hours">Giờ mở cửa</label>
            <input id="admin-field-open-hours" type="text" value={form.openHours} onChange={(event) => handleFieldChange("openHours", event.target.value)} placeholder="06:00 - 22:00" />

            <label htmlFor="admin-field-price">Giá mặc định theo giờ</label>
            <input id="admin-field-price" type="number" min="1000" step="1000" value={form.pricePerHour} onChange={(event) => handleFieldChange("pricePerHour", event.target.value)} placeholder="350000" />

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
                <img src={form.coverImage} alt="Ảnh đại diện sân" className="adminUploadPreviewImage" />
                <div className="adminUploadPreviewMeta">
                  <span>Ảnh đại diện đã tải lên</span>
                  <button type="button" className="outlineBtnInline adminDangerBtn" onClick={handleRemoveCoverImage} disabled={uploadingCover}>Xóa ảnh</button>
                </div>
              </div>
            )}

            <label htmlFor="admin-field-article">Mô tả</label>
            <textarea id="admin-field-article" rows={4} value={form.article} onChange={(event) => handleFieldChange("article", event.target.value)} placeholder="Mô tả ngắn về sân bóng của bạn" />

            <div className="adminSubFieldBuilderHeader">
              <label>Thiết lập từng sân con</label>
              <button type="button" className="outlineBtnInline" onClick={handleAddSubField}>Thêm sân con</button>
            </div>
            <p className="helperText">Mỗi sân con có tên, loại sân và giá riêng. Chỉ hỗ trợ Sân 5, Sân 7, Sân 11 và Futsal.</p>
            <div className="adminSubFieldConfigList">
              {(form.subFields || []).map((subField, index) => (
                <article className="adminSubFieldConfigCard" key={subField.id}>
                  <div className="adminSubFieldConfigHeader">
                    <strong>Sân con {index + 1}</strong>
                    <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleRemoveSubField(subField.id)} disabled={(form.subFields || []).length === 1}>Xóa</button>
                  </div>
                  <label htmlFor={`admin-subfield-name-${subField.id}`}>Tên sân con</label>
                  <input id={`admin-subfield-name-${subField.id}`} type="text" value={subField.name} onChange={(event) => handleSubFieldChange(subField.id, "name", event.target.value)} placeholder={`Sân ${index + 1}`} />
                  <label htmlFor={`admin-subfield-type-${subField.id}`}>Loại sân</label>
                  <select id={`admin-subfield-type-${subField.id}`} value={subField.type} onChange={(event) => handleSubFieldChange(subField.id, "type", event.target.value)}>
                    {FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <label htmlFor={`admin-subfield-price-${subField.id}`}>Giá theo giờ</label>
                  <input id={`admin-subfield-price-${subField.id}`} type="number" min="1000" step="1000" value={subField.pricePerHour} onChange={(event) => handleSubFieldChange(subField.id, "pricePerHour", event.target.value)} placeholder={form.pricePerHour || "350000"} />
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
                    <img src={imageUrl} alt={`Ảnh thư viện sân ${index + 1}`} className="adminUploadPreviewImage" />
                    <div className="adminUploadPreviewMeta">
                      <span>Ảnh thư viện {index + 1}</span>
                      <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleRemoveGalleryImage(imageUrl)} disabled={uploadingGallery}>Xóa ảnh</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="fieldActions">
              <button className="btn" type="submit" disabled={submitting || uploadingCover || uploadingGallery}>
                {submitting ? (isEditingField ? "Đang cập nhật..." : "Đang tạo sân...") : (isEditingField ? "Lưu cập nhật" : "Tạo sân mới")}
              </button>
              {isEditingField && <button className="outlineBtnInline" type="button" onClick={handleCancelFieldEdit} disabled={submitting}>Hủy chỉnh sửa</button>}
            </div>
          </form>
        </aside>
      </div>

      <div className="container adminDashboardTwinGrid">
        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Đơn đặt gần đây</h2>
            <span>{recentBookings.length} đơn mới nhất</span>
          </div>
          {loading ? (
            <p>Đang tải đơn đặt gần đây...</p>
          ) : recentBookings.length === 0 ? (
            <p className="usersEmptyState">Chưa có đơn đặt nào cho các sân đang quản lý.</p>
          ) : (
            <div className="adminRecentBookings">
              {recentBookings.map((booking) => (
                <article className="adminRecentBookingCard" key={booking.id}>
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
                    <span className="adminRecentBookingStatus">{formatBookingStatusVi(booking.status)}</span>
                  </div>
                  <div className="adminFieldMeta">
                    <span>Khách: {booking.customer?.fullName || "Khách hàng"}</span>
                    {booking.customer?.phone && <span>SĐT: {booking.customer.phone}</span>}
                  </div>
                  <div className="adminFieldMeta">
                    <span>
                      Thanh toán: {formatPaymentStatusVi(booking.paymentStatus, booking.depositStatus)}
                    </span>
                    <span>Tổng tiền: {formatPrice(booking.totalPrice)} VND</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Khách hàng và dữ liệu các tháng</h2>
            <span>{customerSummaries.length} khách nổi bật</span>
          </div>
          {loading ? (
            <p>Đang tải thông tin khách hàng...</p>
          ) : (
            <>
              <div className="adminMonthlyStatsGrid">
                {customerMonthlyStats.map((item) => (
                  <article className="adminMonthCard" key={item.monthKey}>
                    <span>{item.label}</span>
                    <strong>{item.uniqueCustomers} khách</strong>
                    <p>{item.bookings} lượt đặt</p>
                    <small>Doanh thu: {formatPrice(item.revenue)} VND</small>
                  </article>
                ))}
              </div>
              {customerSummaries.length === 0 ? (
                <p className="usersEmptyState">Chưa có dữ liệu khách hàng để hiển thị.</p>
              ) : (
                <div className="adminCustomerList">
                  {customerSummaries.map((customer) => (
                    <article className="adminCustomerCard" key={customer.key}>
                      <div className="adminCustomerHeader">
                        <div>
                          <h3>{customer.fullName || "Khách hàng"}</h3>
                          <p>{customer.email || customer.phone || "Chưa có thông tin liên hệ"}</p>
                        </div>
                        <span>{customer.totalBookings} lượt đặt</span>
                      </div>
                      <div className="adminFieldMeta">
                        <span>Đã xác nhận: {customer.confirmedBookings}</span>
                        <span>Đã hủy: {customer.cancelledBookings}</span>
                        <span>Chi tiêu: {formatPrice(customer.totalSpent)} VND</span>
                      </div>
                      <div className="adminFieldMeta">
                        <span>Gần nhất: {customer.lastDate ? formatBookingDateLabel(customer.lastDate) : "--"}{customer.lastTimeSlot ? ` | ${customer.lastTimeSlot}` : ""}</span>
                        <span>{customer.lastFieldName || "Chưa có sân"}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="container adminDashboardTwinGrid">
        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Quản lý đơn đặt của khách</h2>
            <span>{managedBookings.length} đơn cần theo dõi</span>
          </div>
          {loading ? (
            <p>Đang tải danh sách đơn đặt cần xử lý...</p>
          ) : managedBookings.length === 0 ? (
            <p className="usersEmptyState">Chưa có đơn đặt nào trong danh sách quản trị.</p>
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
                const canConfirmDeposit = bookingStatus !== "cancelled" && paymentStatus !== "paid" && paymentStatus !== "deposit_paid"
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
                        <span className="adminRecentBookingStatus">{formatBookingStatusVi(booking.status)}</span>
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
                    {booking.note && <p className="adminBookingNote"><strong>Ghi chú:</strong> {booking.note}</p>}
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

        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Quản lý liên hệ</h2>
            <span>{contacts.length} liên hệ</span>
          </div>
          {loading ? (
            <p>Đang tải danh sách liên hệ...</p>
          ) : contacts.length === 0 ? (
            <p className="usersEmptyState">Chưa có liên hệ nào gửi về hệ thống.</p>
          ) : (
            <div className="adminContactList">
              {contacts.map((contact) => {
                const isDeleting = String(deletingContactId) === String(contact.id)
                return (
                  <article className="adminContactCard" key={contact.id}>
                    <div className="adminContactHeader">
                      <div>
                        <h3>{contact.name || "Liên hệ"}</h3>
                        <p>{contact.email || contact.phone || "Chưa có thông tin liên hệ"}</p>
                      </div>
                      <span>{contact.createdAt ? formatBookingDateTime(contact.createdAt) : "Không rõ"}</span>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Email: {contact.email || "--"}</span>
                      <span>SĐT: {contact.phone || "--"}</span>
                    </div>
                    <p className="adminContactMessage">{contact.message || "Không có nội dung."}</p>
                    <div className="fieldActions">
                      <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleDeleteContact(contact)} disabled={isDeleting}>
                        {isDeleting ? "Đang xóa..." : "Xóa liên hệ"}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div className="container">
        <article className="usersPanel adminFieldListPanel">
          <div className="usersPanelHeader">
            <h2>Danh sách sân của bạn</h2>
            <span>{fields.length} sân bạn quản lý</span>
          </div>
          {loading ? (
            <p>Đang tải danh sách sân bạn quản lý...</p>
          ) : fields.length === 0 ? (
            <p className="usersEmptyState">Bạn chưa tạo sân nào. Sau khi tạo, link công khai đặt sân sẽ hiện ở đây.</p>
          ) : (
            <div className="adminFieldList">
              {fields.map((field) => {
                const publicBookingUrl = createPublicBookingUrl(publicOrigin, field.slug)
                const isDeleting = String(deletingFieldId) === String(field.id)
                return (
                  <article className="adminFieldCard" key={field.id}>
                    <div className="adminFieldCardHeader">
                      <div>
                        <h3>{field.name}</h3>
                        <p>{field.address}</p>
                      </div>
                      <span className="adminFieldPrice">{formatPrice(field.pricePerHour)} VND/giờ</span>
                    </div>
                    <div className="adminFieldMeta">
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
                        <span className="adminSlotTag" key={`${field.id}-${item.key || item.name || index}`}>
                          {item.name}
                          {item.type ? ` | ${item.type}` : ""}
                          {item.pricePerHour ? ` | ${formatPrice(item.pricePerHour)} VND/giờ` : ""}
                        </span>
                      ))}
                    </div>
                    <label className="adminFieldLinkLabel" htmlFor={`booking-url-${field.id}`}>Link đặt sân công khai</label>
                    <input id={`booking-url-${field.id}`} type="text" readOnly value={publicBookingUrl} />
                    <div className="fieldActions">
                      <a className="btn smallBtn" href={publicBookingUrl} target="_blank" rel="noreferrer">Mở link đặt sân</a>
                      <button type="button" className="outlineBtnInline" onClick={() => handleEditField(field)} disabled={isDeleting}>Sửa sân</button>
                      <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleDeleteField(field)} disabled={isDeleting}>{isDeleting ? "Đang xóa..." : "Xóa sân"}</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default AdminFieldsView
