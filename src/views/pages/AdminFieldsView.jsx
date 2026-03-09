import React from "react"
import { Link } from "react-router-dom"
import {
  formatBookingDateLabel,
  formatBookingDateTime,
  formatBookingStatus,
  formatDepositStatus,
} from "../../models/bookingModel"
import { formatPrice, getFieldTypeSummary } from "../../models/fieldModel"
import { FIELD_TYPE_OPTIONS } from "../../models/fieldTypeModel"

const DASHBOARD_CARDS = (stats) => [
  { key: "fields", label: "Tong san", value: stats.totalFields, tone: "primary" },
  { key: "bookings", label: "Tong luot dat", value: stats.totalBookings, tone: "neutral" },
  { key: "pending", label: "Cho xac nhan", value: stats.pendingBookings, tone: "warning" },
  { key: "confirmed", label: "Da xac nhan", value: stats.confirmedBookings, tone: "success" },
  { key: "customers", label: "Khach hang", value: stats.totalCustomers, tone: "neutral" },
  { key: "revenue", label: "Doanh thu", value: `${formatPrice(stats.totalRevenue)} VND`, tone: "success" },
]

const getAvailabilityBadgeLabel = (isAvailable) => (isAvailable ? "Con trong" : "Da co khach")

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
  deletingFieldId,
  deletingContactId,
  error,
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
  handleCancelBooking,
}) => {
  if (!authToken) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Bang dieu khien quan tri</h1>
          <p>
            Vui long <Link to={loginPath}>dang nhap</Link> bang tai khoan admin de xem lich san, don dat,
            contact va tao san moi.
          </p>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="page section">
        <div className="container pageHeader">
          <h1>Bang dieu khien quan tri</h1>
          <p>Tai khoan {currentUser?.email} khong co quyen truy cap khu vuc admin.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page section adminDashboardPage">
      <div className="container adminDashboardHero">
        <div>
          <p className="usersEyebrow">Bang dieu khien quan tri</p>
          <h1>Quan tri san bong</h1>
          <p>
            Admin co the cap nhat, xoa san, xu ly don dat cua khach, xem thong ke va quan ly contact
            trong cung mot man hinh.
          </p>
        </div>
        <div className="adminDashboardOwner">
          <span>Tai khoan admin</span>
          <strong>{currentUser?.email}</strong>
        </div>
      </div>

      {successMessage && <div className="container"><p className="message success">{successMessage}</p></div>}
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
              <p className="usersEyebrow">Theo doi theo ngay</p>
              <h2>Lich san va san con con trong</h2>
              <p className="helperText">Chon ngay de xem san con trong hay da co lich.</p>
            </div>
            <label className="adminDateFilter" htmlFor="admin-dashboard-date">
              <span>Ngay xem lich</span>
              <input
                id="admin-dashboard-date"
                type="date"
                value={selectedDate}
                onChange={(event) => handleDashboardDateChange(event.target.value)}
              />
            </label>
          </div>

          {loading ? (
            <p>Dang tai lich san theo ngay...</p>
          ) : dailyAvailability.length === 0 ? (
            <p className="usersEmptyState">Ban chua tao san nao de theo doi lich san.</p>
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
                      <span>san con trong ca ngay</span>
                    </div>
                  </div>
                  <div className="adminFieldMeta">
                    <span>Khu vuc: {field.district}</span>
                    <span>Gio mo cua: {field.openHours}</span>
                    <span>Luot dat trong ngay: {field.bookingCount}</span>
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
                              {formatPrice(subField.pricePerHour)} VND/gio
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
              <h2>{isEditingField ? "Cap nhat san" : "Tao san moi"}</h2>
              {isEditingField && <span>Dang chinh sua</span>}
            </div>
            {isEditingField && (
              <p className="helperText">Ban dang chinh sua san hien co. Luu de cap nhat, hoac huy de tao moi.</p>
            )}

            <label htmlFor="admin-field-name">Ten san</label>
            <input id="admin-field-name" type="text" value={form.name} onChange={(event) => handleFieldChange("name", event.target.value)} placeholder="San Bong Riverside" />

            <label htmlFor="admin-field-address">Dia chi</label>
            <input id="admin-field-address" type="text" value={form.address} onChange={(event) => handleFieldChange("address", event.target.value)} placeholder="123 Nguyen Hue, Quan 1" />

            <label htmlFor="admin-field-district">Khu vuc</label>
            <input id="admin-field-district" type="text" value={form.district} onChange={(event) => handleFieldChange("district", event.target.value)} placeholder="Quan 1" />

            <label htmlFor="admin-field-type">Loai san mac dinh</label>
            <select id="admin-field-type" value={form.type} onChange={(event) => handleFieldChange("type", event.target.value)}>
              {FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>

            <label htmlFor="admin-field-open-hours">Gio mo cua</label>
            <input id="admin-field-open-hours" type="text" value={form.openHours} onChange={(event) => handleFieldChange("openHours", event.target.value)} placeholder="06:00 - 22:00" />

            <label htmlFor="admin-field-price">Gia mac dinh theo gio</label>
            <input id="admin-field-price" type="number" min="1000" step="1000" value={form.pricePerHour} onChange={(event) => handleFieldChange("pricePerHour", event.target.value)} placeholder="350000" />

            <label htmlFor="admin-field-cover">Anh dai dien</label>
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
            <p className="helperText">Ho tro JPG, PNG, WEBP, GIF. Toi da 8MB.</p>
            {uploadingCover && <p className="helperText">Dang tai anh dai dien...</p>}
            {form.coverImage && (
              <div className="adminUploadPreviewCard">
                <img src={form.coverImage} alt="Anh dai dien san" className="adminUploadPreviewImage" />
                <div className="adminUploadPreviewMeta">
                  <span>Anh dai dien da tai len</span>
                  <button type="button" className="outlineBtnInline adminDangerBtn" onClick={handleRemoveCoverImage} disabled={uploadingCover}>Xoa anh</button>
                </div>
              </div>
            )}

            <label htmlFor="admin-field-article">Mo ta</label>
            <textarea id="admin-field-article" rows={4} value={form.article} onChange={(event) => handleFieldChange("article", event.target.value)} placeholder="Mo ta ngan ve san bong cua ban" />

            <div className="adminSubFieldBuilderHeader">
              <label>Thiet lap tung san con</label>
              <button type="button" className="outlineBtnInline" onClick={handleAddSubField}>Them san con</button>
            </div>
            <p className="helperText">Moi san con co ten, loai san va gia rieng. Chi ho tro San 5, San 7, San 11 va Futsal.</p>
            <div className="adminSubFieldConfigList">
              {(form.subFields || []).map((subField, index) => (
                <article className="adminSubFieldConfigCard" key={subField.id}>
                  <div className="adminSubFieldConfigHeader">
                    <strong>San con {index + 1}</strong>
                    <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleRemoveSubField(subField.id)} disabled={(form.subFields || []).length === 1}>Xoa</button>
                  </div>
                  <label htmlFor={`admin-subfield-name-${subField.id}`}>Ten san con</label>
                  <input id={`admin-subfield-name-${subField.id}`} type="text" value={subField.name} onChange={(event) => handleSubFieldChange(subField.id, "name", event.target.value)} placeholder={`San ${index + 1}`} />
                  <label htmlFor={`admin-subfield-type-${subField.id}`}>Loai san</label>
                  <select id={`admin-subfield-type-${subField.id}`} value={subField.type} onChange={(event) => handleSubFieldChange(subField.id, "type", event.target.value)}>
                    {FIELD_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <label htmlFor={`admin-subfield-price-${subField.id}`}>Gia theo gio</label>
                  <input id={`admin-subfield-price-${subField.id}`} type="number" min="1000" step="1000" value={subField.pricePerHour} onChange={(event) => handleSubFieldChange(subField.id, "pricePerHour", event.target.value)} placeholder={form.pricePerHour || "350000"} />
                </article>
              ))}
            </div>

            <label htmlFor="admin-field-images">Anh thu vien</label>
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
            <p className="helperText">Ban co the chon nhieu anh cung luc cho thu vien anh.</p>
            {uploadingGallery && <p className="helperText">Dang tai anh thu vien...</p>}
            {form.galleryImages.length > 0 && (
              <div className="adminUploadPreviewGrid">
                {form.galleryImages.map((imageUrl, index) => (
                  <article className="adminUploadPreviewCard" key={`${imageUrl}-${index}`}>
                    <img src={imageUrl} alt={`Anh thu vien san ${index + 1}`} className="adminUploadPreviewImage" />
                    <div className="adminUploadPreviewMeta">
                      <span>Anh thu vien {index + 1}</span>
                      <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleRemoveGalleryImage(imageUrl)} disabled={uploadingGallery}>Xoa anh</button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="fieldActions">
              <button className="btn" type="submit" disabled={submitting || uploadingCover || uploadingGallery}>
                {submitting ? (isEditingField ? "Dang cap nhat..." : "Dang tao san...") : (isEditingField ? "Luu cap nhat" : "Tao san moi")}
              </button>
              {isEditingField && <button className="outlineBtnInline" type="button" onClick={handleCancelFieldEdit} disabled={submitting}>Huy chinh sua</button>}
            </div>
          </form>
        </aside>
      </div>

      <div className="container adminDashboardTwinGrid">
        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Don dat gan day</h2>
            <span>{recentBookings.length} don moi nhat</span>
          </div>
          {loading ? (
            <p>Dang tai don dat gan day...</p>
          ) : recentBookings.length === 0 ? (
            <p className="usersEmptyState">Chua co don dat nao cho cac san dang quan ly.</p>
          ) : (
            <div className="adminRecentBookings">
              {recentBookings.map((booking) => (
                <article className="adminRecentBookingCard" key={booking.id}>
                  <div className="adminRecentBookingHeader">
                    <div>
                      <h3>{booking.fieldName}</h3>
                      <p>
                        {booking.subFieldName || "San tong"}
                        {booking.subFieldType ? ` | ${booking.subFieldType}` : ""}
                        {" | "}
                        {formatBookingDateLabel(booking.date)} | {booking.timeSlot}
                      </p>
                    </div>
                    <span className="adminRecentBookingStatus">{formatBookingStatus(booking.status)}</span>
                  </div>
                  <div className="adminFieldMeta">
                    <span>Khach: {booking.customer?.fullName || "Khach hang"}</span>
                    {booking.customer?.phone && <span>SDT: {booking.customer.phone}</span>}
                  </div>
                  <div className="adminFieldMeta">
                    <span>Dat coc: {formatDepositStatus(booking.depositStatus)}</span>
                    <span>Tong tien: {formatPrice(booking.totalPrice)} VND</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="usersPanel adminDashboardPanel">
          <div className="usersPanelHeader">
            <h2>Khach hang va du lieu cac thang</h2>
            <span>{customerSummaries.length} khach noi bat</span>
          </div>
          {loading ? (
            <p>Dang tai thong tin khach hang...</p>
          ) : (
            <>
              <div className="adminMonthlyStatsGrid">
                {customerMonthlyStats.map((item) => (
                  <article className="adminMonthCard" key={item.monthKey}>
                    <span>{item.label}</span>
                    <strong>{item.uniqueCustomers} khach</strong>
                    <p>{item.bookings} luot dat</p>
                    <small>Doanh thu: {formatPrice(item.revenue)} VND</small>
                  </article>
                ))}
              </div>
              {customerSummaries.length === 0 ? (
                <p className="usersEmptyState">Chua co du lieu khach hang de hien thi.</p>
              ) : (
                <div className="adminCustomerList">
                  {customerSummaries.map((customer) => (
                    <article className="adminCustomerCard" key={customer.key}>
                      <div className="adminCustomerHeader">
                        <div>
                          <h3>{customer.fullName || "Khach hang"}</h3>
                          <p>{customer.email || customer.phone || "Chua co thong tin lien he"}</p>
                        </div>
                        <span>{customer.totalBookings} luot dat</span>
                      </div>
                      <div className="adminFieldMeta">
                        <span>Da xac nhan: {customer.confirmedBookings}</span>
                        <span>Da huy: {customer.cancelledBookings}</span>
                        <span>Chi tieu: {formatPrice(customer.totalSpent)} VND</span>
                      </div>
                      <div className="adminFieldMeta">
                        <span>Gan nhat: {customer.lastDate ? formatBookingDateLabel(customer.lastDate) : "--"}{customer.lastTimeSlot ? ` | ${customer.lastTimeSlot}` : ""}</span>
                        <span>{customer.lastFieldName || "Chua co san"}</span>
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
            <h2>Quan ly don dat cua khach</h2>
            <span>{managedBookings.length} don can theo doi</span>
          </div>
          {loading ? (
            <p>Dang tai danh sach don dat can xu ly...</p>
          ) : managedBookings.length === 0 ? (
            <p className="usersEmptyState">Chua co don dat nao trong danh sach quan tri.</p>
          ) : (
            <div className="adminManagedBookingList">
              {managedBookings.map((booking) => {
                const isProcessing = String(processingBookingId) === String(booking.id)
                const bookingStatus = String(booking.status || "").trim().toLowerCase()
                const canConfirm = bookingStatus === "pending"
                const canCancel = bookingStatus !== "cancelled"

                return (
                  <article className="adminManagedBookingCard" key={booking.id}>
                    <div className="adminRecentBookingHeader">
                      <div>
                        <h3>{booking.fieldName}</h3>
                        <p>
                          {booking.subFieldName || "San tong"}
                          {booking.subFieldType ? ` | ${booking.subFieldType}` : ""}
                          {" | "}
                          {formatBookingDateLabel(booking.date)} | {booking.timeSlot}
                        </p>
                      </div>
                      <div className="adminManagedBookingStatusGroup">
                        <span className="adminRecentBookingStatus">{formatBookingStatus(booking.status)}</span>
                        <span className="adminDepositBadge">{formatDepositStatus(booking.depositStatus)}</span>
                      </div>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Khach: {booking.customer?.fullName || "Khach hang"}</span>
                      {booking.customer?.email && <span>Email: {booking.customer.email}</span>}
                      {booking.customer?.phone && <span>SDT: {booking.customer.phone}</span>}
                    </div>
                    <div className="adminFieldMeta">
                      <span>Tong tien: {formatPrice(booking.totalPrice)} VND</span>
                      <span>Dat coc: {formatPrice(booking.depositAmount)} VND</span>
                      <span>Tao luc: {formatBookingDateTime(booking.createdAt)}</span>
                    </div>
                    {booking.note && <p className="adminBookingNote"><strong>Ghi chu:</strong> {booking.note}</p>}
                    {(canConfirm || canCancel) && (
                      <div className="fieldActions">
                        {canConfirm && <button type="button" className="outlineBtnInline" disabled={isProcessing} onClick={() => handleConfirmBooking(booking.id)}>{isProcessing ? "Dang xu ly..." : "Xac nhan dat san"}</button>}
                        {canCancel && <button type="button" className="outlineBtnInline adminDangerBtn" disabled={isProcessing} onClick={() => handleCancelBooking(booking.id)}>{isProcessing ? "Dang huy..." : "Huy don dat"}</button>}
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
            <h2>Quan ly contact</h2>
            <span>{contacts.length} lien he</span>
          </div>
          {loading ? (
            <p>Dang tai danh sach contact...</p>
          ) : contacts.length === 0 ? (
            <p className="usersEmptyState">Chua co contact nao gui ve he thong.</p>
          ) : (
            <div className="adminContactList">
              {contacts.map((contact) => {
                const isDeleting = String(deletingContactId) === String(contact.id)
                return (
                  <article className="adminContactCard" key={contact.id}>
                    <div className="adminContactHeader">
                      <div>
                        <h3>{contact.name || "Lien he"}</h3>
                        <p>{contact.email || contact.phone || "Chua co thong tin lien he"}</p>
                      </div>
                      <span>{contact.createdAt ? formatBookingDateTime(contact.createdAt) : "Khong ro"}</span>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Email: {contact.email || "--"}</span>
                      <span>SDT: {contact.phone || "--"}</span>
                    </div>
                    <p className="adminContactMessage">{contact.message || "Khong co noi dung."}</p>
                    <div className="fieldActions">
                      <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleDeleteContact(contact)} disabled={isDeleting}>
                        {isDeleting ? "Dang xoa..." : "Xoa contact"}
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
            <h2>Danh sach san cua ban</h2>
            <span>{fields.length} san ban quan ly</span>
          </div>
          {loading ? (
            <p>Dang tai danh sach san ban quan ly...</p>
          ) : fields.length === 0 ? (
            <p className="usersEmptyState">Ban chua tao san nao. Sau khi tao, link cong khai dat san se hien o day.</p>
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
                      <span className="adminFieldPrice">{formatPrice(field.pricePerHour)} VND/gio</span>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Khu vuc: {field.district}</span>
                      <span>Loai san: {getFieldTypeSummary(field) || field.type}</span>
                      <span>Gio mo cua: {field.openHours}</span>
                    </div>
                    <div className="adminFieldMeta">
                      <span>Slug: /dat-san/{field.slug}</span>
                      <span>So san con: {(field.subFields || []).length}</span>
                    </div>
                    <div className="adminFieldSubFieldList">
                      {(field.subFields || []).map((item, index) => (
                        <span className="adminSlotTag" key={`${field.id}-${item.key || item.name || index}`}>
                          {item.name}
                          {item.type ? ` | ${item.type}` : ""}
                          {item.pricePerHour ? ` | ${formatPrice(item.pricePerHour)} VND/gio` : ""}
                        </span>
                      ))}
                    </div>
                    <label className="adminFieldLinkLabel" htmlFor={`booking-url-${field.id}`}>Link dat san cong khai</label>
                    <input id={`booking-url-${field.id}`} type="text" readOnly value={publicBookingUrl} />
                    <div className="fieldActions">
                      <a className="btn smallBtn" href={publicBookingUrl} target="_blank" rel="noreferrer">Mo link dat san</a>
                      <button type="button" className="outlineBtnInline" onClick={() => handleEditField(field)} disabled={isDeleting}>Sua san</button>
                      <button type="button" className="outlineBtnInline adminDangerBtn" onClick={() => handleDeleteField(field)} disabled={isDeleting}>{isDeleting ? "Dang xoa..." : "Xoa san"}</button>
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
