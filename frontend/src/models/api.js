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

const isHtmlLike = (value) => {
  const trimmed = String(value || "").trim().toLowerCase()
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")
}

const buildApiUnavailableMessage = (requestPath) =>
  `Khong the ket noi den API (${API_BASE_URL}). Vui long kiem tra backend dang chay (${requestPath}).`

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

  if (typeof message === "string" && message.trim()) {
    return message.trim()
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
    return "CLIENT"
  }

  return normalized || "CLIENT"
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
    key: key || `sub-field-${index + 1}`,
    name,
    type: String(subField.type || subField.fieldType || "").trim(),
    pricePerHour: Number(subField.pricePerHour || subField.price || subField.hourlyPrice || 0),
    openHours: String(subField.openHours || subField.timeRange || "").trim(),
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
    type: String(field.type || field.fieldType || "").trim(),
    openHours: String(field.openHours || field.timeRange || "").trim(),
    pricePerHour: Number(field.pricePerHour || field.price || field.hourlyPrice || 0),
    rating: Number(field.rating || 0),
    article: String(field.article || field.description || "").trim(),
    coverImage: String(field.coverImage || field.image || field.thumbnail || "").trim(),
    images:
      Array.isArray(field.images) && field.images.length > 0
        ? field.images.filter(Boolean)
        : String(field.coverImage || field.image || field.thumbnail || "").trim()
          ? [String(field.coverImage || field.image || field.thumbnail || "").trim()]
          : [],
    subFields: rawSubFields.map((item, index) => normalizeSubFieldItem(item, index)).filter(Boolean),
  }
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
  return Array.isArray(unwrapped) ? unwrapped : []
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
    const errorMessage = getMessageFromBody(data, rawBodyText) || "Yeu cau that bai."
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
      bankName: "Thanh toan tien mat / tuy backend xac nhan",
      accountNumber: normalizedPayment?.id || normalizedBooking?.paymentId || "",
      accountName: normalizedPayment?.method || "CASH",
      transferNote: mergedBooking?.id || "",
      qrImageUrl: normalizedPayment?.qrImage || normalizedPayment?.qrCode || "",
    },
  }
}

const buildFieldMutationPayload = (payload = {}) => {
  const subFields = (Array.isArray(payload.subFields) ? payload.subFields : [])
    .map((item) => normalizeSubFieldItem(item))
    .filter(Boolean)

  return {
    name: String(payload.name || "").trim(),
    address: String(payload.address || "").trim(),
    district: String(payload.district || "").trim(),
    city: String(payload.city || "").trim(),
    ward: String(payload.ward || "").trim(),
    type: String(payload.type || "").trim(),
    openHours: String(payload.openHours || "").trim(),
    pricePerHour: Math.round(Number(payload.pricePerHour || 0)),
    description: String(payload.article || payload.description || "").trim(),
    article: String(payload.article || payload.description || "").trim(),
    image: String(payload.coverImage || payload.image || "").trim(),
    coverImage: String(payload.coverImage || payload.image || "").trim(),
    images: (Array.isArray(payload.images) ? payload.images : Array.isArray(payload.galleryImages) ? payload.galleryImages : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean),
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    rating: Number(payload.rating || 0),
    subFields: subFields.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      pricePerHour: item.pricePerHour,
      openHours: item.openHours,
    })),
  }
}

export const requestRegisterOtp = async () => ({
  message: "Backend hien tai khong su dung OTP trong quy trinh dang ky.",
})

export const registerUser = async (payload) => {
  const response = await request("/user/register", {
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
  const response = await request("/user/login", {
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
  const response = await request("/user/getMe", {
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

export const createPublicUser = async (token, payload) => {
  const response = await request("/user/createUser", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      name: String(payload?.name || payload?.fullName || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      password: String(payload?.password || ""),
      role: String(payload?.role || "CLIENT").trim().toUpperCase(),
    }),
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
      name: String(payload?.name || payload?.fullName || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      password: String(payload?.password || ""),
      role: String(payload?.role || "").trim().toUpperCase() || undefined,
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

export const getTimeSlots = async () => {
  const response = await request("/timeSlot/getAllTimeSlot")
  return {
    timeSlots: getArrayFromResponse(response, ["timeSlots"]).map((item, index) => normalizeTimeSlotItem(item, index)).filter(Boolean),
  }
}

const getFieldByConfiguredIds = async (token = "") => {
  const results = await Promise.allSettled(CONFIGURED_FIELD_IDS.map((fieldId) => getFieldById(fieldId, token)))

  return results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value?.field || result.value)
    .filter(Boolean)
}

export const getFields = async (token = "") => {
  if (CONFIGURED_FIELD_IDS.length > 0) {
    return {
      fields: await getFieldByConfiguredIds(token),
    }
  }

  const response = await requestFirstSuccess(
    ["/field/getAllField", "/field/getAllFields", "/field/getFields"],
    token ? { headers: createTokenHeaders(token) } : {}
  ).catch(() => ({}))

  return {
    fields: getArrayFromResponse(response, ["fields", "items"]).map((item) => normalizeFieldItem(item)).filter(Boolean),
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

  const field =
    normalizeFieldItem(getObjectFromResponse(response, ["field", "item"]))
    || normalizeFieldItem(unwrapResponseData(response))

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
  throw new Error("Backend hien tai khong cung cap API xoa lien he.")
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

export const uploadAdminImage = async () => {
  throw new Error("Backend hien tai khong co API upload anh. Vui long dung URL anh san co.")
}

export const createAdminField = async (token, payload) => {
  const response = await request("/field/createField", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(buildFieldMutationPayload(payload)),
  })

  return {
    field:
      normalizeFieldItem(getObjectFromResponse(response, ["field", "item"]))
      || normalizeFieldItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const updateAdminField = async (token, fieldId, payload) => {
  const response = await request(`/field/updateField/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(buildFieldMutationPayload(payload)),
  })

  return {
    field:
      normalizeFieldItem(getObjectFromResponse(response, ["field", "item"]))
      || normalizeFieldItem(unwrapResponseData(response)),
    message: String(response?.message || "").trim(),
  }
}

export const deleteAdminField = async (token, fieldId) =>
  request(`/field/deleteField/${encodeURIComponent(fieldId)}`, {
    method: "POST",
    headers: createTokenHeaders(token),
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
    message: response.message || "Da tao yeu cau thanh toan.",
  }
}

export const createVnpayDepositPayment = async (token, bookingId) =>
  createBookingPayment(token, bookingId, "QR")

export const createMomoDepositPayment = async (token, bookingId) =>
  createBookingPayment(token, bookingId, "QR")

export const sendContact = async () => {
  throw new Error("Backend hien tai khong cung cap API lien he.")
}
