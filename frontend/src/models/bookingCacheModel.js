import { calculateBookingTotalPrice, normalizeBookingDateValue } from "./bookingModel"

const KNOWN_BOOKINGS_STORAGE_KEY = "sanbong_known_bookings"

const getBookingIdentity = (booking, index = 0) => {
  const bookingId = String(booking?.id || booking?._id || "").trim()
  if (bookingId) {
    return `id:${bookingId}`
  }

  const compositeParts = [
    booking?.fieldId,
    booking?.subFieldId,
    normalizeBookingDateValue(booking?.date),
    booking?.timeSlotId,
    booking?.timeSlot,
    booking?.phone,
    booking?.createdAt,
    index,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  return compositeParts.length > 0 ? `slot:${compositeParts.join("|")}` : ""
}

export const mergeKnownBookingCollections = (...collections) => {
  const bookingMap = new Map()

  collections.flat().forEach((collection) => {
    ;(Array.isArray(collection) ? collection : []).forEach((booking, index) => {
      if (!booking || typeof booking !== "object") {
        return
      }

      const identity = getBookingIdentity(booking, index)
      if (!identity) {
        return
      }

      const currentValue = bookingMap.get(identity) || {}
      bookingMap.set(identity, {
        ...currentValue,
        ...booking,
      })
    })
  })

  return Array.from(bookingMap.values())
}

export const getStoredKnownBookings = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(KNOWN_BOOKINGS_STORAGE_KEY)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue)
      ? parsedValue
        .filter(Boolean)
        .map((booking) => ({
          ...booking,
          date: normalizeBookingDateValue(booking?.date),
        }))
      : []
  } catch (_error) {
    return []
  }
}

export const persistKnownBookings = (bookings = []) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return Array.isArray(bookings) ? bookings : []
  }

  const nextBookings = mergeKnownBookingCollections(
    (Array.isArray(bookings) ? bookings : []).filter((booking) => {
      const status = String(booking?.status || "").trim().toLowerCase()
      return status !== "cancelled" && status !== "canceled"
    })
  )

  try {
    if (nextBookings.length === 0) {
      window.localStorage.removeItem(KNOWN_BOOKINGS_STORAGE_KEY)
    } else {
      window.localStorage.setItem(KNOWN_BOOKINGS_STORAGE_KEY, JSON.stringify(nextBookings))
    }
  } catch (_error) {
    return nextBookings
  }

  return nextBookings
}

export const createLocalBookingRecord = ({
  booking = null,
  field = null,
  subField = null,
  slot = null,
  date = "",
  phone = "",
  note = "",
  currentUser = null,
  status = "CONFIRMED",
}) => {
  const normalizedFieldId = String(booking?.fieldId || field?.id || field?._id || "").trim()
  const normalizedSubFieldId = String(booking?.subFieldId || subField?.id || subField?._id || "").trim()
  const normalizedTimeSlotId = String(booking?.timeSlotId || slot?.id || "").trim()
  const normalizedDate = normalizeBookingDateValue(booking?.date || date)
  const normalizedTimeSlot = String(
    booking?.timeSlot
    || booking?.timeSlotLabel
    || slot?.timeSlot
    || slot?.label
    || ""
  ).trim()
  const normalizedPhone = String(booking?.phone || phone || currentUser?.phone || "").trim()
  const normalizedNote = String(booking?.note || note || "").trim()
  const normalizedStatus = String(booking?.status || status || "CONFIRMED").trim()
  const createdAt = booking?.createdAt || new Date().toISOString()
  const totalPrice =
    Number(booking?.totalPrice || 0)
    || calculateBookingTotalPrice(subField?.pricePerHour || field?.pricePerHour, normalizedTimeSlot)

  return {
    ...booking,
    id:
      String(booking?.id || booking?._id || "").trim()
      || `local:${normalizedFieldId}:${normalizedSubFieldId}:${normalizedDate}:${normalizedTimeSlotId || normalizedTimeSlot}`,
    _id:
      String(booking?._id || booking?.id || "").trim()
      || `local:${normalizedFieldId}:${normalizedSubFieldId}:${normalizedDate}:${normalizedTimeSlotId || normalizedTimeSlot}`,
    fieldId: normalizedFieldId,
    fieldName: String(booking?.fieldName || field?.name || "").trim(),
    fieldSlug: String(booking?.fieldSlug || field?.slug || "").trim(),
    fieldAddress: String(booking?.fieldAddress || field?.address || "").trim(),
    fieldDistrict: String(booking?.fieldDistrict || field?.district || "").trim(),
    fieldOwnerPhone: String(
      booking?.fieldOwnerPhone
      || booking?.field?.ownerPhone
      || booking?.field?.owner?.phone
      || field?.ownerPhone
      || field?.owner?.phone
      || ""
    ).trim(),
    subFieldId: normalizedSubFieldId,
    subFieldKey: String(booking?.subFieldKey || subField?.key || "").trim(),
    subFieldName: String(booking?.subFieldName || subField?.name || "").trim(),
    subFieldType: String(booking?.subFieldType || subField?.type || field?.type || "").trim(),
    timeSlotId: normalizedTimeSlotId,
    timeSlot: normalizedTimeSlot,
    timeSlotInfo: booking?.timeSlotInfo || slot || null,
    date: normalizedDate,
    phone: normalizedPhone,
    note: normalizedNote,
    status: normalizedStatus,
    totalPrice,
    createdAt,
    customer: {
      id: String(booking?.customer?.id || currentUser?.id || currentUser?._id || "").trim(),
      fullName: String(
        booking?.customer?.fullName || currentUser?.fullName || currentUser?.name || ""
      ).trim(),
      email: String(booking?.customer?.email || currentUser?.email || "").trim(),
      phone: String(booking?.customer?.phone || normalizedPhone || "").trim(),
    },
  }
}
