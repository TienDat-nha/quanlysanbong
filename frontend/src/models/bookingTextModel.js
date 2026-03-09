const BOOKING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/

const normalizeSubFieldKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const normalizePhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "")

  if (digits.startsWith("84") && digits.length === 11) {
    return `0${digits.slice(2)}`
  }

  return digits
}

const isValidPhoneNumber = (value) => /^0\d{9}$/.test(normalizePhoneNumber(value))

const parseBookingDate = (value) => {
  const normalized = String(value || "").trim()
  if (!BOOKING_DATE_PATTERN.test(normalized)) {
    return null
  }

  const [year, month, day] = normalized.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null
  }

  return date
}

const parseTimeSlot = (value) => {
  const match = String(value || "").trim().match(TIME_SLOT_PATTERN)
  if (!match) {
    return null
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2])
  const endMinutes = Number(match[3]) * 60 + Number(match[4])

  if (endMinutes <= startMinutes) {
    return null
  }

  return {
    startMinutes,
    endMinutes,
  }
}

export const validateBookingFormVi = (form, now = new Date()) => {
  const fieldId = Number(form.fieldId)
  const subFieldKey = normalizeSubFieldKey(form.subFieldKey)
  const date = String(form.date || "").trim()
  const timeSlot = String(form.timeSlot || "").trim()
  const phone = String(form.phone || "").trim()
  const confirmPhone = String(form.confirmPhone || "").trim()

  if (
    !Number.isInteger(fieldId)
    || fieldId <= 0
    || !subFieldKey
    || !date
    || !timeSlot
    || !phone
    || !confirmPhone
  ) {
    return "Vui lòng chọn sân, ô lịch và nhập đầy đủ thông tin."
  }

  if (!isValidPhoneNumber(phone)) {
    return "Số điện thoại không hợp lệ."
  }

  if (normalizePhoneNumber(phone) !== normalizePhoneNumber(confirmPhone)) {
    return "Số điện thoại xác nhận không khớp."
  }

  const bookingDate = parseBookingDate(date)
  if (!bookingDate) {
    return "Ngày đặt không hợp lệ."
  }

  const parsedTimeSlot = parseTimeSlot(timeSlot)
  if (!parsedTimeSlot) {
    return "Khung giờ phải theo định dạng HH:mm - HH:mm."
  }

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  if (bookingDate.getTime() < today.getTime()) {
    return "Không thể đặt lịch trong ngày đã qua."
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  if (bookingDate.getTime() === today.getTime() && parsedTimeSlot.startMinutes <= currentMinutes) {
    return "Khung giờ đặt sân phải ở tương lai."
  }

  return ""
}

export const formatBookingStatusVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "pending":
      return "Chờ xác nhận"
    case "confirmed":
      return "Đã xác nhận"
    case "cancelled":
      return "Đã hủy"
    default:
      return value || ""
  }
}

export const formatDepositStatusVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "paid":
      return "Đã xác nhận đặt cọc"
    case "pending":
      return "Chờ xác nhận thanh toán"
    case "failed":
      return "Thanh toán thất bại"
    case "unpaid":
      return "Chưa đặt cọc"
    default:
      return value || ""
  }
}

export const formatPaymentStatusVi = (paymentStatus, depositStatus = "") => {
  switch (String(paymentStatus || "").trim().toLowerCase()) {
    case "paid":
      return "Đã thanh toán đủ"
    case "deposit_paid":
      return "Đã xác nhận đặt cọc"
    case "pending":
      return "Chờ quản lý xác nhận"
    case "failed":
      return "Thanh toán thất bại"
    case "unpaid":
      return "Chưa thanh toán"
    default:
      return formatDepositStatusVi(depositStatus || paymentStatus)
  }
}

export const formatDepositMethodVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "static_transfer":
      return "Chuyển khoản / QR tĩnh"
    case "vnpay":
      return "VNPAY"
    case "momo":
      return "MoMo"
    case "admin_confirmed":
      return "Quản lý xác nhận"
    default:
      return value || ""
  }
}
