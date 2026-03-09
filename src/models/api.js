const normalizeApiBaseUrl = (value) => String(value || "").trim().replace(/\/+$/g, "")
const DEFAULT_API_URL = "https://api-be-football.onrender.com"
const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL || DEFAULT_API_URL)

const isHtmlLike = (value) => {
  const trimmed = String(value || "").trim().toLowerCase()
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")
}

const buildApiUnavailableMessage = (requestPath) => {
  return `Khong the ket noi den API (${API_BASE_URL}). Vui long kiem tra backend dang chay (${requestPath}).`
}

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
    throw new Error(`${errorMessage} (HTTP ${response.status}, ${requestPath})`)
  }

  return data || {}
}

const createTokenHeaders = (token, headers = {}) => ({
  ...headers,
  "x-token": String(token || "").trim(),
})

const toAuthResult = (payload) => {
  const data = payload?.data || {}

  return {
    token: String(data.token || "").trim(),
    user: data.user || null,
  }
}

const toUserPayload = (payload) => {
  const data = payload?.data || {}

  return {
    user: data.user || null,
    users: Array.isArray(data.users) ? data.users : [],
  }
}

const createUnsupportedFeatureError = (featureName) => {
  throw new Error(`Backend api-be-football hien tai khong ho tro chuc nang "${featureName}".`)
}

export const registerUser = async (payload) => {
  const response = await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      name: String(payload?.fullName || payload?.name || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      password: String(payload?.password || ""),
    }),
  })

  return toAuthResult(response)
}

export const requestRegisterOtp = async () => {
  createUnsupportedFeatureError("dang ky OTP")
}

export const loginUser = async (payload) => {
  const response = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({
      username: String(payload?.username || payload?.email || "").trim(),
      password: String(payload?.password || ""),
    }),
  })

  return toAuthResult(response)
}

export const getMe = async (token) => {
  const response = await request("/api/user/getMe", {
    headers: createTokenHeaders(token),
  })

  return {
    user: response?.data?.user || null,
  }
}

export const getPublicUsers = async () => {
  const response = await request("/api/user/getAllUser")
  return {
    users: toUserPayload(response).users,
  }
}

export const createPublicUser = async (token, payload) => {
  const response = await request("/api/user/createUser", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      name: String(payload?.name || "").trim(),
      email: String(payload?.email || "").trim().toLowerCase(),
      phone: String(payload?.phone || "").trim(),
      password: String(payload?.password || ""),
      role: String(payload?.role || "").trim(),
    }),
  })

  return {
    user: toUserPayload(response).user,
  }
}

export const updatePublicUser = async (token, userId, payload) => {
  const nextPayload = {
    userId: String(userId || "").trim(),
    name: String(payload?.name || "").trim(),
    email: String(payload?.email || "").trim().toLowerCase(),
    phone: String(payload?.phone || "").trim(),
    role: String(payload?.role || "").trim(),
  }

  if (String(payload?.password || "").trim()) {
    nextPayload.password = String(payload.password)
  }

  const response = await request("/api/user/updateUserForAdmin", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify(nextPayload),
  })

  return {
    user: toUserPayload(response).user,
  }
}

export const deletePublicUser = async (token, userId) => {
  return request("/api/user/deleteUser", {
    method: "POST",
    headers: createTokenHeaders(token),
    body: JSON.stringify({
      userId: String(userId || "").trim(),
    }),
  })
}

export const getFields = async () => createUnsupportedFeatureError("danh sach san")
export const getAdminFields = async () => createUnsupportedFeatureError("quan ly san")
export const getAdminDashboard = async () => createUnsupportedFeatureError("dashboard admin")
export const createAdminField = async () => createUnsupportedFeatureError("tao san")
export const updateAdminField = async () => createUnsupportedFeatureError("cap nhat san")
export const deleteAdminField = async () => createUnsupportedFeatureError("xoa san")
export const uploadAdminImage = async () => createUnsupportedFeatureError("upload anh")
export const confirmAdminBooking = async () => createUnsupportedFeatureError("xac nhan dat san")
export const cancelAdminBooking = async () => createUnsupportedFeatureError("huy dat san")
export const getAdminContacts = async () => createUnsupportedFeatureError("danh sach lien he")
export const deleteAdminContact = async () => createUnsupportedFeatureError("xoa lien he")
export const getFieldById = async () => createUnsupportedFeatureError("chi tiet san")
export const createBooking = async () => createUnsupportedFeatureError("dat san")
export const getBookingAvailability = async () => createUnsupportedFeatureError("lich trong")
export const getMyBookings = async () => createUnsupportedFeatureError("lich su dat san")
export const cancelMyBooking = async () => createUnsupportedFeatureError("huy lich dat san")
export const getBookingDepositInfo = async () => createUnsupportedFeatureError("thanh toan dat coc")
export const confirmStaticDeposit = async () => createUnsupportedFeatureError("xac nhan dat coc")
export const createVnpayDepositPayment = async () => createUnsupportedFeatureError("thanh toan VNPAY")
export const createMomoDepositPayment = async () => createUnsupportedFeatureError("thanh toan MoMo")
export const sendContact = async () => createUnsupportedFeatureError("gui lien he")
