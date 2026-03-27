const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const LOGIN_TYPE_STORAGE_KEY = "sanbong_login_account_type"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

export const LOGIN_ACCOUNT_TYPES = Object.freeze({
  customer: "customer",
  owner: "owner",
  admin: "admin",
})

const LOGIN_ACCOUNT_TYPE_VALUES = Object.values(LOGIN_ACCOUNT_TYPES)

export const createLoginForm = () => ({
  email: "",
  password: "",
  accountType: LOGIN_ACCOUNT_TYPES.customer,
})

export const createRegisterForm = () => ({
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
})

export const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || "").trim().toLowerCase())

export const normalizeLoginAccountType = (value, fallback = LOGIN_ACCOUNT_TYPES.customer) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()

  return LOGIN_ACCOUNT_TYPE_VALUES.includes(normalizedValue) ? normalizedValue : fallback
}

export const getStoredAuthToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || ""
}

export const getStoredLoginAccountType = () => {
  const storedValue = String(localStorage.getItem(LOGIN_TYPE_STORAGE_KEY) || "")
    .trim()
    .toLowerCase()

  return LOGIN_ACCOUNT_TYPE_VALUES.includes(storedValue) ? storedValue : ""
}

export const persistAuthToken = (token) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export const persistLoginAccountType = (accountType) => {
  const normalizedType = normalizeLoginAccountType(accountType, "")

  if (!normalizedType) {
    localStorage.removeItem(LOGIN_TYPE_STORAGE_KEY)
    return
  }

  localStorage.setItem(LOGIN_TYPE_STORAGE_KEY, normalizedType)
}

export const clearStoredAuthToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export const clearStoredLoginAccountType = () => {
  localStorage.removeItem(LOGIN_TYPE_STORAGE_KEY)
}

export const getAuthCheckingMessage = () => "Đang xác thực tài khoản..."

export const isStaffAccount = (user) => {
  const normalizedRole = String(user?.role || "").trim().toLowerCase()
  return ["admin", "owner", "field_owner", "field-owner"].includes(normalizedRole)
}

export const isOwnerAccount = (user) => isStaffAccount(user)

export const getUserLoginAccountType = (user) =>
  normalizeLoginAccountType(user?.loginAccountType || user?.accountType || user?.portalType, "")

export const resolveUserLoginAccountType = (user, preferredAccountType = "") => {
  if (isStaffAccount(user)) {
    const normalizedPreferred = normalizeLoginAccountType(preferredAccountType, "")
    if (
      normalizedPreferred === LOGIN_ACCOUNT_TYPES.admin
      || normalizedPreferred === LOGIN_ACCOUNT_TYPES.owner
    ) {
      return normalizedPreferred
    }

    const existingAccountType = getUserLoginAccountType(user)
    if (
      existingAccountType === LOGIN_ACCOUNT_TYPES.admin
      || existingAccountType === LOGIN_ACCOUNT_TYPES.owner
    ) {
      return existingAccountType
    }

    return LOGIN_ACCOUNT_TYPES.admin
  }

  return LOGIN_ACCOUNT_TYPES.customer
}

export const attachLoginAccountType = (user, preferredAccountType = "") => {
  if (!user) {
    return null
  }

  const loginAccountType = resolveUserLoginAccountType(user, preferredAccountType)

  return {
    ...user,
    accountType: loginAccountType,
    loginAccountType,
    portalType: loginAccountType,
  }
}

export const isAdminUser = (user) =>
  isStaffAccount(user) && getUserLoginAccountType(user) === LOGIN_ACCOUNT_TYPES.admin

export const isOwnerUser = (user) =>
  isStaffAccount(user) && getUserLoginAccountType(user) === LOGIN_ACCOUNT_TYPES.owner

export const canManageFields = (user) => isStaffAccount(user)

export const matchesLoginAccountType = (user, accountType) => {
  const normalizedType = normalizeLoginAccountType(accountType)
  return normalizedType === LOGIN_ACCOUNT_TYPES.customer
    ? !isStaffAccount(user)
    : isStaffAccount(user)
}

export const getUserRoleLabel = (role) =>
  isStaffAccount({ role }) ? "Chủ sân / quản trị" : "Người đặt sân"

export const validateRegisterDetails = (form) => {
  const fullName = String(form.fullName || "").trim()
  const email = String(form.email || "").trim().toLowerCase()
  const phone = String(form.phone || "").replace(/\D/g, "")
  const password = String(form.password || "")
  const confirmPassword = String(form.confirmPassword || "")

  if (!fullName || !email || !phone || !password || !confirmPassword) {
    return "Vui lòng nhập đầy đủ thông tin đăng ký."
  }

  if (!isValidEmail(email)) {
    return "Email không hợp lệ."
  }

  if (!/^0\d{9}$/.test(phone)) {
    return "Số điện thoại không hợp lệ."
  }

  if (password.length < 6) {
    return "Mật khẩu tối thiểu 6 ký tự."
  }

  if (password !== confirmPassword) {
    return "Xác nhận mật khẩu không khớp."
  }

  return ""
}
