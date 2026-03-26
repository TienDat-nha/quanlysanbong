const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

export const LOGIN_ACCOUNT_TYPES = Object.freeze({
  customer: "customer",
  owner: "owner",
})

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

export const getStoredAuthToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || ""
}

export const persistAuthToken = (token) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export const clearStoredAuthToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export const getAuthCheckingMessage = () => "Đang xác thực tài khoản..."

export const isOwnerAccount = (user) => {
  const normalizedRole = String(user?.role || "").trim().toLowerCase()
  return ["admin", "owner", "field_owner", "field-owner"].includes(normalizedRole)
}

export const isAdminUser = (user) => isOwnerAccount(user)

export const matchesLoginAccountType = (user, accountType) => {
  const normalizedType = String(accountType || LOGIN_ACCOUNT_TYPES.customer).trim().toLowerCase()
  return normalizedType === LOGIN_ACCOUNT_TYPES.owner
    ? isOwnerAccount(user)
    : !isOwnerAccount(user)
}

export const getUserRoleLabel = (role) =>
  isOwnerAccount({ role }) ? "Chủ sân / quản trị" : "Người đặt sân"

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
