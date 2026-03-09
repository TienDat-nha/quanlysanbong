const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_PATTERN = /^\d{6}$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

export const createLoginForm = () => ({
  email: "",
  password: "",
})

export const createRegisterForm = () => ({
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  otp: "",
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

export const getAuthCheckingMessage = () => "Dang xac thuc tai khoan..."

export const isAdminUser = (user) =>
  String(user?.role || "").trim().toLowerCase() === USER_ROLES.admin

export const getUserRoleLabel = (role) =>
  isAdminUser({ role }) ? "Quan tri vien san" : "Khach dat san"

export const validateRegisterDetails = (form) => {
  const fullName = String(form.fullName || "").trim()
  const email = String(form.email || "").trim().toLowerCase()
  const password = String(form.password || "")
  const confirmPassword = String(form.confirmPassword || "")
  const otp = String(form.otp || "").trim()

  if (!fullName || !email || !password || !confirmPassword || !otp) {
    return "Vui long nhap day du thong tin dang ky va ma OTP."
  }

  if (!isValidEmail(email)) {
    return "Email khong hop le."
  }

  if (password.length < 6) {
    return "Mat khau toi thieu 6 ky tu."
  }

  if (password !== confirmPassword) {
    return "Xac nhan mat khau khong khop."
  }

  if (!OTP_PATTERN.test(otp)) {
    return "Ma OTP gom 6 chu so."
  }

  return ""
}
