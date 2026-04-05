import { normalizeFieldType } from "./fieldTypeModel"
import { normalizeBookingDateValue } from "./bookingModel"

const normalizeApiBaseUrl = (value) => String(value || "").trim().replace(/\/+$/g, "")

const isLocalHostname = (hostname = "") =>
  hostname === "localhost"
  || hostname === "127.0.0.1"
  || hostname === "::1"
  || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)

const ensureApiBaseUrl = (value) => {
  const normalizedValue = normalizeApiBaseUrl(value)

  if (!normalizedValue) {
    return ""
  }

  try {
    const parsedUrl = new URL(normalizedValue)
    const pathname = String(parsedUrl.pathname || "").replace(/\/+$/g, "")
    parsedUrl.pathname = pathname.toLowerCase().endsWith("/api")
      ? pathname
      : `${pathname || ""}/api`
    return normalizeApiBaseUrl(parsedUrl.toString())
  } catch (_error) {
    return normalizedValue.toLowerCase().endsWith("/api")
      ? normalizedValue
      : `${normalizedValue}/api`
  }
}

const getDefaultApiOrigin = () => {
  const hostname = typeof window !== "undefined" ? String(window.location.hostname || "").trim() : ""
  const isLocalHost = isLocalHostname(hostname)

  if (isLocalHost) {
    return `http://${hostname || "localhost"}:5555`
  }

  return "https://api-be-football.onrender.com"
}

const API_BASE_URL = ensureApiBaseUrl(process.env.REACT_APP_API_URL || getDefaultApiOrigin())
const API_BASE_URL_CANDIDATES = (() => {
  const candidates = new Set()
  const configuredApiBaseUrl = ensureApiBaseUrl(process.env.REACT_APP_API_URL || "")
  const defaultApiBaseUrl = ensureApiBaseUrl(getDefaultApiOrigin())

  if (configuredApiBaseUrl) {
    candidates.add(configuredApiBaseUrl)
  }

  if (defaultApiBaseUrl) {
    candidates.add(defaultApiBaseUrl)
  }

  if (typeof window !== "undefined") {
    const hostname = String(window.location.hostname || "").trim()
    if (isLocalHostname(hostname)) {
      candidates.add(ensureApiBaseUrl(`http://${hostname || "localhost"}:5555`))
      candidates.add(ensureApiBaseUrl(`http://${hostname || "localhost"}:5000`))
    }
  }

  return Array.from(candidates).filter(Boolean)
})()
const CONFIGURED_FIELD_IDS = String(process.env.REACT_APP_FIELD_IDS || "")
  .split(",")
  .map((value) => String(value || "").trim())
  .filter(Boolean)
const REGISTER_PATHS = ["/user/register"]
const LOGIN_PATHS = ["/user/login"]
const GET_ME_PATHS = ["/user/getMe"]
const SEND_OTP_PATHS = ["/user/sendOtp"]
const VERIFY_OTP_PATHS = ["/user/verifyOtp"]
const BOOKING_BY_ID_PATHS = (bookingId) => [
  `/booking/getBooking/${encodeURIComponent(String(bookingId || "").trim())}`,
]
const BOOKING_CREATE_PATHS = ["/booking/createBooking"]
const BOOKING_MY_LIST_PATHS = ["/booking/getMyBookings"]
const BOOKING_CANCEL_PATHS = (bookingId) => [
  `/booking/cancelBooking/${encodeURIComponent(String(bookingId || "").trim())}`,
]
const BOOKING_CONFIRM_PATHS = (bookingId) => [
  `/booking/updateStatus/${encodeURIComponent(String(bookingId || "").trim())}`,
]
const BOOKED_SLOT_PATHS = (subFieldId, date) => [
  `/booking/getBookedSlots?subFieldId=${encodeURIComponent(String(subFieldId || "").trim())}&date=${encodeURIComponent(String(date || "").trim())}`,
]
const BOOKING_DASHBOARD_PATHS = (params = {}) => {
  const searchParams = new URLSearchParams()
  const normalizedDate = String(params?.date || "").trim()
  const months = Number.parseInt(String(params?.months || "").trim(), 10)
  const recentLimit = Number.parseInt(String(params?.recentLimit || "").trim(), 10)
  const managedLimit = Number.parseInt(String(params?.managedLimit || "").trim(), 10)

  if (normalizedDate) {
    searchParams.set("date", normalizedDate)
  }

  if (Number.isFinite(months) && months > 0) {
    searchParams.set("months", String(months))
  }

  if (Number.isFinite(recentLimit) && recentLimit > 0) {
    searchParams.set("recentLimit", String(recentLimit))
  }

  if (Number.isFinite(managedLimit) && managedLimit > 0) {
    searchParams.set("managedLimit", String(managedLimit))
  }

  const queryString = searchParams.toString()
  return [`/booking/getDashboard${queryString ? `?${queryString}` : ""}`]
}
const KNOWN_FIELD_IDS_STORAGE_KEY = "sanbong_known_field_ids"
const FIELD_SNAPSHOTS_STORAGE_KEY = "sanbong_field_snapshots"
const DEFAULT_BOOKING_HOLD_MINUTES = 5

const isManagedUserOtpConfigured = () => true

const getManagedUserOtpConfigMessage = () =>
  "OTP email được xử lý bởi backend."

const buildUniqueStringList = (values = []) => {
  const uniqueValues = new Set()

  ;(Array.isArray(values) ? values : [values]).forEach((value) => {
    const normalizedValue = String(value || "").trim()
    if (normalizedValue) {
      uniqueValues.add(normalizedValue)
    }
  })

  return Array.from(uniqueValues)
}

const getStoredKnownFieldIds = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(KNOWN_FIELD_IDS_STORAGE_KEY)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    return buildUniqueStringList(parsedValue)
  } catch (_error) {
    return []
  }
}

const setStoredKnownFieldIds = (fieldIds = []) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return []
  }

  const nextFieldIds = buildUniqueStringList(fieldIds)

  try {
    if (nextFieldIds.length === 0) {
      window.localStorage.removeItem(KNOWN_FIELD_IDS_STORAGE_KEY)
    } else {
      window.localStorage.setItem(KNOWN_FIELD_IDS_STORAGE_KEY, JSON.stringify(nextFieldIds))
    }
  } catch (_error) {
    return nextFieldIds
  }

  return nextFieldIds
}

const getStoredFieldSnapshots = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(FIELD_SNAPSHOTS_STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)
    return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
      ? parsedValue
      : {}
  } catch (_error) {
    return {}
  }
}

const buildPersistableFieldSnapshots = (snapshots = {}, { stripDataImages = false } = {}) => {
  const nextSnapshots = {}

  Object.entries(snapshots || {}).forEach(([key, value]) => {
    const snapshotKey = String(key || "").trim()
    if (!snapshotKey || !value || typeof value !== "object") {
      return
    }

    const coverImage = String(value.coverImage || "").trim()
    const images = (Array.isArray(value.images) ? value.images : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)

    nextSnapshots[snapshotKey] = {
      ...value,
      coverImage:
        stripDataImages && coverImage.startsWith("data:")
          ? ""
          : coverImage,
      images:
        stripDataImages
          ? images.filter((item) => !item.startsWith("data:"))
          : images,
    }
  })

  return nextSnapshots
}

const setStoredFieldSnapshots = (snapshots = {}) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return {}
  }

  const persistableSnapshots = buildPersistableFieldSnapshots(snapshots)

  try {
    if (Object.keys(persistableSnapshots).length === 0) {
      window.localStorage.removeItem(FIELD_SNAPSHOTS_STORAGE_KEY)
      return {}
    }

    window.localStorage.setItem(
      FIELD_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify(persistableSnapshots)
    )

    return persistableSnapshots
  } catch (_error) {
    try {
      const reducedSnapshots = buildPersistableFieldSnapshots(snapshots, {
        stripDataImages: true,
      })

      if (Object.keys(reducedSnapshots).length === 0) {
        window.localStorage.removeItem(FIELD_SNAPSHOTS_STORAGE_KEY)
        return {}
      }

      window.localStorage.setItem(
        FIELD_SNAPSHOTS_STORAGE_KEY,
        JSON.stringify(reducedSnapshots)
      )

      return reducedSnapshots
    } catch (_nestedError) {
      return {}
    }
  }
}

const rememberKnownFieldIds = (...fieldIds) =>
  setStoredKnownFieldIds([...getStoredKnownFieldIds(), ...fieldIds.flat()])

const forgetKnownFieldId = (fieldId) =>
  setStoredKnownFieldIds(getStoredKnownFieldIds().filter((item) => item !== String(fieldId || "").trim()))

const isHtmlLike = (value) => {
  const trimmed = String(value || "").trim().toLowerCase()
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")
}

const getRouteErrorFromHtml = (value) => {
  const normalizedValue = String(value || "").replace(/\s+/g, " ").trim()
  const match = normalizedValue.match(/Cannot\s+(GET|POST|PUT|DELETE|PATCH)\s+([^<\s]+)/i)

  if (!match) {
    return ""
  }

  return `API không hỗ trợ ${String(match[1] || "").toUpperCase()} ${String(match[2] || "").trim()}.`
}

const buildApiUnavailableMessage = (requestPath) =>
  `Không thể kết nối đến API (${API_BASE_URL}). Vui lòng kiểm tra backend đang chạy (${requestPath}).`

const isRouteMissingResponse = (status, rawBodyText = "") =>
  Number(status) === 404
  || Number(status) === 405
  || Boolean(getRouteErrorFromHtml(rawBodyText))

const normalizeApiErrorMessageKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const isGenericInvalidApiMessage = (value) => {
  const normalizedMessage = normalizeApiErrorMessageKey(value)
  return (
    normalizedMessage === "du lieu gui len khong hop le"
    || normalizedMessage === "data invalid"
    || normalizedMessage === "request data invalid"
  )
}

const getNestedValue = (source, path) =>
  String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((currentValue, key) => (currentValue == null ? undefined : currentValue[key]), source)

const pickFirstValue = (source, paths = []) => {
  for (const path of paths) {
    const candidate = getNestedValue(source, path)
    if (candidate !== undefined && candidate !== null) {
      return candidate
    }
  }

  return undefined
}

const unwrapResponseData = (value) => {
  if (value && typeof value === "object" && value.data && typeof value.data === "object") {
    return value.data
  }

  return value
}

const getMessageFromBody = (bodyData, rawBodyText) => {
  const normalizedBody = unwrapResponseData(bodyData)
  const message = pickFirstValue(
    { bodyData, normalizedBody },
    [
      "bodyData.message",
      "bodyData.error.message",
      "normalizedBody.message",
      "normalizedBody.error.message",
    ]
  )
  const detail = pickFirstValue(
    { bodyData, normalizedBody },
    [
      "bodyData.data",
      "bodyData.error.data",
      "normalizedBody.data",
      "normalizedBody.error.data",
    ]
  )

  if (typeof detail === "string" && detail.trim()) {
    if (!(typeof message === "string" && message.trim()) || isGenericInvalidApiMessage(message)) {
      return detail.trim()
    }
  }

  if (typeof message === "string" && message.trim()) {
    return message.trim()
  }

  if (typeof detail === "string" && detail.trim()) {
    return detail.trim()
  }

  const routeErrorMessage = getRouteErrorFromHtml(rawBodyText)
  if (routeErrorMessage) {
    return routeErrorMessage
  }

  const normalizedText = String(rawBodyText || "").replace(/\s+/g, " ").trim()

  if (!normalizedText || isHtmlLike(normalizedText)) {
    return ""
  }

  return normalizedText.slice(0, 180)
}

const normalizeId = (...values) => {
  for (const value of values) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nestedId = normalizeId(
        value._id,
        value.id,
        value.userId,
        value.fieldId,
        value.subFieldId,
        value.bookingId,
        value.paymentId
      )

      if (nestedId) {
        return nestedId
      }
    }

    const normalized = String(value || "").trim()
    if (normalized && normalized !== "[object Object]") {
      return normalized
    }
  }

  return ""
}

const normalizeRole = (value) => {
  const normalized = String(value || "").trim().toUpperCase()

  if (normalized === "ADMIN") {
    return "ADMIN"
  }

  if (normalized === "CLIENT" || normalized === "CUSTOMER" || normalized === "USER") {
    return "USER"
  }

  return normalized || "USER"
}

const normalizeAuthUser = (user) => {
  if (!user || typeof user !== "object") {
    return null
  }

  const id = normalizeId(user.id, user._id, user.userId)
  const name = String(user.name || user.fullName || "").trim()
  const email = String(user.email || user.username || "").trim().toLowerCase()

  if (!id && !name && !email) {
    return null
  }

  return {
    ...user,
    id: id || email || name,
    _id: id || email || name,
    name: name || email,
    fullName: name || email,
    email,
    phone: String(user.phone || user.mobile || "").trim(),
    role: normalizeRole(user.role),
  }
}

const normalizeSubFieldItem = (subField, index = 0) => {
  if (!subField || typeof subField !== "object") {
    return null
  }

  const id = normalizeId(subField.id, subField._id, subField.subFieldId)
  const name = String(subField.name || subField.subFieldName || `San ${index + 1}`).trim()
  const key = String(subField.key || id || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  if (!name) {
    return null
  }

  return {
    ...subField,
    id: id || key || `sub-field-${index + 1}`,
    _id: id || key || `sub-field-${index + 1}`,
    key: normalizeSubFieldKeyValue(key, `sub-field-${index + 1}`) || `sub-field-${index + 1}`,
    name,
    type: normalizeFieldType(subField.type || subField.fieldType || subField.subFieldType || ""),
    pricePerHour: Number(
      subField.pricePerHour
      || subField.price
      || subField.hourlyPrice
      || subField.basePrice
      || 0
    ),
    openHours: normalizeOpenHoursValue(
      subField.openHours
      || subField.timeRange
      || subField.openingHours
      || "",
      ""
    ),
  }
}

const normalizeFieldItem = (field) => {
  if (!field || typeof field !== "object") {
    return null
  }

  const id = normalizeId(field.id, field._id, field.fieldId)
  const name = String(field.name || field.fieldName || "").trim()

  if (!id && !name) {
    return null
  }

  const rawSubFields = [
    ...(Array.isArray(field.subFields) ? field.subFields : []),
    ...(Array.isArray(field.subfields) ? field.subfields : []),
    ...(Array.isArray(field.miniFields) ? field.miniFields : []),
    ...(Array.isArray(field.children) ? field.children : []),
  ]

  return {
    ...field,
    id: id || name,
    _id: id || name,
    name: name || id,
    slug: String(field.slug || "").trim(),
    address: String(field.address || field.location || "").trim(),
    district: String(field.district || field.area || "").trim(),
    city: String(field.city || field.province || "").trim(),
    ward: String(field.ward || "").trim(),
    type: normalizeFieldType(field.type || field.fieldType || field.category || ""),
    openHours: normalizeOpenHoursValue(
      field.openHours
      || field.timeRange
      || field.openingHours
      || field.hours
      || "",
      ""
    ),
    pricePerHour: Number(
      field.pricePerHour
      || field.price
      || field.hourlyPrice
      || field.basePrice
      || 0
    ),
    rating: Number(field.rating || 0),
    article: String(field.article || field.description || "").trim(),
    coverImage: String(
      field.coverImage
      || field.image
      || field.thumbnail
      || field.avatar
      || ""
    ).trim(),
    images:
      Array.isArray(field.images) && field.images.length > 0
        ? field.images.filter(Boolean)
        : Array.isArray(field.galleryImages) && field.galleryImages.length > 0
          ? field.galleryImages.filter(Boolean)
          : Array.isArray(field.gallery) && field.gallery.length > 0
            ? field.gallery.filter(Boolean)
            : String(field.coverImage || field.image || field.thumbnail || field.avatar || "").trim()
              ? [String(field.coverImage || field.image || field.thumbnail || field.avatar || "").trim()]
              : [],
    ownerUserId: normalizeId(field.ownerUserId, field.userId, field.owner?._id, field.owner?.id),
    userId: normalizeId(field.userId, field.ownerUserId, field.owner?._id, field.owner?.id),
    ownerEmail: String(field.ownerEmail || field.userEmail || field.owner?.email || "").trim().toLowerCase(),
    approvalStatus: String(field.approvalStatus || "").trim(),
    status: String(field.status || "").trim(),
    isLocked: Boolean(field.isLocked),
    locked: Boolean(field.locked),
    subFields: rawSubFields.map((item, index) => normalizeSubFieldItem(item, index)).filter(Boolean),
  }
}

const pickFirstNonEmptyString = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim()
    if (normalized) {
      return normalized
    }
  }

  return ""
}

const pickFirstNonEmptyArray = (...values) => {
  for (const value of values) {
    if (Array.isArray(value) && value.length > 0) {
      return value
    }
  }

  return []
}

const pickFirstFiniteNumber = (...values) => {
  for (const value of values) {
    const normalized = Number(value)
    if (Number.isFinite(normalized)) {
      return normalized
    }
  }

  return 0
}

const pickFirstPositiveNumber = (...values) => {
  for (const value of values) {
    const normalized = Number(value)
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized
    }
  }

  return 0
}

const mergeFieldSources = (field, snapshot) => {
  if (!snapshot || typeof snapshot !== "object") {
    return normalizeFieldItem(field)
  }

  return normalizeFieldItem({
    ...snapshot,
    ...field,
    id: normalizeId(field?.id, field?._id, field?.fieldId, snapshot.id, snapshot._id),
    _id: normalizeId(field?._id, field?.id, field?.fieldId, snapshot._id, snapshot.id),
    fieldId: normalizeId(field?.fieldId, field?.id, field?._id, snapshot.fieldId, snapshot.id),
    slug: pickFirstNonEmptyString(field?.slug, snapshot.slug),
    name: pickFirstNonEmptyString(field?.name, field?.fieldName, snapshot.name),
    address: pickFirstNonEmptyString(field?.address, field?.location, snapshot.address),
    district: pickFirstNonEmptyString(field?.district, field?.area, snapshot.district),
    city: pickFirstNonEmptyString(field?.city, field?.province, snapshot.city),
    ward: pickFirstNonEmptyString(field?.ward, snapshot.ward),
    type: pickFirstNonEmptyString(field?.type, field?.fieldType, field?.category, snapshot.type),
    openHours: pickFirstNonEmptyString(
      field?.openHours,
      field?.timeRange,
      field?.openingHours,
      field?.hours,
      snapshot.openHours
    ),
    pricePerHour: pickFirstPositiveNumber(
      field?.pricePerHour,
      field?.price,
      field?.hourlyPrice,
      field?.basePrice,
      snapshot.pricePerHour
    ),
    rating: pickFirstFiniteNumber(field?.rating, snapshot.rating),
    article: pickFirstNonEmptyString(field?.article, field?.description, snapshot.article),
    coverImage: pickFirstNonEmptyString(
      field?.coverImage,
      field?.image,
      field?.thumbnail,
      field?.avatar,
      snapshot.coverImage
    ),
    images: pickFirstNonEmptyArray(
      field?.images,
      field?.galleryImages,
      field?.gallery,
      snapshot.images
    ),
    subFields: pickFirstNonEmptyArray(
      field?.subFields,
      field?.subfields,
      field?.miniFields,
      field?.children,
      snapshot.subFields
    ),
    ownerUserId: normalizeId(
      field?.ownerUserId,
      field?.userId,
      field?.owner?._id,
      field?.owner?.id,
      snapshot.ownerUserId,
      snapshot.userId
    ),
    userId: normalizeId(
      field?.userId,
      field?.ownerUserId,
      field?.owner?._id,
      field?.owner?.id,
      snapshot.userId,
      snapshot.ownerUserId
    ),
    ownerEmail: pickFirstNonEmptyString(
      field?.ownerEmail,
      field?.userEmail,
      field?.owner?.email,
      snapshot.ownerEmail
    ),
    approvalStatus: pickFirstNonEmptyString(
      field?.approvalStatus,
      field?.status,
      snapshot.approvalStatus,
      snapshot.status
    ),
    status: pickFirstNonEmptyString(
      field?.status,
      field?.approvalStatus,
      snapshot.status,
      snapshot.approvalStatus
    ),
    isLocked:
      field?.isLocked
      ?? field?.locked
      ?? snapshot.isLocked
      ?? snapshot.locked
      ?? false,
    locked:
      field?.locked
      ?? field?.isLocked
      ?? snapshot.locked
      ?? snapshot.isLocked
      ?? false,
  })
}

const rememberFieldSnapshot = (field) => {
  const normalizedField = normalizeFieldItem(field)
  if (!normalizedField?.id) {
    return normalizedField
  }

  const nextSnapshots = {
    ...getStoredFieldSnapshots(),
    [normalizedField.id]: {
      id: normalizedField.id,
      _id: normalizedField._id,
      fieldId: normalizedField.id,
      slug: normalizedField.slug,
      name: normalizedField.name,
      address: normalizedField.address,
      district: normalizedField.district,
      city: normalizedField.city,
      ward: normalizedField.ward,
      type: normalizedField.type,
      openHours: normalizedField.openHours,
      pricePerHour: normalizedField.pricePerHour,
      rating: normalizedField.rating,
      article: normalizedField.article,
      coverImage: normalizedField.coverImage,
      images: Array.isArray(normalizedField.images) ? normalizedField.images : [],
      subFields: Array.isArray(normalizedField.subFields) ? normalizedField.subFields : [],
      ownerUserId: normalizedField.ownerUserId,
      userId: normalizedField.userId,
      ownerEmail: normalizedField.ownerEmail,
      approvalStatus: normalizedField.approvalStatus,
      status: normalizedField.status,
      isLocked: normalizedField.isLocked,
      locked: normalizedField.locked,
    },
  }

  setStoredFieldSnapshots(nextSnapshots)
  return normalizedField
}

const mergeStoredFieldSnapshot = (field) => {
  const normalizedField = normalizeFieldItem(field)
  if (!normalizedField?.id) {
    return normalizedField
  }

  const snapshot = getStoredFieldSnapshots()[normalizedField.id]
  const mergedField = mergeFieldSources(normalizedField, snapshot)

  if (mergedField?.id) {
    rememberFieldSnapshot(mergedField)
  }

  return mergedField
}

const getStoredFieldSnapshotList = () =>
  Object.values(getStoredFieldSnapshots())
    .map((field) => mergeStoredFieldSnapshot(field))
    .filter(Boolean)

const forgetStoredFieldSnapshot = (fieldId) => {
  const normalizedFieldId = String(fieldId || "").trim()
  if (!normalizedFieldId) {
    return
  }

  const nextSnapshots = {
    ...getStoredFieldSnapshots(),
  }

  delete nextSnapshots[normalizedFieldId]
  setStoredFieldSnapshots(nextSnapshots)
}

const normalizeSubFieldKeyValue = (value, fallback = "") =>
  String(value || fallback || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const normalizeOpenHoursValue = (value, fallback = "") => {
  const normalizedValue = String(value || "").trim()
  const match = normalizedValue.match(
    /^([01]?\d|2[0-3]):([0-5]\d)\s*-\s*([01]?\d|2[0-3]):([0-5]\d)$/
  )

  if (!match) {
    return String(fallback || "").trim()
  }

  return `${String(match[1]).padStart(2, "0")}:${match[2]}-${String(match[3]).padStart(2, "0")}:${match[4]}`
}

const normalizeTimeString = (value) => {
  const normalized = String(value || "").trim()
  const match = normalized.match(/^([01]?\d|2[0-3])[:h]?([0-5]\d)$/i)

  if (!match) {
    return ""
  }

  return `${String(match[1]).padStart(2, "0")}:${String(match[2]).padStart(2, "0")}`
}

const timeToMinutes = (value) => {
  const normalized = normalizeTimeString(value)
  if (!normalized) {
    return null
  }

  const [hours, minutes] = normalized.split(":").map(Number)
  return hours * 60 + minutes
}

const normalizeTimeSlotItem = (slot, index = 0) => {
  if (!slot || typeof slot !== "object") {
    return null
  }

  const id = normalizeId(slot.id, slot._id, slot.timeSlotId)
  const startTime = normalizeTimeString(
    slot.startTime
    || slot.start
    || slot.from
    || slot.timeStart
  )
  const endTime = normalizeTimeString(
    slot.endTime
    || slot.end
    || slot.to
    || slot.timeEnd
  )
  const label = String(slot.label || slot.name || slot.timeSlot || "").trim()
  const timeSlot = label || (startTime && endTime ? `${startTime} - ${endTime}` : "")

  if (!id && !timeSlot) {
    return null
  }

  return {
    ...slot,
    id: id || `time-slot-${index + 1}`,
    _id: id || `time-slot-${index + 1}`,
    label: timeSlot || label || `Khung gio ${index + 1}`,
    timeSlot: timeSlot || label || "",
    startTime,
    endTime,
    startMinutes: timeToMinutes(startTime),
    endMinutes: timeToMinutes(endTime),
  }
}

const deriveBookingExpiredAt = (booking, holdMinutes = DEFAULT_BOOKING_HOLD_MINUTES) => {
  const createdAt = booking?.createdAt ? new Date(booking.createdAt) : null
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return ""
  }

  return new Date(createdAt.getTime() + Math.max(Number(holdMinutes) || 0, 0) * 60 * 1000).toISOString()
}

const attachBookingHoldInfo = (booking, response = null) => {
  const normalizedBooking = normalizeBookingItem(booking)
  if (!normalizedBooking) {
    return null
  }

  const holdMinutes = Number(
    pickFirstValue(response, ["data.holdMinutes", "holdMinutes"])
    || normalizedBooking.holdMinutes
    || DEFAULT_BOOKING_HOLD_MINUTES
  )
  const holdExpiresAt = pickFirstNonEmptyString(
    pickFirstValue(response, ["data.holdExpiresAt", "holdExpiresAt"]),
    normalizedBooking.holdExpiresAt,
    normalizedBooking.expiredAt,
    deriveBookingExpiredAt(normalizedBooking, holdMinutes)
  )

  return {
    ...normalizedBooking,
    holdMinutes,
    expiredAt: holdExpiresAt,
    holdExpiresAt,
  }
}

const normalizeBookingItem = (booking) => {
  if (!booking || typeof booking !== "object") {
    return null
  }

  const id = normalizeId(booking.id, booking._id, booking.bookingId)
  const field = normalizeFieldItem(booking.field || booking.fieldId)
  const subField = normalizeSubFieldItem(booking.subField || booking.subFieldId)
  const timeSlot = normalizeTimeSlotItem(booking.timeSlotInfo || booking.timeSlot || booking.timeSlotId)
  const customerSource =
    (booking.customer && typeof booking.customer === "object" ? booking.customer : null)
    || (booking.user && typeof booking.user === "object" ? booking.user : null)
    || (booking.userId && typeof booking.userId === "object" ? booking.userId : null)
    || null
  const customerUser = normalizeAuthUser(customerSource)
  const holdMinutes = Number(booking.holdMinutes || booking.payment?.holdMinutes || DEFAULT_BOOKING_HOLD_MINUTES)
  const holdExpiresAt = pickFirstNonEmptyString(
    booking.holdExpiresAt,
    booking.expiredAt,
    booking.payment?.expiredAt,
    deriveBookingExpiredAt(booking, holdMinutes)
  )
  const customerPhone = pickFirstNonEmptyString(
    booking.customer?.phone,
    booking.user?.phone,
    booking.userId?.phone,
    booking.phone,
    customerUser?.phone
  )
  const customerEmail = pickFirstNonEmptyString(
    booking.customer?.email,
    booking.user?.email,
    booking.userId?.email,
    customerUser?.email
  )
  const customerFullName = pickFirstNonEmptyString(
    booking.customer?.fullName,
    booking.customer?.name,
    booking.user?.fullName,
    booking.user?.name,
    booking.userId?.fullName,
    booking.userId?.name,
    customerUser?.fullName,
    customerUser?.name
  )
  const customer =
    customerUser || customerFullName || customerPhone || customerEmail
      ? {
          id: normalizeId(
            booking.customer?.id,
            booking.customer?._id,
            booking.user?.id,
            booking.user?._id,
            booking.userId?.id,
            booking.userId?._id,
            customerUser?.id,
            customerUser?._id
          ),
          fullName: customerFullName || customerEmail || customerPhone,
          email: customerEmail,
          phone: customerPhone,
          createdAt:
            booking.customer?.createdAt
            || booking.user?.createdAt
            || booking.userId?.createdAt
            || customerSource?.createdAt
            || null,
        }
      : null

  return {
    ...booking,
    id: id || normalizeId(booking.paymentId, booking.createdAt),
    _id: id || normalizeId(booking.paymentId, booking.createdAt),
    userId: normalizeId(booking.userId, booking.user?._id, booking.user?.id),
    fieldId: normalizeId(booking.fieldId, field?.id),
    fieldSlug: String(booking.fieldSlug || field?.slug || "").trim(),
    fieldAddress: String(booking.fieldAddress || field?.address || "").trim(),
    fieldDistrict: String(booking.fieldDistrict || field?.district || "").trim(),
    subFieldId: normalizeId(booking.subFieldId, subField?.id),
    subFieldKey: String(booking.subFieldKey || subField?.key || "").trim(),
    timeSlotId: normalizeId(booking.timeSlotId, timeSlot?.id),
    fieldName: String(booking.fieldName || field?.name || "").trim(),
    subFieldName: String(booking.subFieldName || subField?.name || "").trim(),
    subFieldType: String(booking.subFieldType || subField?.type || "").trim(),
    timeSlot: String(
      booking.timeSlotLabel
      || booking.timeSlot
      || timeSlot?.timeSlot
      || ""
    ).trim(),
    date: normalizeBookingDateValue(booking.date || booking.bookingDate),
    phone: String(booking.phone || booking.user?.phone || "").trim(),
    note: String(booking.note || booking.description || "").trim(),
    status: String(booking.status || booking.bookingStatus || "").trim(),
    totalPrice: Number(booking.totalPrice || booking.price || booking.amount || 0),
    depositAmount: Number(
      booking.depositAmount
      || booking.paidAmount
      || booking.payment?.amount
      || 0
    ),
    remainingAmount: Number(booking.remainingAmount || 0),
    paidAmount: Number(
      booking.paidAmount
      || booking.payment?.amount
      || 0
    ),
    paymentId: normalizeId(booking.paymentId, booking.payment?._id, booking.payment?.id),
    paymentStatus: String(
      booking.paymentStatus
      || booking.payment?.status
      || booking.statusPayment
      || ""
    ).trim(),
    depositStatus: String(
      booking.depositStatus
      || booking.payment?.status
      || booking.statusPayment
      || ""
    ).trim(),
    depositMethod: String(booking.depositMethod || booking.payment?.method || "").trim(),
    depositPaid: Boolean(booking.depositPaid || booking.payment?.status === "PAID"),
    fullyPaid: Boolean(
      booking.fullyPaid
      || (
        Number(booking.remainingAmount || 0) <= 0
        && (
          Boolean(booking.depositPaid)
          || String(booking.payment?.status || "").trim().toUpperCase() === "PAID"
        )
      )
    ),
    createdAt: booking.createdAt || booking.updatedAt || null,
    holdMinutes,
    expiredAt: holdExpiresAt,
    holdExpiresAt,
    customer,
    field,
    subField,
    timeSlotInfo: timeSlot,
    payment: booking.payment || null,
  }
}

const normalizePaymentItem = (payment) => {
  if (!payment || typeof payment !== "object") {
    return null
  }

  const id = normalizeId(payment.id, payment._id, payment.paymentId)

  if (!id && !payment.bookingId) {
    return null
  }

  return {
    ...payment,
    id: id || normalizeId(payment.bookingId),
    _id: id || normalizeId(payment.bookingId),
    bookingId: normalizeId(payment.bookingId, payment.booking?._id, payment.booking?.id),
    bookingIds: Array.isArray(payment.bookingIds)
      ? payment.bookingIds.map((item) => normalizeId(item)).filter(Boolean)
      : [],
    amount: Number(payment.amount || payment.price || 0),
    method: String(payment.method || payment.paymentMethod || "").trim().toUpperCase(),
    paymentType: String(payment.paymentType || payment.type || "").trim().toUpperCase(),
    status: String(payment.status || payment.paymentStatus || "").trim().toUpperCase(),
    transactionCode: String(payment.transactionCode || "").trim(),
    qrCode: String(payment.qrCode || payment.qr || payment.qrUrl || "").trim(),
    qrImage: String(payment.qrImage || payment.qrImageUrl || "").trim(),
    qrText: String(payment.qrText || payment.content || "").trim(),
    payUrl: String(payment.payUrl || payment.paymentUrl || "").trim(),
    deeplink: String(payment.deeplink || payment.deepLink || "").trim(),
    expiredAt: payment.expiredAt ? new Date(payment.expiredAt) : null,
    createdAt: payment.createdAt ? new Date(payment.createdAt) : null,
  }
}

const getArrayFromResponse = (response, paths = []) => {
  const rawPaths = paths.flatMap((path) => [path, `data.${path}`])

  for (const path of rawPaths) {
    const candidate = getNestedValue(response, path)
    if (Array.isArray(candidate)) {
      return candidate
    }
  }

  const unwrapped = unwrapResponseData(response)
  if (Array.isArray(unwrapped)) {
    return unwrapped
  }

  const seen = new Set()
  const findFirstArray = (value, depth = 0) => {
    if (depth > 4 || value == null) {
      return []
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return value
      }

      return typeof value[0] === "object" ? value : []
    }

    if (typeof value !== "object") {
      return []
    }

    if (seen.has(value)) {
      return []
    }
    seen.add(value)

    const preferredKeys = [
      "fields",
      "items",
      "docs",
      "rows",
      "results",
      "records",
      "list",
      "fieldList",
      "subFields",
      "subfields",
      "requests",
    ]

    for (const key of preferredKeys) {
      if (key in value) {
        const nestedArray = findFirstArray(value[key], depth + 1)
        if (Array.isArray(nestedArray) && (nestedArray.length > 0 || Array.isArray(value[key]))) {
          return nestedArray
        }
      }
    }

    for (const nestedValue of Object.values(value)) {
      const nestedArray = findFirstArray(nestedValue, depth + 1)
      if (Array.isArray(nestedArray) && nestedArray.length > 0) {
        return nestedArray
      }
    }

    return []
  }

  return findFirstArray(unwrapped)
}

const getObjectFromResponse = (response, paths = []) => {
  const rawPaths = paths.flatMap((path) => [path, `data.${path}`])

  for (const path of rawPaths) {
    const candidate = getNestedValue(response, path)
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate
    }
  }

  const unwrapped = unwrapResponseData(response)
  return unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped) ? unwrapped : null
}

const createTokenHeaders = (token, headers = {}) => {
  const normalizedToken = String(token || "").trim()
  if (!normalizedToken) {
    return {
      ...headers,
    }
  }

  return {
    ...headers,
    "x-token": normalizedToken,
  }
}

const request = async (path, options = {}) => {
  const method = String(options.method || "GET").toUpperCase()
  const requestPath = `${method} ${path}`
  const { headers: optionHeaders = {}, ...requestOptions } = options

  const headers = {
    ...optionHeaders,
  }

  if (
    !headers["Content-Type"]
    && !headers["content-type"]
    && requestOptions.body
    && !(typeof FormData !== "undefined" && requestOptions.body instanceof FormData)
    && !(typeof Blob !== "undefined" && requestOptions.body instanceof Blob)
  ) {
    headers["Content-Type"] = "application/json"
  }

  const apiBaseCandidates = API_BASE_URL_CANDIDATES.length > 0
    ? API_BASE_URL_CANDIDATES
    : [API_BASE_URL].filter(Boolean)

  let lastApiError = null

  for (const apiBaseUrl of apiBaseCandidates) {
    let response
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...requestOptions,
        headers,
      })
    } catch (_error) {
      const networkError = new Error(buildApiUnavailableMessage(`${method} ${apiBaseUrl}${path}`))
      networkError.requestPath = `${method} ${apiBaseUrl}${path}`
      networkError.status = 0
      networkError.isRouteMissing = false
      lastApiError = networkError
      continue
    }

    let rawBodyText = ""
    try {
      rawBodyText = await response.text()
    } catch (_error) {
      rawBodyText = ""
    }

    let data = null
    if (rawBodyText) {
      try {
        data = JSON.parse(rawBodyText)
      } catch (_error) {
        data = null
      }
    }

    // Guard against misconfigured API base that returns HTML (for example, frontend index page).
    if (response.ok && data == null && isHtmlLike(rawBodyText)) {
      const htmlPayloadError = new Error(
        getRouteErrorFromHtml(rawBodyText)
        || `API tra ve HTML thay vi JSON tai ${requestPath}.`
      )
      htmlPayloadError.requestPath = `${method} ${apiBaseUrl}${path}`
      htmlPayloadError.status = Number(response.status || 0)
      htmlPayloadError.isRouteMissing = true
      lastApiError = htmlPayloadError
      continue
    }

    if (!response.ok) {
      const errorMessage =
        getMessageFromBody(data, rawBodyText)
        || `Yeu cau that bai (${response.status}) tai ${requestPath}.`
      const apiError = new Error(errorMessage)
      apiError.requestPath = `${method} ${apiBaseUrl}${path}`
      apiError.status = response.status
      apiError.isRouteMissing = isRouteMissingResponse(response.status, rawBodyText)

      if (apiError.isRouteMissing) {
        lastApiError = apiError
        continue
      }

      throw apiError
    }

    return data || {}
  }

  if (lastApiError) {
    throw lastApiError
  }

  const networkError = new Error(buildApiUnavailableMessage(requestPath))
  networkError.requestPath = requestPath
  networkError.status = 0
  networkError.isRouteMissing = false
  throw networkError
}

const requestFirstSuccess = async (paths, options = {}) => {
  let lastError = null

  for (const path of paths) {
    try {
      return await request(path, options)
    } catch (error) {
      lastError = error

      if (!error?.isRouteMissing) {
        throw error
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  return {}
}

const RENDER_TRANSIENT_ERROR_STATUSES = new Set([0, 502, 503, 504])

const isRenderHostedApi = () => /onrender\.com/i.test(String(API_BASE_URL || ""))

const shouldRetryTransientApiError = (error) =>
  isRenderHostedApi() && RENDER_TRANSIENT_ERROR_STATUSES.has(Number(error?.status || 0))

const waitForApiRetry = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(Number(delayMs) || 0, 0))
  })

const requestWithTransientRetry = async (
  path,
  options = {},
  {
    retries = 2,
    delayMs = 1400,
  } = {}
) => {
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request(path, options)
    } catch (error) {
      lastError = error

      if (attempt >= retries || !shouldRetryTransientApiError(error)) {
        throw error
      }

      await waitForApiRetry(delayMs * (attempt + 1))
    }
  }

  throw lastError || new Error("API request failed.")
}

const RENDER_SHORT_READ_RETRY_CONFIG = Object.freeze({
  retries: 4,
  delayMs: 1800,
})

const RENDER_LONG_READ_RETRY_CONFIG = Object.freeze({
  retries: 5,
  delayMs: 2500,
})

const requestFirstSuccessWithTransientRetry = async (
  paths,
  options = {},
  retryConfig = RENDER_SHORT_READ_RETRY_CONFIG
) => {
  let lastError = null

  for (const path of paths) {
    try {
      return await requestWithTransientRetry(path, options, retryConfig)
    } catch (error) {
      lastError = error

      if (!error?.isRouteMissing) {
        throw error
      }
    }
  }

  if (lastError) {
    throw lastError
  }

  return {}
}

const buildBookingPaymentShape = (booking, payment) => {
  const normalizedBooking = normalizeBookingItem(booking) || null
  const normalizedPayment = normalizePaymentItem(payment) || null
  const mergedBooking = normalizedBooking
    ? {
        ...normalizedBooking,
        paymentId: normalizedBooking.paymentId || normalizedPayment?.id || "",
        paymentStatus: normalizedBooking.paymentStatus || normalizedPayment?.status || "",
        depositStatus: normalizedBooking.depositStatus || normalizedPayment?.status || "",
        depositMethod: normalizedBooking.depositMethod || normalizedPayment?.method || "",
        depositAmount: normalizedBooking.depositAmount || normalizedPayment?.amount || normalizedBooking.totalPrice || 0,
        depositPaid:
          normalizedBooking.depositPaid
          || String(normalizedPayment?.status || "").trim().toLowerCase() === "paid",
      }
    : null
  const amount = Number(
    normalizedPayment?.amount
    || mergedBooking?.depositAmount
    || mergedBooking?.totalPrice
    || 0
  )
  const paymentStatus = String(
    normalizedPayment?.status
    || mergedBooking?.paymentStatus
    || mergedBooking?.depositStatus
    || ""
  )
    .trim()
    .toLowerCase()
  const isPaid = paymentStatus === "paid" || paymentStatus === "success"

  return {
    booking: mergedBooking,
    field: mergedBooking?.field || null,
    payment: normalizedPayment,
    paymentMethods: {
      staticTransfer: {
        enabled: !normalizedPayment,
        message: normalizedPayment ? "Don dat san nay da co yeu cau thanh toan." : "",
      },
      vnpay: {
        enabled: Boolean(normalizedPayment?.id),
        message: normalizedPayment?.id ? "" : "Can tao yeu cau thanh toan truoc khi lay QR.",
      },
      momo: {
        enabled: Boolean(normalizedPayment?.id) && !isPaid,
        message:
          normalizedPayment?.id && !isPaid
            ? ""
            : "Chỉ có thể lấy QR khi đã tạo payment và payment chưa hoàn tất.",
      },
    },
    staticTransfer: {
      amount,
      bankName: "Thanh toán tiền mặt / tùy backend xác nhận",
      accountNumber: normalizedPayment?.id || normalizedBooking?.paymentId || "",
      accountName: normalizedPayment?.method || "CASH",
      transferNote: mergedBooking?.id || "",
      qrImageUrl: normalizedPayment?.qrImage || normalizedPayment?.qrCode || "",
    },
  }
}

const isDataImageUrl = (value) => /^data:image\//i.test(String(value || "").trim())

const buildFieldMutationPayload = (payload = {}) => {
  const coverImage = String(payload.coverImage || payload.image || "").trim()
  const images = (
    Array.isArray(payload.images)
      ? payload.images
      : Array.isArray(payload.galleryImages)
        ? payload.galleryImages
        : []
  )
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => !isDataImageUrl(item))

  return {
    name: String(payload.name || "").trim(),
    address: String(payload.address || "").trim(),
    district: String(payload.district || "").trim(),
    article: String(payload.article || payload.description || "").trim(),
    coverImage: !isDataImageUrl(coverImage) ? coverImage : "",
    images,
    type: normalizeFieldType(payload.type || "", ""),
    openHours: normalizeOpenHoursValue(payload.openHours || "", ""),
    pricePerHour: Math.max(Math.round(Number(payload.pricePerHour || 0)), 0),
  }
}

const buildSubFieldMutationPayload = (payload = {}, fieldOpenHours = "") => ({
  key: normalizeSubFieldKeyValue(payload.key, payload.name || ""),
  name: String(payload.name || "").trim(),
  type: normalizeFieldType(payload.type || "", ""),
  pricePerHour: Math.max(Math.round(Number(payload.pricePerHour || 0)), 0),
  openHours: normalizeOpenHoursValue(payload.openHours || fieldOpenHours, ""),
})

const normalizeOtpPurpose = (value, fallback = "auth") =>
  String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .slice(0, 40) || String(fallback || "auth")

export const requestRegisterOtp = async (payload = {}) => {
  const email = String(payload?.email || "").trim().toLowerCase()

  if (!email) {
    throw new Error("Vui lòng nhập email trước khi gửi OTP.")
  }

  const response = await requestFirstSuccessWithTransientRetry(
    SEND_OTP_PATHS,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        purpose: normalizeOtpPurpose(payload?.purpose, "register"),
      }),
    },
    RENDER_SHORT_READ_RETRY_CONFIG
  )
  const data = getObjectFromResponse(response, ["data"]) || unwrapResponseData(response) || {}
  const expiresAt = String(data?.expiresAt || "").trim()
  const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null
  const expiresAtMs =
    parsedExpiresAt && !Number.isNaN(parsedExpiresAt.getTime()) ? parsedExpiresAt.getTime() : 0
  const expiresInMinutes = Number(
    data?.expiresInMinutes
    || data?.expiresMinutes
    || 5
  )

  return {
    email: String(data?.email || email).trim().toLowerCase(),
    purpose: normalizeOtpPurpose(data?.purpose, payload?.purpose || "register"),
    expiresAt,
    expiresAtMs,
    expiresInMinutes: Number.isFinite(expiresInMinutes) && expiresInMinutes > 0 ? expiresInMinutes : 5,
    message: String(response?.message || "Đã gửi mã OTP về email.").trim(),
  }
}

export const verifyRegisterOtp = async (payload = {}) => {
  const email = String(payload?.email || "").trim().toLowerCase()
  const otp = String(payload?.otp || payload?.otpCode || "").trim()

  if (!email || !otp) {
    throw new Error("Vui lòng nhập đầy đủ email và mã OTP.")
  }

  const response = await requestFirstSuccessWithTransientRetry(
    VERIFY_OTP_PATHS,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        otp,
        purpose: normalizeOtpPurpose(payload?.purpose, "register"),
      }),
    },
    RENDER_SHORT_READ_RETRY_CONFIG
  )

  return {
    verified: true,
    message: String(response?.message || "OTP đã được xác nhận.").trim(),
  }
}

export const canSendManagedUserOtp = () => isManagedUserOtpConfigured()

export const getManagedUserOtpSetupMessage = () => getManagedUserOtpConfigMessage()

export const requestManagedUserOtp = async (payload = {}) => {
  return requestRegisterOtp({
    email: payload?.email,
    purpose: payload?.purpose || "admin_create_user",
  })
}

export const verifyManagedUserOtp = async (payload = {}) =>
  verifyRegisterOtp({
    email: payload?.email,
    otp: payload?.otp || payload?.otpCode,
    purpose: payload?.purpose || "admin_create_user",
  })

export const registerUser = async (payload) => {
  const response = await requestFirstSuccess(REGISTER_PATHS, {
    method: "POST",
    body: JSON.stringify({
      name: String(payload?.fullName || payload?.name || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      password: String(payload?.password || ""),
    }),
  })

  const user =
    normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
    || normalizeAuthUser(unwrapResponseData(response))

  return {
    message: String(response?.message || "").trim(),
    user,
  }
}

export const loginUser = async (payload) => {
  const response = await requestFirstSuccess(LOGIN_PATHS, {
    method: "POST",
    body: JSON.stringify({
      username: String(payload?.email || payload?.username || "").trim().toLowerCase(),
      password: String(payload?.password || ""),
    }),
  })

  const payloadData = unwrapResponseData(response)
  const token = String(
    pickFirstValue(payloadData, ["token", "accessToken", "jwt"])
    || pickFirstValue(response, ["token", "data.token", "accessToken", "data.accessToken"])
    || ""
  ).trim()
  const user =
    normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
    || normalizeAuthUser(payloadData?.user)
    || normalizeAuthUser(payloadData)

  return {
    token,
    user,
    message: String(response?.message || "").trim(),
  }
}

export const getMe = async (token) => {
  const response = await requestFirstSuccess(GET_ME_PATHS, {
    headers: createTokenHeaders(token),
  })

  const payloadData = unwrapResponseData(response)
  const user =
    normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
    || normalizeAuthUser(payloadData)

  return {
    user,
    message: String(response?.message || "").trim(),
  }
}

export const getPublicUsers = async () => {
  const response = await request("/user/getAllUser")
  return {
    users: getArrayFromResponse(response, ["users"]).map((item) => normalizeAuthUser(item)).filter(Boolean),
  }
}

const buildAdminUserPayload = (payload = {}, { defaultRole = "", includePassword = false } = {}) => {
  const nextPayload = {
    name: String(payload?.name || payload?.fullName || "").trim(),
    email: String(payload?.email || "").trim().toLowerCase(),
    phone: String(payload?.phone || "").trim(),
  }

  const password = String(payload?.password || "")
  if ((includePassword || password.trim()) && password) {
    nextPayload.password = password
  }

  const role = String(payload?.role || defaultRole || "").trim().toUpperCase()
  if (role) {
    nextPayload.role = role
  }

  if (payload?.isDeleted !== undefined) {
    nextPayload.isDeleted = Boolean(payload.isDeleted)
  }

  if (payload?.isActive !== undefined) {
    nextPayload.isActive = Boolean(payload.isActive)
  }

  if (payload?.locked !== undefined) {
    nextPayload.locked = Boolean(payload.locked)
  }

  if (payload?.isLocked !== undefined) {
    nextPayload.isLocked = Boolean(payload.isLocked)
  }

  const status = String(payload?.status || "").trim().toUpperCase()
  if (status) {
    nextPayload.status = status
  }

  return nextPayload
}

export const createPublicUser = async (token, payload) => {
  const response = await request("/user/createUser", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(buildAdminUserPayload(payload, { defaultRole: "USER", includePassword: true })),
  })

  return {
    user:
      normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
      || normalizeAuthUser(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const updatePublicUser = async (token, userId, payload) => {
  const response = await request("/user/updateUserForAdmin", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      userId: String(userId || "").trim(),
      ...buildAdminUserPayload(payload),
    }),
  })

  return {
    user:
      normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
      || normalizeAuthUser(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const deletePublicUser = async (token, userId) =>
  request("/user/deleteUser", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      userId: String(userId || "").trim(),
    }),
  })

export const requestOwnerRole = async (token) =>
  request("/user/requestOwner", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const getOwnerRequests = async (token) => {
  const response = await request("/user/getOwnerRequests", {
    headers: createTokenHeaders(token),
  })

  return {
    requests: getArrayFromResponse(response, ["requests", "users"]).map((item) => normalizeAuthUser(item)).filter(Boolean),
    message: String(response?.message || "").trim(),
  }
}

export const approveOwnerRequest = async (token, userId) =>
  request(`/user/approveOwner/${encodeURIComponent(String(userId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const rejectOwnerRequest = async (token, userId) =>
  request(`/user/rejectOwner/${encodeURIComponent(String(userId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const downgradeOwnerRole = async (token, userId) =>
  request(`/user/downgradeOwner/${encodeURIComponent(String(userId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const getOneUser = async (token, userId) => {
  const normalizedUserId = String(userId || "").trim()
  const response = await request(
    `/user/getOneUser?userId=${encodeURIComponent(normalizedUserId)}`,
    {
      method: "GET",
      headers: createTokenHeaders(token),
    }
  )

  return {
    user:
      normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
      || normalizeAuthUser(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const updateUser = async (token, payload) => {
  const response = await request("/user/updateUser", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      name: String(payload?.name || payload?.fullName || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      ...(payload?.password ? { password: String(payload.password) } : {}),
    }),
  })

  return {
    user:
      normalizeAuthUser(getObjectFromResponse(response, ["user", "account"]))
      || normalizeAuthUser(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const deleteUserByAdmin = async (token, userId) =>
  request(`/user/deleteUserByAdmin/${encodeURIComponent(String(userId || "").trim())}`, {
    method: "DELETE",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

const TIME_SLOT_LIST_PATHS = ["/timeSlot/getAllTimeSlot"]

export const getTimeSlots = async () => {
  let response = null
  let lastError = null

  for (const path of TIME_SLOT_LIST_PATHS) {
    try {
      response = await requestWithTransientRetry(path, {}, RENDER_LONG_READ_RETRY_CONFIG)
      break
    } catch (error) {
      lastError = error

      if (!error?.isRouteMissing) {
        throw error
      }
    }
  }

  if (!response) {
    throw lastError || new Error("Không thể tải danh sách khung giờ.")
  }

  return {
    timeSlots: getArrayFromResponse(response, ["timeSlots"]).map((item, index) => normalizeTimeSlotItem(item, index)).filter(Boolean),
  }
}

export const getTimeSlot = async (timeSlotId, token = "") => {
  const response = await requestWithTransientRetry(
    `/timeSlot/getTimeSlot/${encodeURIComponent(String(timeSlotId || "").trim())}`,
    {
      headers: createTokenHeaders(token),
    },
    RENDER_SHORT_READ_RETRY_CONFIG
  )

  return {
    timeSlot:
      normalizeTimeSlotItem(getObjectFromResponse(response, ["timeSlot", "item"]))
      || normalizeTimeSlotItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const updateTimeSlot = async (token, timeSlotId, payload) => {
  const response = await requestWithTransientRetry(
    `/timeSlot/updateTimeSlot/${encodeURIComponent(String(timeSlotId || "").trim())}`,
    {
      method: "POST",
      headers: createTokenHeaders(token),
      body: JSON.stringify({
        startTime: normalizeTimeString(payload?.startTime || ""),
        endTime: normalizeTimeString(payload?.endTime || ""),
        label: String(payload?.label || payload?.name || "").trim(),
      }),
    },
    RENDER_SHORT_READ_RETRY_CONFIG
  )

  return {
    timeSlot:
      normalizeTimeSlotItem(getObjectFromResponse(response, ["timeSlot", "item"]))
      || normalizeTimeSlotItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const deleteTimeSlot = async (token, timeSlotId) =>
  requestWithTransientRetry(
    `/timeSlot/deleteTimeSlot/${encodeURIComponent(String(timeSlotId || "").trim())}`,
    {
      method: "POST",
      headers: createTokenHeaders(token),
      body: JSON.stringify({}),
    }
  )

const DEFAULT_ADMIN_TIME_SLOT_SEED = Object.freeze({
  startMinutes: 5 * 60,
  endMinutes: 23 * 60 + 30,
  stepMinutes: 30,
})

const normalizeApiMessageKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const minutesToSeedTime = (totalMinutes) => {
  const hours = Math.floor(Number(totalMinutes || 0) / 60)
  const minutes = Number(totalMinutes || 0) % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

const buildDefaultAdminTimeSlotSeed = ({
  startMinutes = DEFAULT_ADMIN_TIME_SLOT_SEED.startMinutes,
  endMinutes = DEFAULT_ADMIN_TIME_SLOT_SEED.endMinutes,
  stepMinutes = DEFAULT_ADMIN_TIME_SLOT_SEED.stepMinutes,
} = {}) => {
  const slots = []

  for (
    let currentMinutes = startMinutes;
    currentMinutes + stepMinutes <= endMinutes;
    currentMinutes += stepMinutes
  ) {
    slots.push({
      startTime: minutesToSeedTime(currentMinutes),
      endTime: minutesToSeedTime(currentMinutes + stepMinutes),
    })
  }

  return slots
}

const getTimeSlotIdentity = (slot) => {
  const startTime = normalizeTimeString(slot?.startTime || slot?.start || slot?.from)
  const endTime = normalizeTimeString(slot?.endTime || slot?.end || slot?.to)

  return startTime && endTime ? `${startTime}-${endTime}` : ""
}

export const createAdminTimeSlot = async (token, { startTime, endTime }) =>
  requestWithTransientRetry("/timeSlot/createTimeSlot", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      startTime: normalizeTimeString(startTime),
      endTime: normalizeTimeString(endTime),
    }),
  })

export const bootstrapAdminTimeSlots = async (
  token,
  options = DEFAULT_ADMIN_TIME_SLOT_SEED
) => {
  const seedSlots = buildDefaultAdminTimeSlotSeed(options)
  const existingData = await getTimeSlots()
  const existingIdentities = new Set(
    (existingData.timeSlots || [])
      .map((slot) => getTimeSlotIdentity(slot))
      .filter(Boolean)
  )

  let createdCount = 0
  let skippedCount = 0

  for (const slot of seedSlots) {
    const identity = getTimeSlotIdentity(slot)
    if (!identity) {
      continue
    }

    if (existingIdentities.has(identity)) {
      skippedCount += 1
      continue
    }

    try {
      await createAdminTimeSlot(token, slot)
      existingIdentities.add(identity)
      createdCount += 1
    } catch (apiError) {
      const normalizedMessage = normalizeApiMessageKey(apiError?.message)

      if (
        normalizedMessage.includes("timeslot da ton tai")
        || normalizedMessage.includes("time slot da ton tai")
        || normalizedMessage.includes("already exists")
      ) {
        existingIdentities.add(identity)
        skippedCount += 1
        continue
      }

      throw apiError
    }
  }

  const totalCount = seedSlots.length

  return {
    createdCount,
    skippedCount,
    totalCount,
    message:
      createdCount > 0
        ? `Đã khởi tạo ${createdCount}/${totalCount} khung giờ mẫu 30 phút cho backend.`
        : `Backend đã có sẵn ${Math.max(existingIdentities.size, skippedCount)} khung giờ mẫu.`,
  }
}

export const getSubFieldsByField = async (fieldId, token = "") => {
  const encodedFieldId = encodeURIComponent(String(fieldId || "").trim())
  const response = await requestWithTransientRetry(`/subField/getByField/${encodedFieldId}`, token ? {
    headers: createTokenHeaders(token),
  } : {}, RENDER_SHORT_READ_RETRY_CONFIG)

  return {
    subFields: getArrayFromResponse(response, [
      "subFields",
      "subfields",
      "items",
      "docs",
      "rows",
      "records",
      "results",
      "list",
      "field.subFields",
      "field.subfields",
    ])
      .map((item, index) => normalizeSubFieldItem(item, index))
      .filter(Boolean),
    message: String(response?.message || "").trim(),
  }
}

const attachSubFieldsToField = async (field, token = "") => {
  const normalizedField = normalizeFieldItem(field)
  if (!normalizedField?.id) {
    return normalizedField
  }

  try {
    const { subFields } = await getSubFieldsByField(normalizedField.id, token)
    return mergeStoredFieldSnapshot({
      ...normalizedField,
      subFields,
    })
  } catch (_error) {
    return normalizedField
  }
}

const attachSubFieldsToFields = async (fields = [], token = "") => {
  const normalizedFields = (Array.isArray(fields) ? fields : [])
    .map((field) => normalizeFieldItem(field))
    .filter(Boolean)

  const results = await Promise.allSettled(
    normalizedFields.map((field) => attachSubFieldsToField(field, token))
  )

  return results
    .map((result, index) =>
      result.status === "fulfilled" ? result.value : normalizedFields[index]
    )
    .filter(Boolean)
}

const getFieldByConfiguredIds = async (fieldIds = [], token = "") => {
  const nextFieldIds = buildUniqueStringList(fieldIds)
  const results = await Promise.allSettled(nextFieldIds.map((fieldId) => getFieldById(fieldId, token)))
  const fields = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value?.field || result.value)
    .filter(Boolean)
  const resolvedFieldIds = new Set(
    fields
      .map((field) => String(field?.id || "").trim())
      .filter(Boolean)
  )
  const snapshotFields = nextFieldIds
    .filter((fieldId) => !resolvedFieldIds.has(String(fieldId || "").trim()))
    .map((fieldId) => mergeStoredFieldSnapshot(getStoredFieldSnapshots()[String(fieldId || "").trim()]))
    .filter(Boolean)
  const mergedFields = [...fields, ...snapshotFields]

  rememberKnownFieldIds(mergedFields.map((field) => field?.id))

  return mergedFields
}

export const getFields = async (token = "") => {
  const knownFieldIds = buildUniqueStringList([...CONFIGURED_FIELD_IDS, ...getStoredKnownFieldIds()])
  const storedSnapshotFields = getStoredFieldSnapshotList()

  if (CONFIGURED_FIELD_IDS.length > 0) {
    return {
      fields: await getFieldByConfiguredIds(CONFIGURED_FIELD_IDS, token),
    }
  }

  let response = {}
  let lastError = null

  try {
    response = await requestWithTransientRetry(
      "/field/getAllField",
      token ? { headers: createTokenHeaders(token) } : {},
      RENDER_LONG_READ_RETRY_CONFIG
    )
  } catch (error) {
    lastError = error
  }

  if (lastError) {
    if (knownFieldIds.length > 0) {
      const rememberedFields = await getFieldByConfiguredIds(knownFieldIds, token)

      if (rememberedFields.length > 0) {
        return {
          fields: rememberedFields,
          message:
            "Backend hiện tại không có API danh sách sân. Frontend đang hiển thị các sân đã ghi nhớ từ trước.",
        }
      }
    }

    if (storedSnapshotFields.length > 0) {
      const hydratedSnapshotFields = await attachSubFieldsToFields(storedSnapshotFields, token)
      rememberKnownFieldIds(hydratedSnapshotFields.map((field) => field?.id))
      return {
        fields: hydratedSnapshotFields,
        message:
          "Backend hiện tại lỗi API danh sách sân. Frontend đang hiển thị lại các sân đã lưu cục bộ.",
      }
    }

    return {
      fields: [],
      message:
        "Backend hiện tại không có API danh sách sân. Sau khi tạo sân ở màn này, frontend sẽ tự ghi nhớ fieldId để tải lại ở lần sau.",
    }
  }

  const fields = await attachSubFieldsToFields(
    getArrayFromResponse(response, [
      "fields",
      "items",
      "docs",
      "rows",
      "records",
      "results",
      "list",
      "fieldList",
      "fields.docs",
      "fields.items",
      "result",
    ])
      .map((item) => mergeStoredFieldSnapshot(item))
      .filter(Boolean),
    token
  )

  if (fields.length === 0 && knownFieldIds.length > 0) {
    const rememberedFields = await getFieldByConfiguredIds(knownFieldIds, token)
    if (rememberedFields.length > 0) {
      return {
        fields: rememberedFields,
        message:
          String(response?.message || "").trim()
          || "Đang hiển thị các sân đã ghi nhớ trong khi API danh sách chưa trả dữ liệu.",
      }
    }
  }

  if (fields.length === 0 && storedSnapshotFields.length > 0) {
    const hydratedSnapshotFields = await attachSubFieldsToFields(storedSnapshotFields, token)
    rememberKnownFieldIds(hydratedSnapshotFields.map((field) => field?.id))
    return {
      fields: hydratedSnapshotFields,
      message:
        String(response?.message || "").trim()
        || "Đang hiển thị các sân đã lưu cục bộ trong khi API danh sách chưa trả dữ liệu.",
    }
  }

  rememberKnownFieldIds(fields.map((field) => field?.id))

  return {
    fields,
  }
}

export const getFieldById = async (fieldId, token = "") => {
  const encodedFieldId = encodeURIComponent(String(fieldId || "").trim())
  let response = null
  const detailPath = token
    ? `/field/getFieldDetail/${encodedFieldId}`
    : `/field/getField/${encodedFieldId}`

  try {
    response = await requestWithTransientRetry(
      detailPath,
      token ? { headers: createTokenHeaders(token) } : {},
      RENDER_SHORT_READ_RETRY_CONFIG
    )
  } catch (error) {
    const storedField = mergeStoredFieldSnapshot(
      getStoredFieldSnapshots()[String(fieldId || "").trim()]
    )

    if (storedField) {
      const field = await attachSubFieldsToField(storedField, token)

      if (field?.id) {
        rememberKnownFieldIds(field.id)
      }

      return {
        field,
        message:
          "Backend chi tiết sân đang lỗi. Frontend đang hiển thị lại dữ liệu đã lưu cục bộ.",
      }
    }

    throw error
  }

  const baseField =
    mergeStoredFieldSnapshot(getObjectFromResponse(response, ["field", "item", "record", "result"]))
    || mergeStoredFieldSnapshot(unwrapResponseData(response))
  const field = await attachSubFieldsToField(baseField, token)

  if (field?.id) {
    rememberKnownFieldIds(field.id)
  }

  return {
    field,
    message: String(response?.message || "").trim(),
  }
}

export const getAdminFields = async (token) => getFields(token)

export const getAdminDashboard = async (token, params = {}) => {
  const response = await requestFirstSuccessWithTransientRetry(
    BOOKING_DASHBOARD_PATHS(params),
    {
      headers: createTokenHeaders(token),
    },
    RENDER_LONG_READ_RETRY_CONFIG
  )
  const payload = getObjectFromResponse(response, ["dashboard"]) || unwrapResponseData(response) || {}

  return {
    stats:
      getObjectFromResponse(response, ["stats", "dashboard.stats"])
      || payload?.stats
      || {},
    recentBookings:
      getArrayFromResponse(response, ["recentBookings", "dashboard.recentBookings"])
      || getArrayFromResponse(payload, ["recentBookings"]),
    managedBookings:
      getArrayFromResponse(response, ["managedBookings", "dashboard.managedBookings"])
      || getArrayFromResponse(payload, ["managedBookings"]),
    dailyAvailability:
      getArrayFromResponse(response, ["dailyAvailability", "dashboard.dailyAvailability"])
      || getArrayFromResponse(payload, ["dailyAvailability"]),
    customerMonthlyStats:
      getArrayFromResponse(response, ["customerMonthlyStats", "dashboard.customerMonthlyStats"])
      || getArrayFromResponse(payload, ["customerMonthlyStats"]),
    customerSummaries:
      getArrayFromResponse(response, ["customerSummaries", "dashboard.customerSummaries"])
      || getArrayFromResponse(payload, ["customerSummaries"]),
    availabilityDate: String(payload?.availabilityDate || params?.date || "").trim(),
    message: String(response?.message || "").trim(),
  }
}

export const getAdminContacts = async () => ({
  contacts: [],
  message: "Backend hiện tại không cung cấp API liên hệ.",
})

export const deleteAdminContact = async () => {
  throw new Error("Backend hiện tại không cung cấp API xóa liên hệ.")
}

export const confirmAdminBooking = async (token, bookingId) =>
  requestFirstSuccess(BOOKING_CONFIRM_PATHS(bookingId), {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({ status: "CONFIRMED" }),
  })

export const cancelAdminBooking = async (token, bookingId) =>
  requestFirstSuccess(BOOKING_CONFIRM_PATHS(bookingId), {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({ status: "CANCELLED" }),
  })

const getLatestPaymentByBooking = async (token, bookingId) => {
  const response = await request(`/payment/getPaymentByBooking/${encodeURIComponent(bookingId)}`, {
    headers: createTokenHeaders(token),
  })

  const payments = getArrayFromResponse(response, ["data", "payments", "items"])
    .map((item) => normalizePaymentItem(item))
    .filter(Boolean)

  return payments[0] || null
}

const confirmBookingPaymentByBookingId = async (token, bookingId) => {
  const normalizedBookingId = String(bookingId || "").trim()
  let payment = await getLatestPaymentByBooking(token, normalizedBookingId).catch(() => null)

  if (!payment?.id) {
    const createdPayment = await createBookingPayment(token, normalizedBookingId, "CASH")
    payment = createdPayment?.payment || null
  }

  const paymentId = String(payment?.id || payment?._id || "").trim()
  if (!paymentId) {
    throw new Error("Không tìm thấy payment hợp lệ cho booking này.")
  }

  const response = await confirmPayment(token, paymentId)
  return {
    ...response,
    message: String(response?.message || "").trim() || "Đã xác nhận thanh toán thành công.",
  }
}

export const confirmAdminBookingDeposit = async (token, bookingId) =>
  confirmBookingPaymentByBookingId(token, bookingId)

export const confirmAdminBookingPayment = async (token, bookingId) =>
  confirmBookingPaymentByBookingId(token, bookingId)

export const uploadAdminImage = async (token, file) => {
  if (!file) {
    throw new Error("Vui lòng chọn tệp ảnh.")
  }

  const formData = new FormData()
  formData.append("file", file)

  const response = await request("/upload/image", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: formData,
  })

  const imageUrl = String(
    pickFirstValue(response, ["url", "data.url", "file.url", "data.file.url"])
    || ""
  ).trim()

  if (!imageUrl) {
    throw new Error("Không nhận được URL ảnh từ backend.")
  }

  return {
    file: {
      url: imageUrl,
      path: imageUrl,
      name: String(file.name || "").trim(),
    },
    message: "Đã đọc ảnh từ thiết bị của bạn.",
  }
}

export const createAdminSubField = async (token, payload) => {
  const response = await request("/subField/createSubField", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(payload),
  })

  return {
    subField:
      normalizeSubFieldItem(getObjectFromResponse(response, ["subField", "item"]))
      || normalizeSubFieldItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const updateAdminSubField = async (token, subFieldId, payload) => {
  const response = await request(`/subField/updateSubField/${encodeURIComponent(String(subFieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(payload),
  })

  return {
    subField:
      normalizeSubFieldItem(getObjectFromResponse(response, ["subField", "item"]))
      || normalizeSubFieldItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const deleteAdminSubField = async (token, subFieldId) =>
  request(`/subField/deleteSubField/${encodeURIComponent(String(subFieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

const syncAdminFieldSubFields = async (token, fieldId, payload = {}, currentSubFields = []) => {
  const desiredSubFields = (Array.isArray(payload?.subFields) ? payload.subFields : [])
    .map((subField, index) => ({
      id: String(subField?.id || "").trim(),
      ...buildSubFieldMutationPayload(
        {
          ...subField,
          key: subField?.key || `san-${index + 1}`,
        },
        payload?.openHours
      ),
    }))
    .filter((subField) => subField.key && subField.name && subField.type)

  const existingSubFields = (Array.isArray(currentSubFields) ? currentSubFields : [])
    .map((subField, index) => normalizeSubFieldItem(subField, index))
    .filter(Boolean)

  const existingById = new Map(
    existingSubFields
      .filter((subField) => subField?.id)
      .map((subField) => [String(subField.id), subField])
  )
  const existingByKey = new Map(
    existingSubFields
      .filter((subField) => subField?.key)
      .map((subField) => [String(subField.key), subField])
  )

  const retainedIds = new Set()

  for (const subField of desiredSubFields) {
    const matchedSubField =
      (subField.id && existingById.get(String(subField.id)))
      || existingByKey.get(String(subField.key))

    if (matchedSubField?.id) {
      retainedIds.add(String(matchedSubField.id))
      await updateAdminSubField(token, matchedSubField.id, {
        key: subField.key,
        name: subField.name,
        type: subField.type,
        pricePerHour: subField.pricePerHour,
        openHours: subField.openHours,
      })
      continue
    }

    const createdSubField = await createAdminSubField(token, {
      fieldId: String(fieldId || "").trim(),
      key: subField.key,
      name: subField.name,
      type: subField.type,
      pricePerHour: subField.pricePerHour,
      openHours: subField.openHours,
    })

    if (createdSubField?.subField?.id) {
      retainedIds.add(String(createdSubField.subField.id))
    }
  }

  const removableSubFields = existingSubFields.filter((subField) => {
    const normalizedId = String(subField?.id || "").trim()
    return normalizedId && !retainedIds.has(normalizedId)
  })

  for (const subField of removableSubFields) {
    await deleteAdminSubField(token, subField.id)
  }

  return getSubFieldsByField(fieldId, token)
}

export const createAdminField = async (token, payload) => {
  const response = await request("/field/createField", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(buildFieldMutationPayload(payload)),
  })

  const responseField =
    getObjectFromResponse(response, ["field", "item", "record", "result"])
    || unwrapResponseData(response)
  const resolvedFieldId = normalizeId(
    responseField?.id,
    responseField?._id,
    responseField?.fieldId,
    responseField?.field?.id,
    responseField?.field?._id,
    responseField?.field?.fieldId
  )
  const baseField =
    mergeFieldSources(responseField?.field || responseField, payload)
    || mergeFieldSources(payload, {})

  if (resolvedFieldId) {
    rememberKnownFieldIds(resolvedFieldId)
  }

  if (resolvedFieldId) {
    rememberFieldSnapshot(
      { ...baseField, id: resolvedFieldId, _id: resolvedFieldId, fieldId: resolvedFieldId }
    )
  }

  let hydratedField = baseField

  if (resolvedFieldId) {
    try {
      await syncAdminFieldSubFields(token, resolvedFieldId, payload, [])
    } catch (_error) {
      // Field itself may already be created successfully even if syncing subfields fails.
    }
  }

  if (resolvedFieldId) {
    try {
      const { field } = await getFieldById(resolvedFieldId, token)
      hydratedField = field || hydratedField
    } catch (_error) {
      hydratedField = mergeStoredFieldSnapshot(hydratedField)
    }
  }

  if (hydratedField?.id || resolvedFieldId) {
    rememberKnownFieldIds(hydratedField?.id || resolvedFieldId)
    rememberFieldSnapshot(
      hydratedField || { ...payload, id: resolvedFieldId, _id: resolvedFieldId, fieldId: resolvedFieldId }
    )
  }

  return {
    field: hydratedField,
    message: String(response?.message || "").trim(),
  }
}

export const updateAdminField = async (token, fieldId, payload) => {
  const response = await request(`/field/updateField/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(buildFieldMutationPayload(payload)),
  })

  const normalizedFieldId = String(fieldId || "").trim()
  let currentSubFields = []
  try {
    const subFieldData = await getSubFieldsByField(normalizedFieldId, token)
    currentSubFields = Array.isArray(subFieldData?.subFields) ? subFieldData.subFields : []
  } catch (_error) {
    currentSubFields = []
  }

  try {
    await syncAdminFieldSubFields(token, normalizedFieldId, payload, currentSubFields)
  } catch (_error) {
    // Preserve the field update success even if syncing subfields fails afterward.
  }

  const baseField =
    mergeFieldSources(getObjectFromResponse(response, ["field", "item"]), {
      ...payload,
      id: fieldId,
      _id: fieldId,
      fieldId,
    })
    || mergeFieldSources(unwrapResponseData(response), {
      ...payload,
      id: fieldId,
      _id: fieldId,
      fieldId,
    })
    || mergeFieldSources(
      {
        ...payload,
        id: fieldId,
        _id: fieldId,
        fieldId,
      },
      {}
    )
  let hydratedField = baseField

  if (normalizedFieldId) {
    try {
      const { field } = await getFieldById(normalizedFieldId, token)
      hydratedField = field || hydratedField
    } catch (_error) {
      hydratedField = mergeStoredFieldSnapshot(hydratedField)
    }
  }

  if (hydratedField?.id || fieldId) {
    rememberKnownFieldIds(hydratedField?.id || fieldId)
    rememberFieldSnapshot(hydratedField || { ...payload, id: fieldId, _id: fieldId, fieldId })
  }

  return {
    field: hydratedField,
    message: String(response?.message || "").trim(),
  }
}

export const deleteAdminField = async (token, fieldId) =>
  request(`/field/deleteField/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    headers: createTokenHeaders(token),
  }).then((response) => {
    forgetKnownFieldId(fieldId)
    forgetStoredFieldSnapshot(fieldId)
    return response
  })

export const approveAdminField = async (token, fieldId) =>
  requestWithTransientRetry(`/field/approveField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const rejectAdminField = async (token, fieldId, reason = "") =>
  requestWithTransientRetry(`/field/rejectField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      reason: String(reason || "").trim(),
    }),
  })

export const lockAdminField = async (token, fieldId) =>
  requestWithTransientRetry(`/field/lockField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const unlockAdminField = async (token, fieldId) =>
  requestWithTransientRetry(`/field/unlockField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const createBooking = async (token, payload) => {
  const response = await requestFirstSuccess(BOOKING_CREATE_PATHS, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      subFieldId: String(payload?.subFieldId || "").trim(),
      timeSlotId: String(payload?.timeSlotId || "").trim(),
      date: String(payload?.date || "").trim(),
      phone: String(payload?.phone || "").trim(),
      note: String(payload?.note || "").trim(),
    }),
  })

  const booking = attachBookingHoldInfo(
    getObjectFromResponse(response, ["booking", "item"]) || unwrapResponseData(response),
    response
  )

  return {
    booking,
    message: String(response?.message || "").trim(),
  }
}

export const getBookedSlots = async (subFieldId, date, token = "") => {
  const normalizedSubFieldId = String(subFieldId || "").trim()
  const normalizedDate = String(date || "").trim()

  if (!normalizedSubFieldId || !normalizedDate) {
    return {
      timeSlotIds: [],
      message: "",
    }
  }

  const response = await requestFirstSuccessWithTransientRetry(
    BOOKED_SLOT_PATHS(normalizedSubFieldId, normalizedDate),
    {
      headers: createTokenHeaders(token),
    },
    RENDER_SHORT_READ_RETRY_CONFIG
  )

  const bookingSlotItems = getArrayFromResponse(
    response,
    ["bookings", "bookedSlots", "slots", "items"]
  )
  const bookedTimeSlotItems = getArrayFromResponse(
    response,
    ["bookedTimeSlotIds", "timeSlotIds"]
  )
  const slotRecords = (
    bookingSlotItems.length > 0
      ? bookingSlotItems
      : bookedTimeSlotItems
  )
    .map((item, index) => {
      if (typeof item === "string") {
        const timeSlotId = String(item || "").trim()
        if (!timeSlotId) {
          return null
        }

        return {
          id: `booked-slot:${normalizedSubFieldId}:${normalizedDate}:${timeSlotId}`,
          _id: `booked-slot:${normalizedSubFieldId}:${normalizedDate}:${timeSlotId}`,
          subFieldId: normalizedSubFieldId,
          date: normalizedDate,
          timeSlotId,
          timeSlot: "",
          timeSlotInfo: null,
          status: "PENDING",
          holdExpiresAt: "",
          phone: "",
          customer: null,
        }
      }

      const normalizedBooking = normalizeBookingItem(item) || null
      const normalizedTimeSlot =
        normalizeTimeSlotItem(item?.timeSlotInfo, index)
        || normalizeTimeSlotItem(item?.timeSlot, index)
        || normalizeTimeSlotItem(item, index)

      const timeSlotId = normalizeId(
        normalizedBooking?.timeSlotId,
        item?.timeSlotId,
        item?.timeSlotInfo?.id,
        item?.timeSlotInfo?._id,
        normalizedTimeSlot?.id
      )
      const timeSlot = String(
        normalizedBooking?.timeSlot
        || item?.timeSlotLabel
        || item?.timeSlot
        || normalizedTimeSlot?.timeSlot
        || normalizedTimeSlot?.label
        || ""
      ).trim()

      if (!timeSlotId && !timeSlot) {
        return null
      }

      const slotRecordId =
        String(normalizedBooking?.id || normalizedBooking?._id || "").trim()
        || `booked-slot:${normalizedSubFieldId}:${normalizedDate}:${timeSlotId || timeSlot || index + 1}`

      return {
        ...normalizedBooking,
        id: slotRecordId,
        _id: slotRecordId,
        subFieldId: String(normalizedBooking?.subFieldId || normalizedSubFieldId).trim(),
        date: String(normalizedBooking?.date || normalizedDate).trim(),
        phone: String(
          normalizedBooking?.phone
          || normalizedBooking?.customer?.phone
          || item?.phone
          || ""
        ).trim(),
        customer: normalizedBooking?.customer || null,
        timeSlotId,
        timeSlot,
        timeSlotInfo: normalizedBooking?.timeSlotInfo || normalizedTimeSlot || null,
        status: String(normalizedBooking?.status || item?.status || "PENDING").trim(),
        holdExpiresAt: String(
          normalizedBooking?.holdExpiresAt
          || normalizedBooking?.expiredAt
          || item?.holdExpiresAt
          || item?.expiredAt
          || ""
        ).trim(),
      }
    })
    .filter(Boolean)

  return {
    timeSlotIds: slotRecords.map((item) => String(item?.timeSlotId || "").trim()).filter(Boolean),
    slotRecords,
    message: String(response?.message || "").trim(),
  }
}

export const getBookingById = async (bookingId, token = "") => {
  const response = await requestFirstSuccessWithTransientRetry(
    BOOKING_BY_ID_PATHS(bookingId),
    {
      headers: createTokenHeaders(token),
    },
    RENDER_SHORT_READ_RETRY_CONFIG
  )

  return {
    booking: attachBookingHoldInfo(
      getObjectFromResponse(response, ["booking", "item"]) || unwrapResponseData(response),
      response
    ),
    message: String(response?.message || "").trim(),
  }
}

export const getMyBookings = async (token) => {
  const response = await requestFirstSuccessWithTransientRetry(
    BOOKING_MY_LIST_PATHS,
    {
      method: "POST",
      headers: createTokenHeaders(token),
      body: JSON.stringify({}),
    },
    RENDER_LONG_READ_RETRY_CONFIG
  )

  return {
    bookings: getArrayFromResponse(response, ["bookings", "items", "rows", "records", "results", "list", "bookingList", "myBookings"])
      .map((item) => normalizeBookingItem(item))
      .filter(Boolean),
  }
}

export const cancelMyBooking = async (token, bookingId) => {
  const response = await requestFirstSuccess(BOOKING_CANCEL_PATHS(bookingId), {
    headers: createTokenHeaders(token),
  })

  return {
    booking: attachBookingHoldInfo(
      getObjectFromResponse(response, ["booking", "item"]) || unwrapResponseData(response),
      response
    ),
    message: String(response?.message || "").trim(),
  }
}

export const confirmBookingStatus = async (token, bookingId) => {
  const response = await requestFirstSuccess(BOOKING_CONFIRM_PATHS(bookingId), {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({ status: "CONFIRMED" }),
  })

  return {
    booking: attachBookingHoldInfo(
      getObjectFromResponse(response, ["booking", "item"]) || unwrapResponseData(response),
      response
    ),
    message: String(response?.message || "").trim(),
  }
}

export const createBookingPayment = async (
  token,
  bookingId,
  method = "CASH",
  paymentType = "DEPOSIT",
  amount = null,
  bookingIds = []
) => {
  const normalizedAmount = Number(amount)
  const hasExplicitAmount = Number.isFinite(normalizedAmount) && normalizedAmount > 0
  const normalizedBookingIds = Array.from(
    new Set(
      (Array.isArray(bookingIds) ? bookingIds : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  )

  const response = await request("/payment/createPayment", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      bookingId: String(bookingId || "").trim(),
      ...(normalizedBookingIds.length > 0 ? { bookingIds: normalizedBookingIds } : {}),
      method: String(method || "CASH").trim().toUpperCase(),
      paymentType: String(paymentType || "DEPOSIT").trim().toUpperCase(),
      type: String(paymentType || "DEPOSIT").trim().toUpperCase(),
      ...(hasExplicitAmount
        ? {
            amount: normalizedAmount,
            price: normalizedAmount,
            paymentAmount: normalizedAmount,
          }
        : {}),
    }),
  })

  return {
    payment:
      normalizePaymentItem(getObjectFromResponse(response, ["payment", "item"]))
      || normalizePaymentItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const getMyPayments = async (token) => {
  const response = await request("/payment/getMyPayments", {
    headers: createTokenHeaders(token),
  })

  return {
    payments: getArrayFromResponse(response, ["payments", "items"]).map((item) => normalizePaymentItem(item)).filter(Boolean),
  }
}

export const getPaymentByBooking = async (token, bookingId) => {
  const payment = await getLatestPaymentByBooking(token, bookingId)

  return {
    payment,
    message: "",
  }
}

export const confirmPayment = async (token, paymentId) =>
  request("/payment/confirmPayment", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      paymentId: String(paymentId || "").trim(),
    }),
  })

export const checkPaymentStatus = async (token, paymentId) => {
  const response = await request(`/payment/checkStatus/${encodeURIComponent(String(paymentId || "").trim())}`, {
    headers: createTokenHeaders(token),
  })

  return {
    payment:
      normalizePaymentItem(getObjectFromResponse(response, ["payment", "item"]))
      || normalizePaymentItem(unwrapResponseData(response)),
    momoStatus:
      getObjectFromResponse(response, ["momoStatus"])
      || pickFirstValue(response, ["data.momoStatus"])
      || null,
    message: String(response?.message || "").trim(),
  }
}

export const cancelBookingPayment = async (token, paymentId) =>
  request(`/payment/cancelPayment/${encodeURIComponent(paymentId)}`, {
    headers: createTokenHeaders(token),
  })

export const getPaymentQr = async (token, paymentId) => {
  const response = await request(`/payment/getQR/${encodeURIComponent(paymentId)}`, {
    headers: createTokenHeaders(token),
  })

  const payloadData = unwrapResponseData(response)
  const qrImage = String(
    pickFirstValue(payloadData, ["qrImage", "qrImageUrl", "url"])
    || pickFirstValue(response, ["data.qrImage", "data.qrImageUrl", "qrImage", "qrImageUrl"])
    || ""
  ).trim()
  const qrText = String(
    pickFirstValue(payloadData, ["qrText", "qrCode", "content", "qr"])
    || pickFirstValue(response, ["data.qrText", "data.qrCode", "qrText", "qrCode", "data.qr", "qr"])
    || ""
  ).trim()
  const payUrl = String(
    pickFirstValue(payloadData, ["payUrl", "paymentUrl"])
    || pickFirstValue(response, ["data.payUrl", "payUrl", "data.paymentUrl", "paymentUrl"])
    || ""
  ).trim()
  const deeplink = String(
    pickFirstValue(payloadData, ["deeplink", "deepLink"])
    || pickFirstValue(response, ["data.deeplink", "deeplink", "data.deepLink", "deepLink"])
    || ""
  ).trim()

  return {
    qrCode: qrText || qrImage,
    qrImage,
    qrText,
    payUrl,
    deeplink,
    expiredAt:
      pickFirstValue(payloadData, ["expiredAt"])
      || pickFirstValue(response, ["data.expiredAt", "expiredAt"])
      || null,
    createdAt:
      pickFirstValue(payloadData, ["createdAt"])
      || pickFirstValue(response, ["data.createdAt", "createdAt"])
      || null,
    raw: response,
  }
}

export const getBookingDepositInfo = async (token, bookingId) => {
  const [{ booking }, { payment }] = await Promise.all([
    getBookingById(bookingId, token),
    getPaymentByBooking(token, bookingId).catch(() => ({ payment: null })),
  ])

  return buildBookingPaymentShape(booking, payment)
}

export const confirmStaticDeposit = async (token, bookingId) => {
  const response = await createBookingPayment(token, bookingId, "CASH")
  const info = await getBookingDepositInfo(token, bookingId)

  return {
    ...info,
    message: response.message || "Đã tạo yêu cầu thanh toán.",
  }
}

export const createVnpayDepositPayment = async (token, bookingId) =>
  createBookingPayment(token, bookingId, "QR")

export const createMomoDepositPayment = async (token, bookingId) =>
  createBookingPayment(token, bookingId, "QR")

export const sendContact = async (contactData) => {
  const response = await request("/contact/sendContact", {
    method: "POST",
    body: JSON.stringify({
      name: String(contactData.name || "").trim(),
      email: String(contactData.email || "").trim(),
      phone: String(contactData.phone || "").trim(),
      message: String(contactData.message || "").trim(),
    }),
  })
  
  const message = response.message || "Có lỗi [all] khi gửi"
  
  if (response.status !== 201 && !response.success) {
    throw new Error(message)
  }
  
  return response.data
}
