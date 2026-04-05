import React, { useMemo } from "react"
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiInbox,
  FiMapPin,
  FiPhone,
  FiTag,
  FiUser,
  FiXCircle,
} from "react-icons/fi"
import { getBookingPaymentSummaryVi } from "../../models/bookingTextModel"
import "./AdminBookingsView.scss"

const STATUS_META = Object.freeze({
  PENDING: {
    label: "Chờ xác nhận",
    tone: "pending",
    icon: <FiClock />,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    tone: "confirmed",
    icon: <FiCheckCircle />,
  },
  COMPLETED: {
    label: "Hoàn thành",
    tone: "completed",
    icon: <FiCheckCircle />,
  },
  CANCELLED: {
    label: "Đã hủy",
    tone: "cancelled",
    icon: <FiXCircle />,
  },
})

const BOOKING_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xác nhận" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "COMPLETED", label: "Hoàn thành" },
]

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const formatDisplayDate = (value) => {
  const normalizedValue = String(value || "").trim()
  if (!normalizedValue) {
    return "--"
  }

  const date = new Date(`${normalizedValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return normalizedValue
  }

  return new Intl.DateTimeFormat("vi-VN").format(date)
}

const getBookingStatusMeta = (status) => {
  const normalizedStatus = String(status || "PENDING").trim().toUpperCase()
  return STATUS_META[normalizedStatus] || STATUS_META.PENDING
}

const getShortBookingId = (value) => String(value || "").trim().slice(0, 8) || "--"

const AdminBookingsView = ({
  bookings = [],
  loading = false,
  error = null,
  selectedDate = "",
  filterStatus = "ALL",
  setSelectedDate = () => {},
  setFilterStatus = () => {},
  handleConfirmBooking = () => {},
  handleCancelBooking = () => {},
  actionLoading = null,
}) => {
  const summary = useMemo(() => {
    const pendingCount = bookings.filter((booking) => booking?.status === "PENDING").length
    const confirmedCount = bookings.filter((booking) => booking?.status === "CONFIRMED").length
    const totalRevenue = bookings.reduce(
      (total, booking) => total + Number(booking?.totalPrice || 0),
      0
    )

    return {
      total: bookings.length,
      pending: pendingCount,
      confirmed: confirmedCount,
      revenue: totalRevenue,
    }
  }, [bookings])

  return (
    <div className="admin-bookings-page">
      <section className="admin-bookings-hero">
        <div className="admin-bookings-hero__copy">
          <span className="admin-bookings-hero__eyebrow">Không gian chủ sân</span>
          <h1>Quản lý Đơn Đặt Sân</h1>
          <p>Theo dõi và xử lý toàn bộ đơn đặt sân của khách theo từng ngày hoạt động.</p>
        </div>

        <div className="admin-bookings-filterCard">
          <div className="admin-bookings-filterField">
            <label htmlFor="owner-bookings-date">Ngày xem</label>
            <input
              id="owner-bookings-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>

          <div className="admin-bookings-filterField">
            <label htmlFor="owner-bookings-status">Trạng thái</label>
            <select
              id="owner-bookings-status"
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
            >
              {BOOKING_FILTERS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-bookings-filterMeta">
            <span>Đang xem</span>
            <strong>{formatDisplayDate(selectedDate)}</strong>
          </div>
        </div>
      </section>

      <section className="admin-bookings-stats">
        <article className="admin-bookings-statCard admin-bookings-statCard--total">
          <span className="stat-icon" aria-hidden="true">
            <FiInbox />
          </span>
          <div>
            <span className="stat-label">Tổng đơn</span>
            <strong className="stat-value">{summary.total}</strong>
          </div>
        </article>

        <article className="admin-bookings-statCard admin-bookings-statCard--pending">
          <span className="stat-icon" aria-hidden="true">
            <FiClock />
          </span>
          <div>
            <span className="stat-label">Chờ xác nhận</span>
            <strong className="stat-value">{summary.pending}</strong>
          </div>
        </article>

        <article className="admin-bookings-statCard admin-bookings-statCard--confirmed">
          <span className="stat-icon" aria-hidden="true">
            <FiCheckCircle />
          </span>
          <div>
            <span className="stat-label">Đã xác nhận</span>
            <strong className="stat-value">{summary.confirmed}</strong>
          </div>
        </article>

        <article className="admin-bookings-statCard admin-bookings-statCard--revenue">
          <span className="stat-icon" aria-hidden="true">
            <FiDollarSign />
          </span>
          <div>
            <span className="stat-label">Tổng giá trị</span>
            <strong className="stat-value">{formatCurrency(summary.revenue)}</strong>
          </div>
        </article>
      </section>

      <section className="admin-bookings-panel">
        {error && (
          <div className="admin-bookings-alert admin-bookings-alert--error">
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="admin-bookings-state admin-bookings-state--loading">
            <div className="spinner" />
            <p>Đang tải danh sách đơn đặt...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="admin-bookings-state admin-bookings-state--empty">
            <span className="state-icon" aria-hidden="true">
              <FiInbox />
            </span>
            <h2>Chưa có đơn đặt sân</h2>
            <p>Không có booking phù hợp với ngày và bộ lọc bạn đang xem.</p>
          </div>
        ) : (
          <div className="admin-bookings-list">
            {bookings.map((booking) => {
              const statusMeta = getBookingStatusMeta(booking?.status)
              const isProcessing = actionLoading === booking?.id
              const groupedCount = Number(
                booking?.groupedBookingCount || booking?.bookingIds?.length || 1
              )
              const paymentSummary = getBookingPaymentSummaryVi(booking)
              const groupedBookings = Array.isArray(booking?.groupedBookings) && booking.groupedBookings.length > 0
                ? booking.groupedBookings
                : [booking]
              const totalAmount = Number(paymentSummary.totalAmount || booking?.totalPrice || 0)
              const paidDepositAmount = Number(paymentSummary.paidDepositAmount || 0)
              const remainingPaidAmount = Number(paymentSummary.remainingPaidAmount || 0)
              const remainingAmount = Number(paymentSummary.remainingAmount || 0)
              const needsDepositConfirmation = groupedBookings.some((item) => {
                const itemPaymentSummary = getBookingPaymentSummaryVi(item)
                return !itemPaymentSummary.isFullyPaid && !itemPaymentSummary.hasConfirmedDeposit
              })
              const needsRemainingConfirmation =
                !needsDepositConfirmation
                && groupedBookings.some((item) => {
                  const itemPaymentSummary = getBookingPaymentSummaryVi(item)
                  return itemPaymentSummary.hasConfirmedDeposit
                    && !itemPaymentSummary.isFullyPaid
                    && Number(itemPaymentSummary.remainingAmount || 0) > 0
                })
              const canConfirmAction =
                needsDepositConfirmation
                || needsRemainingConfirmation
                || booking?.status === "PENDING"
              const confirmActionLabel = needsRemainingConfirmation
                ? "Xác nhận thanh toán nốt"
                : needsDepositConfirmation
                  ? "Xác nhận cọc"
                  : "Xác nhận"

              return (
                <article className="admin-booking-card" key={booking?.id}>
                  <div className="admin-booking-card__top">
                    <div className="admin-booking-card__heading">
                      <div className="booking-code">
                        <span className="booking-code__label">Mã đặt</span>
                        <strong>#{getShortBookingId(booking?.id)}</strong>
                      </div>

                      <div className="booking-title">
                        <h2>{booking?.fieldName || "Sân bóng"}</h2>
                        <p>{booking?.subFieldName || "Chưa rõ sân con"}</p>
                      </div>
                    </div>

                    <div className="admin-booking-card__meta">
                      <span className={`status-pill status-pill--${statusMeta.tone}`}>
                        <span aria-hidden="true">{statusMeta.icon}</span>
                        {statusMeta.label}
                      </span>

                      <span className={`payment-pill payment-pill--${paymentSummary.tone}`}>
                        {paymentSummary.label}
                      </span>

                      {groupedCount > 1 && (
                        <span className="group-pill">
                          {groupedCount} khung giờ liên tiếp
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="admin-booking-card__grid">
                    <div className="booking-detail">
                      <span className="booking-detail__label">
                        <FiUser aria-hidden="true" />
                        Khách hàng
                      </span>
                      <strong>{booking?.customer?.fullName || "Khách hàng"}</strong>
                      <p>{booking?.customer?.phone || booking?.phone || booking?.customer?.email || "--"}</p>
                    </div>

                    <div className="booking-detail">
                      <span className="booking-detail__label">
                        <FiPhone aria-hidden="true" />
                        Liên hệ
                      </span>
                      <strong>{booking?.customer?.phone || booking?.phone || "--"}</strong>
                      <p>{booking?.customer?.email || "Chưa có email"}</p>
                    </div>

                    <div className="booking-detail">
                      <span className="booking-detail__label">
                        <FiCalendar aria-hidden="true" />
                        Ngày đặt
                      </span>
                      <strong>{formatDisplayDate(booking?.date)}</strong>
                      <p>{booking?.timeSlot || "--"}</p>
                    </div>

                    <div className="booking-detail">
                      <span className="booking-detail__label">
                        <FiMapPin aria-hidden="true" />
                        Sân
                      </span>
                      <strong>{booking?.fieldName || "--"}</strong>
                      <p>{booking?.subFieldName || "--"}</p>
                    </div>

                    <div className="booking-detail booking-detail--price">
                      <span className="booking-detail__label">
                        <FiDollarSign aria-hidden="true" />
                        Tổng tiền
                      </span>
                      <strong>{formatCurrency(booking?.totalPrice || 0)}</strong>
                    </div>
                  </div>

                  {totalAmount > 0 && (
                    <div className="admin-booking-card__paymentRow">
                      <div className="booking-detail booking-detail--payment">
                        <span className="booking-detail__label">
                          <FiDollarSign aria-hidden="true" />
                          {"\u0110\u00e3 c\u1ecdc"}
                        </span>
                        <strong>{formatCurrency(paidDepositAmount)}</strong>
                        <p>
                          {paidDepositAmount > 0
                            ? "\u004b\u0068\u00e1\u0063\u0068\u0020\u0111\u00e3\u0020\u0074\u0068\u0061\u006e\u0068\u0020\u0074\u006f\u00e1\u006e\u0020\u0070\u0068\u1ea7\u006e\u0020\u0063\u1ecdc\u002e"
                            : "\u0043\u0068\u01b0\u0061\u0020\u0078\u00e1\u0063\u0020\u006e\u0068\u1ead\u006e\u0020\u0074\u0069\u1ec1\u006e\u0020\u0063\u1ecdc\u002e"}
                        </p>
                      </div>

                      <div className="booking-detail booking-detail--payment">
                        <span className="booking-detail__label">
                          <FiDollarSign aria-hidden="true" />
                          {"\u0110\u00e3 thanh to\u00e1n ph\u1ea7n c\u00f2n l\u1ea1i"}
                        </span>
                        <strong>{formatCurrency(remainingPaidAmount)}</strong>
                        <p>
                          {remainingPaidAmount > 0
                            ? "\u0050\u0068\u1ea7\u006e\u0020\u0063\u00f2\u006e\u0020\u006c\u1ea1\u0069\u0020\u0111\u00e3\u0020\u0111\u01b0\u1ee3\u0063\u0020\u0078\u00e1\u0063\u0020\u006e\u0068\u1ead\u006e\u002e"
                            : "\u0043\u0068\u01b0\u0061\u0020\u0074\u0068\u0061\u006e\u0068\u0020\u0074\u006f\u00e1\u006e\u0020\u0070\u0068\u1ea7\u006e\u0020\u0063\u00f2\u006e\u0020\u006c\u1ea1\u0069\u002e"}
                        </p>
                      </div>

                      <div
                        className={`booking-detail booking-detail--payment${remainingAmount > 0 ? " booking-detail--paymentDue" : ""}`.trim()}
                      >
                        <span className="booking-detail__label">
                          <FiDollarSign aria-hidden="true" />
                          {"\u0043\u00f2n n\u1ee3"}
                        </span>
                        <strong>{formatCurrency(remainingAmount)}</strong>
                        <p>
                          {remainingAmount > 0
                            ? "\u0053\u1ed1\u0020\u0074\u0069\u1ec1\u006e\u0020\u006b\u0068\u00e1\u0063\u0068\u0020\u0063\u00f2\u006e\u0020\u0070\u0068\u1ea3\u0069\u0020\u0074\u0068\u0061\u006e\u0068\u0020\u0074\u006f\u00e1\u006e\u002e"
                            : "\u004b\u0068\u00f4\u006e\u0067\u0020\u0063\u00f2\u006e\u0020\u0063\u00f4\u006e\u0067\u0020\u006e\u1ee3\u002e"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="admin-booking-card__footer">
                    <div className="booking-tag">
                      <FiTag aria-hidden="true" />
                      <span>{booking?.timeSlot || "--"}</span>
                    </div>

                    <div className="booking-actions">
                      {canConfirmAction && (
                        <button
                          type="button"
                          className="booking-action booking-action--confirm"
                          onClick={() => handleConfirmBooking(booking)}
                          disabled={isProcessing}
                        >
                          <FiCheckCircle aria-hidden="true" />
                          {isProcessing ? "Đang xử lý..." : confirmActionLabel}
                        </button>
                      )}

                      {(booking?.status === "PENDING" || booking?.status === "CONFIRMED") && (
                        <button
                          type="button"
                          className="booking-action booking-action--cancel"
                          onClick={() => handleCancelBooking(booking)}
                          disabled={isProcessing}
                        >
                          <FiXCircle aria-hidden="true" />
                          {isProcessing ? "Đang xử lý..." : "Hủy đơn"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminBookingsView
