import { normalizeFieldType } from "./fieldTypeModel"

const normalizeApiBaseUrl = (value) => String(value || "").trim().replace(/\/+$/g, "")

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
  const isLocalHost =
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
    || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)

  if (isLocalHost) {
    return `http://${hostname || "localhost"}:5000`
  }

  return "https://api-be-football.onrender.com"
}

const API_BASE_URL = ensureApiBaseUrl(process.env.REACT_APP_API_URL || getDefaultApiOrigin())
const CONFIGURED_FIELD_IDS = String(process.env.REACT_APP_FIELD_IDS || "")
  .split(",")
  .map((value) => String(value || "").trim())
  .filter(Boolean)
const EMAILJS_SEND_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send"
const EMAILJS_SERVICE_ID = String(process.env.REACT_APP_EMAILJS_SERVICE_ID || "").trim()
const EMAILJS_TEMPLATE_ID = String(process.env.REACT_APP_EMAILJS_TEMPLATE_ID || "").trim()
const EMAILJS_PUBLIC_KEY = String(process.env.REACT_APP_EMAILJS_PUBLIC_KEY || "").trim()
const REGISTER_PATHS = ["/user/register", "/register"]
const LOGIN_PATHS = ["/user/login", "/login"]
const GET_ME_PATHS = ["/user/getMe", "/getMe"]
const KNOWN_FIELD_IDS_STORAGE_KEY = "sanbong_known_field_ids"
const FIELD_SNAPSHOTS_STORAGE_KEY = "sanbong_field_snapshots"

const isManagedUserOtpConfigured = () =>
  Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY)

const getManagedUserOtpConfigMessage = () =>
  "Tài liệu BE hiện tại chưa có API OTP email."

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

  return `API khong ho tro ${String(match[1] || "").toUpperCase()} ${String(match[2] || "").trim()}.`
}

const buildApiUnavailableMessage = (requestPath) =>
  `Không thể kết nối đến API (${API_BASE_URL}). Vui lòng kiểm tra backend đang chạy (${requestPath}).`

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
    const normalized = String(value || "").trim()
    if (normalized) {
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

const normalizeBookingItem = (booking) => {
  if (!booking || typeof booking !== "object") {
    return null
  }

  const id = normalizeId(booking.id, booking._id, booking.bookingId)
  const field = normalizeFieldItem(booking.field)
  const subField = normalizeSubFieldItem(booking.subField)
  const timeSlot = normalizeTimeSlotItem(booking.timeSlotInfo || booking.timeSlot)

  return {
    ...booking,
    id: id || normalizeId(booking.paymentId, booking.createdAt),
    _id: id || normalizeId(booking.paymentId, booking.createdAt),
    userId: normalizeId(booking.userId, booking.user?._id, booking.user?.id),
    fieldId: normalizeId(booking.fieldId, field?.id),
    subFieldId: normalizeId(booking.subFieldId, subField?.id),
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
    date: String(booking.date || booking.bookingDate || "").trim(),
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
    createdAt: booking.createdAt || booking.updatedAt || null,
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
    amount: Number(payment.amount || payment.price || 0),
    method: String(payment.method || payment.paymentMethod || "").trim().toUpperCase(),
    status: String(payment.status || payment.paymentStatus || "").trim().toUpperCase(),
    qrCode: String(payment.qrCode || payment.qr || payment.qrUrl || "").trim(),
    qrImage: String(payment.qrImage || payment.qrImageUrl || "").trim(),
    qrText: String(payment.qrText || payment.content || "").trim(),
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

  let response
  try {
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

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
    })
  } catch (_error) {
    throw new Error(buildApiUnavailableMessage(requestPath))
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

  if (!response.ok) {
    const errorMessage =
      getMessageFromBody(data, rawBodyText)
      || `Yeu cau that bai (${response.status}) tai ${requestPath}.`
    throw new Error(errorMessage)
  }

  return data || {}
}

const requestFirstSuccess = async (paths, options = {}) => {
  let lastError = null

  for (const path of paths) {
    try {
      return await request(path, options)
    } catch (error) {
      lastError = error
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
            : "Chi co the lay QR khi da tao payment va payment chua hoan tat.",
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

export const requestRegisterOtp = async () => ({
  message: "Backend hien tai khong su dung OTP trong quy trinh dang ky.",
})

export const canSendManagedUserOtp = () => isManagedUserOtpConfigured()

export const getManagedUserOtpSetupMessage = () => getManagedUserOtpConfigMessage()

export const requestManagedUserOtp = async (payload = {}) => {
  if (!isManagedUserOtpConfigured()) {
    throw new Error(getManagedUserOtpConfigMessage())
  }

  const email = String(payload?.email || "").trim().toLowerCase()
  const otpCode = String(payload?.otpCode || "").trim()

  if (!email) {
    throw new Error("Vui lòng nhập email trước khi gửi OTP.")
  }

  if (!otpCode) {
    throw new Error("Không tạo được mã OTP để gửi email.")
  }

  let response
  try {
    response = await fetch(EMAILJS_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: email,
          user_email: email,
          email,
          otp_code: otpCode,
          otp: otpCode,
          passcode: otpCode,
          user_name: String(payload?.name || "").trim() || "Khach hang",
          name: String(payload?.name || "").trim() || "Khach hang",
          account_role: String(payload?.roleLabel || "").trim() || "Người dùng",
          role: String(payload?.roleLabel || "").trim() || "Người dùng",
          admin_email: String(payload?.adminEmail || "").trim().toLowerCase(),
          expires_in_minutes: Number(payload?.expiresInMinutes || 5),
          expires_minutes: Number(payload?.expiresInMinutes || 5),
          site_name: "SanBong",
          app_name: "SanBong",
        },
      }),
    })
  } catch (_error) {
    throw new Error("Không thể kết nối đến dịch vụ gửi OTP email.")
  }

  let rawBodyText = ""
  try {
    rawBodyText = await response.text()
  } catch (_error) {
    rawBodyText = ""
  }

  if (!response.ok) {
    const message = String(rawBodyText || "").trim()
    throw new Error(message || "Dich vu gui email tu choi yeu cau gui OTP.")
  }

  return {
    message: "Đã gửi mã OTP về email người nhận.",
  }
}

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
  requestFirstSuccess(["/requestOwner", "/user/requestOwner"], {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const getOwnerRequests = async (token) => {
  const response = await requestFirstSuccess(["/getOwnerRequests", "/user/getOwnerRequests"], {
    headers: createTokenHeaders(token),
  })

  return {
    requests: getArrayFromResponse(response, ["requests", "users"]).map((item) => normalizeAuthUser(item)).filter(Boolean),
    message: String(response?.message || "").trim(),
  }
}

export const approveOwnerRequest = async (token, userId) =>
  requestFirstSuccess([
    `/approveOwner/${encodeURIComponent(String(userId || "").trim())}`,
    `/user/approveOwner/${encodeURIComponent(String(userId || "").trim())}`,
  ], {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const rejectOwnerRequest = async (token, userId) =>
  requestFirstSuccess([
    `/rejectOwner/${encodeURIComponent(String(userId || "").trim())}`,
    `/user/rejectOwner/${encodeURIComponent(String(userId || "").trim())}`,
  ], {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const downgradeOwnerRole = async (token, userId) =>
  requestFirstSuccess([
    `/downgradeOwner/${encodeURIComponent(String(userId || "").trim())}`,
    `/user/downgradeOwner/${encodeURIComponent(String(userId || "").trim())}`,
  ], {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const getTimeSlots = async () => {
  const response = await request("/timeSlot/getAllTimeSlot")
  return {
    timeSlots: getArrayFromResponse(response, ["timeSlots"]).map((item, index) => normalizeTimeSlotItem(item, index)).filter(Boolean),
  }
}

export const getSubFieldsByField = async (fieldId, token = "") => {
  const encodedFieldId = encodeURIComponent(String(fieldId || "").trim())
  const response = await request(`/subField/getByField/${encodedFieldId}`, token ? {
    headers: createTokenHeaders(token),
  } : {})

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

  rememberKnownFieldIds(fields.map((field) => field?.id))

  return fields
}

export const getFields = async (token = "") => {
  const knownFieldIds = buildUniqueStringList([...CONFIGURED_FIELD_IDS, ...getStoredKnownFieldIds()])

  if (CONFIGURED_FIELD_IDS.length > 0) {
    return {
      fields: await getFieldByConfiguredIds(CONFIGURED_FIELD_IDS, token),
    }
  }

  let response = {}
  let lastError = null

  try {
    response = await requestFirstSuccess(
      ["/field/getAllField", "/field/getAllFields", "/field/getFields"],
      token ? { headers: createTokenHeaders(token) } : {}
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
            "Backend hien tai khong co API danh sach san. Frontend dang hien thi cac san da ghi nho tu truoc.",
        }
      }
    }

    return {
      fields: [],
      message:
        "Backend hien tai khong co API danh sach san. Sau khi tao san o man nay, frontend se tu ghi nho fieldId de tai lai o lan sau.",
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
          || "Dang hien thi cac san da ghi nho trong khi API danh sach chua tra du lieu.",
      }
    }
  }

  rememberKnownFieldIds(fields.map((field) => field?.id))

  return {
    fields,
  }
}

export const getFieldById = async (fieldId, token = "") => {
  const encodedFieldId = encodeURIComponent(String(fieldId || "").trim())
  const response = await requestFirstSuccess(
    token
      ? [`/field/getFieldDetail/${encodedFieldId}`, `/field/getField/${encodedFieldId}`]
      : [`/field/getField/${encodedFieldId}`, `/field/getFieldDetail/${encodedFieldId}`],
    token ? { headers: createTokenHeaders(token) } : {}
  )

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

export const getAdminDashboard = async (_token, params = {}) => ({
  stats: {},
  recentBookings: [],
  managedBookings: [],
  dailyAvailability: [],
  customerMonthlyStats: [],
  customerSummaries: [],
  availabilityDate: String(params?.date || "").trim(),
  message: "Backend hien tai khong cung cap API dashboard tong hop.",
})

export const getAdminContacts = async () => ({
  contacts: [],
  message: "Backend hien tai khong cung cap API lien he.",
})

export const deleteAdminContact = async () => {
  throw new Error("Backend hiện tại không cung cấp API xóa liên hệ.")
}

export const confirmAdminBooking = async (token, bookingId) =>
  request(`/booking/updateStatus/${encodeURIComponent(bookingId)}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({ status: "CONFIRMED" }),
  })

export const cancelAdminBooking = async (token, bookingId) =>
  request(`/booking/updateStatus/${encodeURIComponent(bookingId)}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({ status: "CANCELLED" }),
  })

export const confirmAdminBookingDeposit = async (token, bookingId) =>
  request("/payment/confirmPayment", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      bookingId: String(bookingId || "").trim(),
    }),
  })

export const confirmAdminBookingPayment = async (token, bookingId) =>
  request("/payment/confirmPayment", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      bookingId: String(bookingId || "").trim(),
    }),
  })

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
    throw new Error("Khong nhan duoc URL anh tu backend.")
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
  request(`/field/approveField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const rejectAdminField = async (token, fieldId, reason = "") =>
  request(`/field/rejectField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      reason: String(reason || "").trim(),
    }),
  })

export const lockAdminField = async (token, fieldId) =>
  request(`/field/lockField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const unlockAdminField = async (token, fieldId) =>
  request(`/field/unlockField/${encodeURIComponent(String(fieldId || "").trim())}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

export const createBooking = async (token, payload) => {
  const response = await request("/booking/createBooking", {
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

  const booking =
    normalizeBookingItem(getObjectFromResponse(response, ["booking", "item"]))
    || normalizeBookingItem(unwrapResponseData(response))

  return {
    booking,
    message: String(response?.message || "").trim(),
  }
}

export const getBookingAvailability = async () => ({
  bookings: [],
})

export const getBookingById = async (bookingId, token = "") => {
  const response = await request(`/booking/getBooking/${encodeURIComponent(bookingId)}`, {
    headers: createTokenHeaders(token),
  })

  return {
    booking:
      normalizeBookingItem(getObjectFromResponse(response, ["booking", "item"]))
      || normalizeBookingItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const getMyBookings = async (token) => {
  const response = await request("/booking/getMyBookings", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({}),
  })

  return {
    bookings: getArrayFromResponse(response, ["bookings", "items"]).map((item) => normalizeBookingItem(item)).filter(Boolean),
  }
}

export const cancelMyBooking = async (token, bookingId) => {
  const response = await request(`/booking/cancelBooking/${encodeURIComponent(bookingId)}`, {
    headers: createTokenHeaders(token),
  })

  return {
    booking:
      normalizeBookingItem(getObjectFromResponse(response, ["booking", "item"]))
      || normalizeBookingItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const createBookingPayment = async (token, bookingId, method = "CASH") => {
  const response = await request("/payment/createPayment", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      bookingId: String(bookingId || "").trim(),
      method: String(method || "CASH").trim().toUpperCase(),
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
  const response = await request(`/payment/getPaymentByBooking/${encodeURIComponent(bookingId)}`, {
    headers: createTokenHeaders(token),
  })

  const payment =
    normalizePaymentItem(getObjectFromResponse(response, ["payment", "item"]))
    || normalizePaymentItem(unwrapResponseData(response))

  return {
    payment,
    message: String(response?.message || "").trim(),
  }
}

export const confirmPayment = async (token, bookingId) =>
  request("/payment/confirmPayment", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      bookingId: String(bookingId || "").trim(),
    }),
  })

export const cancelBookingPayment = async (token, paymentId) =>
  request(`/payment/cancelPayment/${encodeURIComponent(paymentId)}`, {
    headers: createTokenHeaders(token),
  })

export const getPaymentQr = async (token, paymentId) => {
  const response = await request(`/payment/getQR/${encodeURIComponent(paymentId)}`, {
    headers: createTokenHeaders(token),
  })

  const payloadData = unwrapResponseData(response)
  const qrValue = String(
    pickFirstValue(payloadData, ["qrCode", "qr", "qrImage", "qrImageUrl", "url", "paymentUrl"])
    || pickFirstValue(response, ["qrCode", "data.qrCode", "qr", "data.qr"])
    || ""
  ).trim()

  return {
    qrCode: qrValue,
    qrImage: qrValue,
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

export const sendContact = async () => {
  throw new Error("Backend hien tai khong cung cap API lien he.")
}
