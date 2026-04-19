import { normalizeFieldType } from "./fieldTypeModel"

const BOOKING_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/
const MONGO_OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i
const MINUTES_PER_DAY = 24 * 60

const padTime = (value) => String(value).padStart(2, "0")

export const normalizeSubFieldKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

export const isMongoObjectId = (value) => MONGO_OBJECT_ID_PATTERN.test(String(value || "").trim())

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

const normalizeTimeRangeMinutes = (startValue, endValue, { allowOvernight = false } = {}) => {
  const startMinutes = Number(startValue)
  const endMinutes = Number(endValue)

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
    return null
  }

  if (endMinutes === startMinutes) {
    return null
  }

  if (endMinutes < startMinutes) {
    if (!allowOvernight) {
      return null
    }

    return {
      startMinutes,
      endMinutes: endMinutes + MINUTES_PER_DAY,
    }
  }

  return {
    startMinutes,
    endMinutes,
  }
}

const normalizeTimelineSlot = (slot, index = 0) => {
  if (!slot || typeof slot !== "object") {
    return null
  }

  const timeSlot = String(slot.timeSlot || slot.label || "").trim()
  const parsedRange = parseTimeSlot(timeSlot, { allowOvernight: true })
  const normalizedRange = normalizeTimeRangeMinutes(slot.startMinutes, slot.endMinutes, {
    allowOvernight: true,
  })

  return {
    ...slot,
    id: normalizeTimeSlotId(slot.id, `slot-${index + 1}`),
    key: normalizeTimeSlotId(slot.id, `slot-${index + 1}`),
    label: String(slot.label || timeSlot || "").trim() || `Khung giờ ${index + 1}`,
    timeSlot,
    startMinutes: normalizedRange ? normalizedRange.startMinutes : parsedRange?.startMinutes ?? null,
    endMinutes: normalizedRange ? normalizedRange.endMinutes : parsedRange?.endMinutes ?? null,
  }
}

export const minutesToTimeLabel = (totalMinutes) => {
  const normalizedMinutes =
    Number.isFinite(Number(totalMinutes))
      ? ((Number(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
      : 0
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  return `${padTime(hours)}:${padTime(minutes)}`
}

export const buildTimeSlotLabel = (startMinutes, endMinutes) =>
  `${minutesToTimeLabel(startMinutes)} - ${minutesToTimeLabel(endMinutes)}`

export const getTodayBookingDate = (now = new Date()) => {
  const localDate = new Date(now)
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
  return localDate.toISOString().slice(0, 10)
}

export const normalizeBookingDateValue = (value, fallback = "") => {
  const normalizedValue = String(value || fallback || "").trim()

  if (!normalizedValue) {
    return ""
  }

  if (BOOKING_DATE_PATTERN.test(normalizedValue)) {
    return normalizedValue
  }

  const matchedDate = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/)
  if (matchedDate) {
    return matchedDate[1]
  }

  const parsedDate = new Date(normalizedValue)
  if (!Number.isNaN(parsedDate.getTime())) {
    const localDate = new Date(parsedDate)
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset())
    return localDate.toISOString().slice(0, 10)
  }

  const fallbackDate = String(fallback || "").trim().match(/^(\d{4}-\d{2}-\d{2})/)
  return fallbackDate ? fallbackDate[1] : String(fallback || "").trim()
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
  timeSlotIds: [],
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

export const parseTimeSlot = (value, { allowOvernight = false } = {}) => {
  const match = String(value || "").trim().match(TIME_SLOT_PATTERN)
  if (!match) {
    return null
  }

  const startMinutes = Number(match[1]) * 60 + Number(match[2])
  const endMinutes = Number(match[3]) * 60 + Number(match[4])

  return normalizeTimeRangeMinutes(startMinutes, endMinutes, { allowOvernight })
}

export const getBookingDurationMinutes = (timeSlot) => {
  const parsed = parseTimeSlot(timeSlot, { allowOvernight: true })
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

export const calculateBookingDepositAmount = (totalPrice) =>
  Math.max(Math.round((Number(totalPrice || 0) * 40) / 100), 0)

export const calculateRemainingPaymentAmount = (totalPrice, depositAmount = 0) =>
  Math.max(Number(totalPrice || 0) - Number(depositAmount || 0), 0)

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

  const parsedTimeSlot = parseTimeSlot(timeSlot, { allowOvernight: true })
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

export const getSelectedTimeSlotIds = (form) => {
  const collectedIds = Array.isArray(form?.timeSlotIds) ? form.timeSlotIds : []
  const normalizedIds = collectedIds
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  if (normalizedIds.length > 0) {
    return normalizedIds
  }

  const fallbackId = String(form?.timeSlotId || "").trim()
  return fallbackId ? [fallbackId] : []
}

export const createFallbackBookingTimeline = (
  openHours = "",
  {
    stepMinutes = 30,
    defaultStartMinutes = 5 * 60,
    defaultEndMinutes = 24 * 60,
  } = {}
) => {
  const parsedOpenHours = parseOpenHours(openHours)
  const startMinutes = parsedOpenHours?.startMinutes ?? defaultStartMinutes
  const endMinutes = parsedOpenHours?.endMinutes ?? defaultEndMinutes

  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    return []
  }

  const timeline = []

  for (let current = startMinutes, index = 0; current < endMinutes; current += stepMinutes, index += 1) {
    const nextMinutes = Math.min(current + stepMinutes, endMinutes)

    timeline.push(
      normalizeTimelineSlot(
        {
          id: `fallback-slot-${index + 1}`,
          label: minutesToTimeLabel(current),
          timeSlot: buildTimeSlotLabel(current, nextMinutes),
          startMinutes: current,
          endMinutes: nextMinutes,
        },
        index
      )
    )
  }

  return timeline.filter(Boolean)
}

const parseOpenHours = (value) => parseTimeSlot(value, { allowOvernight: true })

const isTimeRangeWithinOpenHours = (timeRange, openHours) =>
  [0, -MINUTES_PER_DAY, MINUTES_PER_DAY].some((offset) => {
    const shiftedStart = Number(timeRange.startMinutes) + offset
    const shiftedEnd = Number(timeRange.endMinutes) + offset

    return shiftedStart >= Number(openHours.startMinutes) && shiftedEnd <= Number(openHours.endMinutes)
  })

const normalizeBookingStatusKey = (value) => String(value || "").trim().toLowerCase()

const getBookingHoldExpiryTimestamp = (booking) => {
  const rawValue = String(booking?.holdExpiresAt || booking?.expiredAt || "").trim()
  if (!rawValue) {
    return 0
  }

  const parsedDate = new Date(rawValue)
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime()
}

const isBlockingBooking = (booking, now = new Date()) => {
  const status = normalizeBookingStatusKey(booking?.status)
  if (status === "cancelled" || status === "canceled" || status === "rejected") {
    return false
  }

  if (status !== "pending") {
    return true
  }

  const holdExpiryTimestamp = getBookingHoldExpiryTimestamp(booking)
  return holdExpiryTimestamp <= 0 || holdExpiryTimestamp > now.getTime()
}

const getBookingTimeRange = (booking) => {
  const timeSlotInfo = booking?.timeSlotInfo

  const normalizedRangeFromInfo = normalizeTimeRangeMinutes(
    timeSlotInfo?.startMinutes,
    timeSlotInfo?.endMinutes,
    { allowOvernight: true }
  )
  if (normalizedRangeFromInfo) {
    return normalizedRangeFromInfo
  }

  return parseTimeSlot(
    booking?.timeSlot
    || timeSlotInfo?.timeSlot
    || timeSlotInfo?.label
    || "",
    { allowOvernight: true }
  )
}

const getBookingFieldTokens = (booking) =>
  [
    booking?.fieldId,
    booking?.field?._id,
    booking?.field?.id,
    booking?.fieldName,
    booking?.field?.name,
    booking?.fieldSlug,
    booking?.field?.slug,
    booking?.fieldAddress,
    booking?.field?.address,
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
    field?.slug,
    field?.address,
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
  const normalizedBookingRange = normalizeTimeRangeMinutes(
    bookingRange?.startMinutes,
    bookingRange?.endMinutes,
    { allowOvernight: true }
  )
  const normalizedSlotRange = normalizeTimeRangeMinutes(
    slot?.startMinutes,
    slot?.endMinutes,
    { allowOvernight: true }
  )

  if (!normalizedBookingRange || !normalizedSlotRange) {
    return false
  }

  return [0, -MINUTES_PER_DAY, MINUTES_PER_DAY].some((offset) => {
    const shiftedSlotStart = normalizedSlotRange.startMinutes + offset
    const shiftedSlotEnd = normalizedSlotRange.endMinutes + offset

    return normalizedBookingRange.startMinutes < shiftedSlotEnd
      && normalizedBookingRange.endMinutes > shiftedSlotStart
  })
}

export const buildBookingScheduleRows = ({
  bookings = [],
  field,
  selectedDate,
  selectedSubFieldKey,
  selectedTimeSlotId,
  selectedTimeSlotIds = [],
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
  const normalizedSelectedSlotIds = new Set(
    (Array.isArray(selectedTimeSlotIds) ? selectedTimeSlotIds : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean)
  )
  const relevantBookings = (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      isBlockingBooking(booking, now)
      && normalizeBookingDateValue(booking?.date) === normalizeBookingDateValue(selectedDate)
      && doesBookingMatchField(booking, field)
  )

  return subFields.map((subField) => ({
    field,
    subField,
    slots: (Array.isArray(timeline) ? timeline : []).map((slot) => {
      const slotTimeRange = normalizeTimeRangeMinutes(slot?.startMinutes, slot?.endMinutes, {
        allowOvernight: true,
      })
      const isOutsideOpenHours =
        openHours
        && slotTimeRange
        && !isTimeRangeWithinOpenHours(slotTimeRange, openHours)
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
        && (
          normalizedSelectedSlotIds.has(String(slot.id || "").trim())
          || String(slot.id || "") === String(selectedTimeSlotId || "")
        )

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
  (() => {
    const nextSlots = Array.isArray(slots) ? slots : []
    const selectedIds = Array.isArray(selectedTimeSlotId)
      ? selectedTimeSlotId.map((value) => String(value || "").trim()).filter(Boolean)
      : [String(selectedTimeSlotId || "").trim()].filter(Boolean)

    if (selectedIds.length === 0) {
      return false
    }

    return selectedIds.every((selectedId) =>
      nextSlots.some(
        (slot) =>
          String(slot?.id || "") === selectedId
          && (slot.state === "selected" || slot.state === "available")
      )
    )
  })()

const buildSelectedSlotTimeLabel = (selectedSlots) => {
  const nextSlots = (Array.isArray(selectedSlots) ? selectedSlots : []).filter(Boolean)
  if (nextSlots.length === 0) {
    return ""
  }

  if (nextSlots.length === 1) {
    return String(nextSlots[0].timeSlot || nextSlots[0].label || "").trim()
  }

  const firstSlot = nextSlots[0]
  const lastSlot = nextSlots[nextSlots.length - 1]

  if (
    Number.isFinite(firstSlot?.startMinutes)
    && Number.isFinite(lastSlot?.endMinutes)
  ) {
    return buildTimeSlotLabel(Number(firstSlot.startMinutes), Number(lastSlot.endMinutes))
  }

  return `${String(firstSlot.timeSlot || firstSlot.label || "").trim()} - ${String(lastSlot.timeSlot || lastSlot.label || "").trim()}`
}

const createNextSlotSelection = (form, normalizedSubField, selectedSlots) => {
  const nextSlots = (Array.isArray(selectedSlots) ? selectedSlots : []).filter(Boolean)
  const nextSlotIds = nextSlots
    .map((item) => String(item?.id || "").trim())
    .filter(Boolean)

  if (nextSlotIds.length === 0) {
    return {
      ...form,
      subFieldId: "",
      subFieldKey: "",
      timeSlotId: "",
      timeSlotIds: [],
      timeSlot: "",
    }
  }

  return {
    ...form,
    subFieldId: String(normalizedSubField.id || "").trim(),
    subFieldKey: normalizeSubFieldKey(normalizedSubField.key),
    timeSlotId: nextSlotIds[0],
    timeSlotIds: nextSlotIds,
    timeSlot: buildSelectedSlotTimeLabel(nextSlots),
  }
}

export const applyBookingSlotSelection = (
  form,
  subField,
  slot,
  timelineSlots = [],
  { allowRange = false } = {}
) => {
  const normalizedSubField =
    typeof subField === "object" && subField
      ? subField
      : {
          id: "",
          key: subField,
        }
  const subFieldKey = normalizeSubFieldKey(normalizedSubField.key)
  const timeSlotId = String(slot?.id || "").trim()

  if (!slot || !subFieldKey || !timeSlotId) {
    return form
  }

  const currentSelectedIds = getSelectedTimeSlotIds(form)
  const isSameSelection =
    normalizeSubFieldKey(form.subFieldKey) === subFieldKey
    && currentSelectedIds.length === 1
    && currentSelectedIds[0] === timeSlotId

  if (isSameSelection) {
    return {
      ...form,
      subFieldId: "",
      subFieldKey: "",
      timeSlotId: "",
      timeSlotIds: [],
      timeSlot: "",
    }
  }

  if (!allowRange || normalizeSubFieldKey(form.subFieldKey) !== subFieldKey) {
    return createNextSlotSelection(form, normalizedSubField, [slot])
  }

  const orderedSlots = (Array.isArray(timelineSlots) ? timelineSlots : []).filter(Boolean)
  const clickedIndex = orderedSlots.findIndex((item) => String(item?.id || "") === timeSlotId)
  const selectedIndexes = currentSelectedIds
    .map((selectedId) => orderedSlots.findIndex((item) => String(item?.id || "") === selectedId))
    .filter((index) => index >= 0)

  if (clickedIndex < 0 || selectedIndexes.length === 0) {
    return createNextSlotSelection(form, normalizedSubField, [slot])
  }

  if (currentSelectedIds.includes(timeSlotId)) {
    return createNextSlotSelection(form, normalizedSubField, [slot])
  }

  const anchorIndex = selectedIndexes[0]
  const startIndex = Math.min(anchorIndex, clickedIndex)
  const endIndex = Math.max(anchorIndex, clickedIndex)
  const rangeSlots = orderedSlots.slice(startIndex, endIndex + 1)

  const hasBlockedSlot = rangeSlots.some((item) => item?.disabled)

  if (hasBlockedSlot) {
    return createNextSlotSelection(form, normalizedSubField, [slot])
  }

  return createNextSlotSelection(form, normalizedSubField, rangeSlots)
}

export const formatBookingDateTime = (value) => {
  const normalizedValue = String(value || "").trim()
  if (!normalizedValue) {
    return "--"
  }

  const parsedDate = new Date(normalizedValue)
  return Number.isNaN(parsedDate.getTime()) ? "--" : parsedDate.toLocaleString("vi-VN")
}

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
