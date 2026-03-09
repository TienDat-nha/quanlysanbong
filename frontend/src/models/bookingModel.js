import { normalizeFieldType } from "./fieldTypeModel"

const BOOKING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/
const BLOCKING_BOOKING_STATUSES = new Set(["pending", "confirmed"])

const GRID_START_MINUTES = 5 * 60
const GRID_END_MINUTES = 22 * 60
const GRID_INTERVAL_MINUTES = 30
export const MINIMUM_BOOKING_DEPOSIT = 100000

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
        const key = normalizeSubFieldKey(subField.key || name)

        if (!key || !name) {
          return null
        }

        return {
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
  subFieldKey: "",
  date,
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

export const calculateBookingDepositAmount = (totalPrice) => {
  const normalizedTotal = Math.max(Number(totalPrice || 0), 0)
  if (!normalizedTotal) {
    return 0
  }

  return Math.min(normalizedTotal, MINIMUM_BOOKING_DEPOSIT)
}

export const calculateRemainingPaymentAmount = (
  totalPrice,
  depositAmount = calculateBookingDepositAmount(totalPrice)
) => Math.max(Number(totalPrice || 0) - Number(depositAmount || 0), 0)

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

const parseOpenHours = (value) => {
  const match = String(value || "").trim().match(TIME_SLOT_PATTERN)
  if (!match) {
    return null
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2])
  let endMinutes = Number(match[3]) * 60 + Number(match[4])

  if (endMinutes === 0) {
    endMinutes = 24 * 60
  }

  if (endMinutes <= startMinutes) {
    return null
  }

  return {
    startMinutes,
    endMinutes,
  }
}

const isSameDate = (leftDate, rightDate) =>
  Boolean(leftDate)
  && Boolean(rightDate)
  && leftDate.getTime() === rightDate.getTime()

const doesTimeSlotOverlap = (leftTimeSlot, rightTimeSlot) => {
  const left = parseTimeSlot(leftTimeSlot)
  const right = parseTimeSlot(rightTimeSlot)

  if (!left || !right) {
    return false
  }

  return left.startMinutes < right.endMinutes && right.startMinutes < left.endMinutes
}

export const validateBookingForm = (form, now = new Date()) => {
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
  if (isSameDate(bookingDate, today) && parsedTimeSlot.startMinutes <= currentMinutes) {
    return "Khung giờ đặt sân phải ở tương lai."
  }

  return ""
}

export const buildBookingPayload = (form) => ({
  fieldId: Number(form.fieldId),
  subFieldKey: normalizeSubFieldKey(form.subFieldKey),
  date: form.date,
  timeSlot: form.timeSlot,
  phone: normalizePhoneNumber(form.phone),
  note: form.note,
})

export const createBookingTimeline = (
  startMinutes = GRID_START_MINUTES,
  endMinutes = GRID_END_MINUTES,
  intervalMinutes = GRID_INTERVAL_MINUTES
) => {
  const slots = []

  for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += intervalMinutes) {
    const slotEndMinutes = currentMinutes + intervalMinutes
    slots.push({
      key: `${currentMinutes}-${slotEndMinutes}`,
      label: minutesToTimeLabel(currentMinutes),
      timeSlot: buildTimeSlotLabel(currentMinutes, slotEndMinutes),
      startMinutes: currentMinutes,
      endMinutes: slotEndMinutes,
    })
  }

  return slots
}

const isBlockingBooking = (booking) =>
  BLOCKING_BOOKING_STATUSES.has(String(booking?.status || "").trim().toLowerCase())

const doesBookingBlockSubField = (booking, subFieldKey) => {
  const bookingSubFieldKey = normalizeSubFieldKey(booking?.subFieldKey)
  return !bookingSubFieldKey || bookingSubFieldKey === normalizeSubFieldKey(subFieldKey)
}

export const buildBookingScheduleRows = ({
  field,
  availabilityBookings,
  selectedDate,
  selectedSubFieldKey,
  selectedTimeSlot,
  timeline,
  now = new Date(),
}) => {
  if (!field) {
    return []
  }

  const subFields = normalizeSubFields(field)
  const bookingDate = parseBookingDate(selectedDate)
  const selectedRange = parseTimeSlot(selectedTimeSlot)
  const normalizedSelectedSubFieldKey = normalizeSubFieldKey(selectedSubFieldKey)
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const openHours = parseOpenHours(field.openHours)

  return subFields.map((subField) => {
    const subFieldBookings = availabilityBookings.filter(
      (booking) =>
        Number(booking.fieldId) === Number(field.id)
        && isBlockingBooking(booking)
        && doesBookingBlockSubField(booking, subField.key)
    )

    return {
      field,
      subField,
      slots: timeline.map((slot) => {
        const isClosed =
          !openHours
          || slot.startMinutes < openHours.startMinutes
          || slot.endMinutes > openHours.endMinutes
        const isPast =
          Boolean(bookingDate)
          && isSameDate(bookingDate, today)
          && slot.startMinutes <= currentMinutes
        const isBooked = subFieldBookings.some((booking) =>
          doesTimeSlotOverlap(slot.timeSlot, booking.timeSlot)
        )
        const isSelected =
          normalizedSelectedSubFieldKey === subField.key
          && Boolean(selectedRange)
          && slot.startMinutes >= selectedRange.startMinutes
          && slot.endMinutes <= selectedRange.endMinutes
          && !isClosed
          && !isPast
          && !isBooked

        let state = "available"
        if (isClosed) {
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
          state,
          disabled: state !== "available" && state !== "selected",
        }
      }),
    }
  })
}

export const isSelectedTimeSlotStillAvailable = (slots, selectedTimeSlot) => {
  const selectedRange = parseTimeSlot(selectedTimeSlot)
  if (!selectedRange) {
    return false
  }

  const selectedSlots = slots.filter(
    (slot) =>
      slot.startMinutes >= selectedRange.startMinutes
      && slot.endMinutes <= selectedRange.endMinutes
  )
  const expectedSlotCount =
    (selectedRange.endMinutes - selectedRange.startMinutes) / GRID_INTERVAL_MINUTES

  return (
    selectedSlots.length === expectedSlotCount
    && selectedSlots.every((slot) => slot.state === "selected")
  )
}

export const applyBookingSlotSelection = (form, subFieldKey, slot) => {
  const normalizedSubFieldKey = normalizeSubFieldKey(subFieldKey)
  const currentRange =
    normalizeSubFieldKey(form.subFieldKey) === normalizedSubFieldKey
      ? parseTimeSlot(form.timeSlot)
      : null

  if (!slot || !normalizedSubFieldKey) {
    return form
  }

  if (!currentRange) {
    return {
      ...form,
      subFieldKey: normalizedSubFieldKey,
      timeSlot: slot.timeSlot,
    }
  }

  const isInsideCurrentRange =
    slot.startMinutes >= currentRange.startMinutes
    && slot.endMinutes <= currentRange.endMinutes
  const isAdjacentLeft = slot.endMinutes === currentRange.startMinutes
  const isAdjacentRight = slot.startMinutes === currentRange.endMinutes

  if (isAdjacentLeft) {
    return {
      ...form,
      subFieldKey: normalizedSubFieldKey,
      timeSlot: buildTimeSlotLabel(slot.startMinutes, currentRange.endMinutes),
    }
  }

  if (isAdjacentRight) {
    return {
      ...form,
      subFieldKey: normalizedSubFieldKey,
      timeSlot: buildTimeSlotLabel(currentRange.startMinutes, slot.endMinutes),
    }
  }

  if (isInsideCurrentRange) {
    const isSingleSelectedSlot =
      slot.startMinutes === currentRange.startMinutes
      && slot.endMinutes === currentRange.endMinutes

    if (isSingleSelectedSlot) {
      return {
        ...form,
        subFieldKey: "",
        timeSlot: "",
      }
    }

    if (slot.startMinutes === currentRange.startMinutes) {
      return {
        ...form,
        subFieldKey: normalizedSubFieldKey,
        timeSlot: buildTimeSlotLabel(slot.endMinutes, currentRange.endMinutes),
      }
    }

    if (slot.endMinutes === currentRange.endMinutes) {
      return {
        ...form,
        subFieldKey: normalizedSubFieldKey,
        timeSlot: buildTimeSlotLabel(currentRange.startMinutes, slot.startMinutes),
      }
    }

    return form
  }

  return {
    ...form,
    subFieldKey: normalizedSubFieldKey,
    timeSlot: slot.timeSlot,
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
      return "Đã hủy"
    default:
      return value || ""
  }
}

export const formatDepositStatus = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "paid":
      return "Đã đặt cọc"
    case "pending":
      return "Đang chờ thanh toán"
    case "failed":
      return "Thanh toán thất bại"
    case "unpaid":
      return "Chưa đặt cọc"
    default:
      return value || ""
  }
}

export const formatDepositMethod = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "static_transfer":
      return "Chuyển khoản / QR tĩnh"
    case "vnpay":
      return "VNPAY"
    case "momo":
      return "MoMo"
    default:
      return value || ""
  }
}
