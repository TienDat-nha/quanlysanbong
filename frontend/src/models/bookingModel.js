import { normalizeFieldType } from "./fieldTypeModel"

const BOOKING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/

const padTime = (value) => String(value).padStart(2, "0")

export const normalizeSubFieldKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const normalizeSubFields = (field) => {
  if (!Array.isArray(field?.subFields)) {
    return []
  }

  return field.subFields
    .map((subField, index) => {
      if (typeof subField === "string") {
        const key = normalizeSubFieldKey(subField)
        return key
          ? {
              id: key,
              key,
              name: subField,
              type: normalizeFieldType(field?.type, String(field?.type || "").trim()),
              pricePerHour: Number(field?.pricePerHour || 0),
              openHours: String(field?.openHours || "").trim(),
            }
          : null
      }

      if (subField && typeof subField === "object") {
        const fallbackName = `Sân ${index + 1}`
        const name = String(subField.name || fallbackName).trim()
        const key = normalizeSubFieldKey(subField.key || subField.id || name)

        if (!key || !name) {
          return null
        }

        return {
          ...subField,
          id: String(subField.id || subField._id || key).trim() || key,
          key,
          name,
          type: normalizeFieldType(
            subField.type,
            normalizeFieldType(field?.type, String(field?.type || "").trim())
          ),
          pricePerHour: Number(subField.pricePerHour || field?.pricePerHour || 0),
          openHours: String(subField.openHours || field?.openHours || "").trim(),
        }
      }

      return null
    })
    .filter(Boolean)
}

const normalizeTimeSlotId = (value, fallback = "") => String(value || fallback || "").trim()

const normalizeTimelineSlot = (slot, index = 0) => {
  if (!slot || typeof slot !== "object") {
    return null
  }

  const timeSlot = String(slot.timeSlot || slot.label || "").trim()
  const parsedRange = parseTimeSlot(timeSlot)

  return {
    ...slot,
    id: normalizeTimeSlotId(slot.id, `slot-${index + 1}`),
    key: normalizeTimeSlotId(slot.id, `slot-${index + 1}`),
    label: String(slot.label || timeSlot || "").trim() || `Khung gio ${index + 1}`,
    timeSlot,
    startMinutes:
      Number.isFinite(Number(slot.startMinutes))
        ? Number(slot.startMinutes)
        : parsedRange?.startMinutes ?? null,
    endMinutes:
      Number.isFinite(Number(slot.endMinutes))
        ? Number(slot.endMinutes)
        : parsedRange?.endMinutes ?? null,
  }
}

export const minutesToTimeLabel = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${padTime(hours)}:${padTime(minutes)}`
}

export const buildTimeSlotLabel = (startMinutes, endMinutes) =>
  `${minutesToTimeLabel(startMinutes)} - ${minutesToTimeLabel(endMinutes)}`

export const getTodayBookingDate = (now = new Date()) => {
  const localDate = new Date(now)
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
  return localDate.toISOString().slice(0, 10)
}

export const createBookingForm = (
  fieldId = "",
  date = getTodayBookingDate()
) => ({
  fieldId,
  subFieldId: "",
  subFieldKey: "",
  date,
  timeSlotId: "",
  timeSlot: "",
  phone: "",
  confirmPhone: "",
  note: "",
})

export const createFeedbackState = () => ({
  type: "",
  text: "",
})

export const normalizePhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D/g, "")

  if (digits.startsWith("84") && digits.length === 11) {
    return `0${digits.slice(2)}`
  }

  return digits
}

export const isValidPhoneNumber = (value) => /^0\d{9}$/.test(normalizePhoneNumber(value))

export const parseBookingDate = (value) => {
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

export const parseTimeSlot = (value) => {
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

export const getBookingDurationMinutes = (timeSlot) => {
  const parsed = parseTimeSlot(timeSlot)
  if (!parsed) {
    return 0
  }

  return parsed.endMinutes - parsed.startMinutes
}

export const formatBookingDurationLabel = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h${String(minutes).padStart(2, "0")}`
}

export const calculateBookingTotalPrice = (pricePerHour, timeSlot) => {
  const totalMinutes = getBookingDurationMinutes(timeSlot)
  return Math.round((Number(pricePerHour || 0) * totalMinutes) / 60)
}

export const calculateBookingDepositAmount = (totalPrice) => Math.max(Number(totalPrice || 0), 0)

export const calculateRemainingPaymentAmount = (_totalPrice, _depositAmount = 0) => 0

export const formatBookingDateLabel = (value) => {
  if (!value) {
    return ""
  }

  const parts = String(value).split("-")
  if (parts.length !== 3) {
    return value
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export const formatCompactTimeSlot = (value) =>
  String(value || "")
    .replace(/:/g, "h")
    .replace(/\s*-\s*/g, " - ")

export const validateBookingForm = (form, now = new Date()) => {
  const fieldId = String(form.fieldId || "").trim()
  const subFieldId = String(form.subFieldId || "").trim()
  const date = String(form.date || "").trim()
  const timeSlotId = String(form.timeSlotId || "").trim()
  const timeSlot = String(form.timeSlot || "").trim()
  const phone = String(form.phone || "").trim()
  const confirmPhone = String(form.confirmPhone || "").trim()

  if (!fieldId || !subFieldId || !date || !timeSlotId || !timeSlot || !phone || !confirmPhone) {
    return "Vui lòng chọn sân, khung giờ và nhập đầy đủ thông tin."
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

export const buildBookingPayload = (form) => ({
  fieldId: String(form.fieldId || "").trim(),
  subFieldId: String(form.subFieldId || "").trim(),
  timeSlotId: String(form.timeSlotId || "").trim(),
  date: String(form.date || "").trim(),
  phone: normalizePhoneNumber(form.phone),
  note: String(form.note || "").trim(),
})

export const createBookingTimeline = (timeSlots = []) =>
  (Array.isArray(timeSlots) ? timeSlots : [])
    .map((slot, index) => normalizeTimelineSlot(slot, index))
    .filter(Boolean)

const parseOpenHours = (value) => parseTimeSlot(value)

const normalizeBookingStatusKey = (value) => String(value || "").trim().toLowerCase()

const isBlockingBooking = (booking) => {
  const status = normalizeBookingStatusKey(booking?.status)
  return status !== "cancelled" && status !== "canceled" && status !== "rejected"
}

const getBookingTimeRange = (booking) => {
  const timeSlotInfo = booking?.timeSlotInfo

  if (
    Number.isFinite(Number(timeSlotInfo?.startMinutes))
    && Number.isFinite(Number(timeSlotInfo?.endMinutes))
  ) {
    return {
      startMinutes: Number(timeSlotInfo.startMinutes),
      endMinutes: Number(timeSlotInfo.endMinutes),
    }
  }

  return parseTimeSlot(
    booking?.timeSlot
    || timeSlotInfo?.timeSlot
    || timeSlotInfo?.label
    || ""
  )
}

const getBookingFieldTokens = (booking) =>
  [
    booking?.fieldId,
    booking?.field?._id,
    booking?.field?.id,
    booking?.fieldName,
    booking?.field?.name,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

const getBookingSubFieldTokens = (booking) =>
  [
    booking?.subFieldId,
    booking?.subField?._id,
    booking?.subField?.id,
    booking?.subFieldName,
    booking?.subField?.name,
    booking?.subField?.key,
  ]
    .map((value) => normalizeSubFieldKey(value))
    .filter(Boolean)

const doesBookingMatchField = (booking, field) => {
  const bookingTokens = getBookingFieldTokens(booking)
  const fieldTokens = [
    field?.id,
    field?._id,
    field?.name,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

  if (bookingTokens.length === 0 || fieldTokens.length === 0) {
    return false
  }

  return fieldTokens.some((token) => bookingTokens.includes(token))
}

const doesBookingMatchSubField = (booking, subField) => {
  const bookingTokens = getBookingSubFieldTokens(booking)
  const subFieldTokens = [
    subField?.id,
    subField?._id,
    subField?.key,
    subField?.name,
  ]
    .map((value) => normalizeSubFieldKey(value))
    .filter(Boolean)

  if (bookingTokens.length === 0 || subFieldTokens.length === 0) {
    return false
  }

  return subFieldTokens.some((token) => bookingTokens.includes(token))
}

const doesTimeRangesOverlap = (bookingRange, slot) => {
  if (
    !bookingRange
    || !Number.isFinite(bookingRange.startMinutes)
    || !Number.isFinite(bookingRange.endMinutes)
    || !Number.isFinite(slot?.startMinutes)
    || !Number.isFinite(slot?.endMinutes)
  ) {
    return false
  }

  return bookingRange.startMinutes < slot.endMinutes && bookingRange.endMinutes > slot.startMinutes
}

export const buildBookingScheduleRows = ({
  bookings = [],
  field,
  selectedDate,
  selectedSubFieldKey,
  selectedTimeSlotId,
  timeline,
  now = new Date(),
}) => {
  if (!field) {
    return []
  }

  const subFields = normalizeSubFields(field)
  const bookingDate = parseBookingDate(selectedDate)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openHours = parseOpenHours(field.openHours)
  const normalizedSelectedSubFieldKey = normalizeSubFieldKey(selectedSubFieldKey)
  const relevantBookings = (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      isBlockingBooking(booking)
      && String(booking?.date || "").trim() === String(selectedDate || "").trim()
      && doesBookingMatchField(booking, field)
  )

  return subFields.map((subField) => ({
    field,
    subField,
    slots: (Array.isArray(timeline) ? timeline : []).map((slot) => {
      const isOutsideOpenHours =
        openHours
        && Number.isFinite(slot.startMinutes)
        && Number.isFinite(slot.endMinutes)
        && (slot.startMinutes < openHours.startMinutes || slot.endMinutes > openHours.endMinutes)
      const isPast =
        Boolean(bookingDate)
        && bookingDate.getTime() === today.getTime()
        && Number.isFinite(slot.startMinutes)
        && slot.startMinutes <= currentMinutes
      const matchedBooking =
        relevantBookings.find((booking) => {
          if (!doesBookingMatchSubField(booking, subField)) {
            return false
          }

          const bookingTimeSlotId = String(booking?.timeSlotId || "").trim()
          if (bookingTimeSlotId && bookingTimeSlotId === String(slot.id || "").trim()) {
            return true
          }

          return doesTimeRangesOverlap(getBookingTimeRange(booking), slot)
        }) || null
      const isBooked = Boolean(matchedBooking)
      const isSelected =
        !isBooked
        &&
        normalizedSelectedSubFieldKey === normalizeSubFieldKey(subField.key)
        && String(slot.id || "") === String(selectedTimeSlotId || "")

      let state = "available"
      if (isOutsideOpenHours) {
        state = "closed"
      } else if (isPast) {
        state = "past"
      } else if (isBooked) {
        state = "booked"
      } else if (isSelected) {
        state = "selected"
      }

      return {
        ...slot,
        booking: matchedBooking,
        state,
        disabled: state === "closed" || state === "past" || state === "booked",
      }
    }),
  }))
}

export const isSelectedTimeSlotStillAvailable = (slots, selectedTimeSlotId) =>
  (Array.isArray(slots) ? slots : []).some(
    (slot) =>
      String(slot?.id || "") === String(selectedTimeSlotId || "")
      && (slot.state === "selected" || slot.state === "available")
  )

export const applyBookingSlotSelection = (form, subField, slot) => {
  const normalizedSubField =
    typeof subField === "object" && subField
      ? subField
      : {
          id: "",
          key: subField,
        }
  const subFieldKey = normalizeSubFieldKey(normalizedSubField.key)
  const subFieldId = String(normalizedSubField.id || "").trim()
  const timeSlotId = String(slot?.id || "").trim()

  if (!slot || !subFieldKey || !timeSlotId) {
    return form
  }

  const isSameSelection =
    normalizeSubFieldKey(form.subFieldKey) === subFieldKey
    && String(form.timeSlotId || "") === timeSlotId

  if (isSameSelection) {
    return {
      ...form,
      subFieldId: "",
      subFieldKey: "",
      timeSlotId: "",
      timeSlot: "",
    }
  }

  return {
    ...form,
    subFieldId,
    subFieldKey,
    timeSlotId,
    timeSlot: String(slot.timeSlot || slot.label || "").trim(),
  }
}

export const formatBookingDateTime = (value) => new Date(value).toLocaleString("vi-VN")

export const formatBookingStatus = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "pending":
      return "Chờ xác nhận"
    case "confirmed":
      return "Đã xác nhận"
    case "cancelled":
    case "canceled":
      return "Đã hủy"
    default:
      return value || ""
  }
}

export const formatDepositStatus = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "paid":
      return "Đã thanh toán"
    case "pending":
      return "Chờ thanh toán"
    case "cancelled":
    case "canceled":
      return "Đã hủy"
    default:
      return value || ""
  }
}

export const formatDepositMethod = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "cash":
      return "Tiền mặt"
    case "qr":
      return "QR"
    default:
      return value || ""
  }
}
