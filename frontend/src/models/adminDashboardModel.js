import { getTodayBookingDate, normalizeBookingDateValue } from "./bookingModel"

export const EMPTY_ADMIN_STATS = Object.freeze({
  totalFields: 0,
  totalBookings: 0,
  pendingBookings: 0,
  confirmedBookings: 0,
  cancelledBookings: 0,
  totalCustomers: 0,
  totalRevenue: 0,
  totalDepositsPaid: 0,
})

export const createAdminDashboardDate = () => getTodayBookingDate()

const normalizeAdminBooking = (booking) => {
  if (!booking || typeof booking !== "object") {
    return null
  }

  const totalPrice = Number(booking.totalPrice || 0)
  const rawRemainingAmount = booking.remainingAmount
  const remainingAmount =
    rawRemainingAmount === null
    || rawRemainingAmount === undefined
    || (typeof rawRemainingAmount === "string" && rawRemainingAmount.trim() === "")
      ? null
      : Number(rawRemainingAmount)
  const paidAmount = Number(booking.paidAmount || booking.payment?.amount || 0)
  const paymentStatus = String(booking.paymentStatus || booking.payment?.status || "").trim().toLowerCase()
  const paymentType = String(
    booking.paymentType
    || booking.payment?.paymentType
    || booking.payment?.type
    || ""
  ).trim().toLowerCase()
  const isPaidPaymentStatus =
    paymentStatus === "paid"
    || paymentStatus === "success"
    || paymentStatus === "succeeded"
    || paymentStatus === "completed"

  return {
    id: String(booking.id || ""),
    fieldId: String(booking.fieldId || booking.field?._id || booking.field?.id || "").trim(),
    fieldName: String(booking.fieldName || "").trim(),
    fieldSlug: String(booking.fieldSlug || "").trim(),
    fieldAddress: String(booking.fieldAddress || "").trim(),
    fieldDistrict: String(booking.fieldDistrict || "").trim(),
    subFieldKey: String(booking.subFieldKey || "").trim(),
    subFieldName: String(booking.subFieldName || "").trim(),
    subFieldType: String(booking.subFieldType || "").trim(),
    date: normalizeBookingDateValue(booking.date),
    timeSlot: String(booking.timeSlot || "").trim(),
    status: String(booking.status || "").trim().toLowerCase(),
    totalPrice,
    depositAmount: Number(booking.depositAmount || 0),
    remainingAmount,
    paidAmount,
    depositPaid: Boolean(booking.depositPaid),
    depositStatus: String(booking.depositStatus || "").trim().toLowerCase(),
    paymentStatus,
    paymentType,
    fullyPaid: Boolean(
      booking.fullyPaidAt
      || String(booking.status || "").trim().toLowerCase() === "completed"
      || (paymentType === "full" && isPaidPaymentStatus && remainingAmount !== null && remainingAmount <= 0)
    ),
    depositMethod: String(booking.depositMethod || "").trim().toLowerCase(),
    depositPaidAt: booking.depositPaidAt || null,
    fullyPaidAt: booking.fullyPaidAt || null,
    note: String(booking.note || "").trim(),
    createdAt: booking.createdAt || null,
    confirmedAt: booking.confirmedAt || null,
    cancelledAt: booking.cancelledAt || null,
    customer: {
      id: String(booking.customer?.id || ""),
      fullName: String(booking.customer?.fullName || "").trim(),
      email: String(booking.customer?.email || "").trim(),
      phone: String(booking.customer?.phone || "").trim(),
      createdAt: booking.customer?.createdAt || null,
    },
  }
}

const normalizeDailyAvailabilityItem = (item) => {
  if (!item || typeof item !== "object") {
    return null
  }

  return {
    id: String(item.id || item._id || item.fieldId || "").trim(),
    name: String(item.name || "").trim(),
    slug: String(item.slug || "").trim(),
    address: String(item.address || "").trim(),
    district: String(item.district || "").trim(),
    openHours: String(item.openHours || "").trim(),
    totalSubFields: Number(item.totalSubFields || 0),
    availableSubFields: Number(item.availableSubFields || 0),
    bookingCount: Number(item.bookingCount || 0),
    subFields: Array.isArray(item.subFields)
      ? item.subFields
        .map((subField) => ({
          key: String(subField?.key || "").trim(),
          name: String(subField?.name || "").trim(),
          type: String(subField?.type || "").trim(),
          pricePerHour: Number(subField?.pricePerHour || 0),
          isAvailable: Boolean(subField?.isAvailable),
          bookings: Array.isArray(subField?.bookings)
            ? subField.bookings.map((booking) => ({
              id: String(booking?.id || ""),
              timeSlot: String(booking?.timeSlot || "").trim(),
              status: String(booking?.status || "").trim().toLowerCase(),
              customerName: String(booking?.customerName || "").trim(),
              phone: String(booking?.phone || "").trim(),
            }))
            : [],
        }))
        .filter((subField) => subField.key && subField.name)
      : [],
  }
}

const normalizeMonthlyCustomerStat = (item) => {
  if (!item || typeof item !== "object") {
    return null
  }

  return {
    monthKey: String(item.monthKey || "").trim(),
    label: String(item.label || "").trim(),
    uniqueCustomers: Number(item.uniqueCustomers || 0),
    bookings: Number(item.bookings || 0),
    confirmedBookings: Number(item.confirmedBookings || 0),
    cancelledBookings: Number(item.cancelledBookings || 0),
    revenue: Number(item.revenue || 0),
  }
}

const normalizeCustomerSummary = (item) => {
  if (!item || typeof item !== "object") {
    return null
  }

  return {
    key: String(item.key || ""),
    id: String(item.id || ""),
    fullName: String(item.fullName || "").trim(),
    email: String(item.email || "").trim(),
    phone: String(item.phone || "").trim(),
    totalBookings: Number(item.totalBookings || 0),
    confirmedBookings: Number(item.confirmedBookings || 0),
    cancelledBookings: Number(item.cancelledBookings || 0),
    totalSpent: Number(item.totalSpent || 0),
    lastBookingAt: item.lastBookingAt || null,
    lastFieldName: String(item.lastFieldName || "").trim(),
    lastTimeSlot: String(item.lastTimeSlot || "").trim(),
    lastDate: String(item.lastDate || "").trim(),
    lastStatus: String(item.lastStatus || "").trim().toLowerCase(),
  }
}

export const getAdminDashboardState = (data) => ({
  stats: {
    ...EMPTY_ADMIN_STATS,
    ...(data?.stats || {}),
  },
  recentBookings: Array.isArray(data?.recentBookings)
    ? data.recentBookings.map(normalizeAdminBooking).filter(Boolean)
    : [],
  managedBookings: Array.isArray(data?.managedBookings)
    ? data.managedBookings.map(normalizeAdminBooking).filter(Boolean)
    : [],
  availabilityDate: normalizeBookingDateValue(
    data?.availabilityDate,
    createAdminDashboardDate()
  ),
  dailyAvailability: Array.isArray(data?.dailyAvailability)
    ? data.dailyAvailability.map(normalizeDailyAvailabilityItem).filter(Boolean)
    : [],
  customerMonthlyStats: Array.isArray(data?.customerMonthlyStats)
    ? data.customerMonthlyStats.map(normalizeMonthlyCustomerStat).filter(Boolean)
    : [],
  customerSummaries: Array.isArray(data?.customerSummaries)
    ? data.customerSummaries.map(normalizeCustomerSummary).filter(Boolean)
    : [],
})
