const normalizeApiBaseUrl = (value) => String(value || "").trim().replace(/\/+$/g, "")

const getDefaultApiUrl = () => {
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

const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL || getDefaultApiUrl())

const isHtmlLike = (value) => {
  const trimmed = String(value || "").trim().toLowerCase()
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")
}

const buildApiUnavailableMessage = (requestPath) =>
  `Không thể kết nối đến API (${API_BASE_URL}). Vui lòng kiểm tra backend đang chạy (${requestPath}).`

const getMessageFromBody = (bodyData, rawBodyText) => {
  if (typeof bodyData?.message === "string" && bodyData.message.trim()) {
    return bodyData.message.trim()
  }

  const normalizedText = String(rawBodyText || "").replace(/\s+/g, " ").trim()

  if (!normalizedText || isHtmlLike(normalizedText)) {
    return ""
  }

  return normalizedText.slice(0, 180)
}

const createTokenHeaders = (token, headers = {}) => ({
  ...headers,
  Authorization: `Bearer ${String(token || "").trim()}`,
})

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
    const errorMessage = getMessageFromBody(data, rawBodyText) || "Yêu cầu thất bại."
    throw new Error(errorMessage)
  }

  return data || {}
}

const buildSearchParams = (params = {}) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

export const requestRegisterOtp = async (payload) => {
  const email =
    typeof payload === "string"
      ? String(payload).trim().toLowerCase()
      : String(payload?.email || "").trim().toLowerCase()

  return request("/api/auth/request-register-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export const registerUser = async (payload) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      fullName: String(payload?.fullName || payload?.name || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      password: String(payload?.password || ""),
      otp: String(payload?.otp || "").trim(),
      role: String(payload?.role || "").trim() || undefined,
    }),
  })

export const loginUser = async (payload) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: String(payload?.email || "").trim().toLowerCase(),
      password: String(payload?.password || ""),
    }),
  })

export const getMe = async (token) =>
  request("/api/auth/me", {
    headers: createTokenHeaders(token),
  })

export const getPublicUsers = async () => {
  const response = await request("/api/users")
  return {
    users: Array.isArray(response) ? response : Array.isArray(response?.users) ? response.users : [],
  }
}

export const createPublicUser = async (_token, payload) => {
  const response = await request("/api/users", {
    method: "POST",
    body: JSON.stringify({
      name: String(payload?.name || payload?.fullName || "").trim(),
    }),
  })

  return {
    user: response,
  }
}

export const updatePublicUser = async (_token, userId, payload) => {
  const response = await request(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({
      name: String(payload?.name || payload?.fullName || "").trim(),
    }),
  })

  return {
    user: response,
  }
}

export const deletePublicUser = async (_token, userId) =>
  request(`/api/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  })

export const getFields = async () => request("/api/fields")

export const getFieldById = async (fieldId) =>
  request(`/api/fields/${encodeURIComponent(fieldId)}`)

export const getAdminFields = async (token) =>
  request("/api/admin/fields", {
    headers: createTokenHeaders(token),
  })

export const getAdminDashboard = async (token, params = {}) =>
  request(`/api/admin/dashboard${buildSearchParams(params)}`, {
    headers: createTokenHeaders(token),
  })

export const getAdminContacts = async (token) =>
  request("/api/admin/contacts", {
    headers: createTokenHeaders(token),
  })

export const deleteAdminContact = async (token, contactId) =>
  request(`/api/admin/contacts/${encodeURIComponent(contactId)}`, {
    method: "DELETE",
    headers: createTokenHeaders(token),
  })

export const confirmAdminBooking = async (token, bookingId) =>
  request(`/api/admin/bookings/${encodeURIComponent(bookingId)}/confirm`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const cancelAdminBooking = async (token, bookingId) =>
  request(`/api/admin/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const confirmAdminBookingDeposit = async (token, bookingId) =>
  request(`/api/admin/bookings/${encodeURIComponent(bookingId)}/deposit/confirm`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const confirmAdminBookingPayment = async (token, bookingId) =>
  request(`/api/admin/bookings/${encodeURIComponent(bookingId)}/payment/confirm`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const uploadAdminImage = async (token, file) => {
  if (!file) {
    throw new Error("Vui lòng chọn tệp ảnh.")
  }

  return request("/api/admin/uploads/images", {
    method: "POST",
    headers: createTokenHeaders(token, {
      "Content-Type": String(file.type || "").trim() || "application/octet-stream",
      "x-file-name": encodeURIComponent(String(file.name || "image")),
    }),
    body: file,
  })
}

export const createAdminField = async (token, payload) =>
  request("/api/admin/fields", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(payload),
  })

export const updateAdminField = async (token, fieldId, payload) =>
  request(`/api/admin/fields/${encodeURIComponent(fieldId)}`, {
    method: "PUT",
    headers: createTokenHeaders(token),
    body: JSON.stringify(payload),
  })

export const deleteAdminField = async (token, fieldId) =>
  request(`/api/admin/fields/${encodeURIComponent(fieldId)}`, {
    method: "DELETE",
    headers: createTokenHeaders(token),
  })

export const createBooking = async (token, payload) =>
  request("/api/bookings", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(payload),
  })

export const getBookingAvailability = async (date, fieldId) =>
  request(`/api/bookings/availability${buildSearchParams({ date, fieldId })}`)

export const getMyBookings = async (token) =>
  request("/api/bookings/me", {
    headers: createTokenHeaders(token),
  })

export const cancelMyBooking = async (token, bookingId) =>
  request(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const getBookingDepositInfo = async (token, bookingId) =>
  request(`/api/bookings/${encodeURIComponent(bookingId)}/deposit`, {
    headers: createTokenHeaders(token),
  })

export const confirmStaticDeposit = async (token, bookingId) =>
  request(`/api/bookings/${encodeURIComponent(bookingId)}/deposit/static-confirm`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const createVnpayDepositPayment = async (token, bookingId) =>
  request(`/api/bookings/${encodeURIComponent(bookingId)}/deposit/vnpay/create`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const createMomoDepositPayment = async (token, bookingId) =>
  request(`/api/bookings/${encodeURIComponent(bookingId)}/deposit/momo/create`, {
    method: "POST",
    headers: createTokenHeaders(token),
  })

export const sendContact = async (payload) =>
  request("/api/contact", {
    method: "POST",
    body: JSON.stringify({
      name: String(payload?.name || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      message: String(payload?.message || "").trim(),
    }),
  })
