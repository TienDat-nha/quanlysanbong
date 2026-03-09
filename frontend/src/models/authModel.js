const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OTP_PATTERN = /^\d{6}$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

export const REGISTER_ROLE_OPTIONS = Object.freeze([
  { value: USER_ROLES.customer, label: "Người đặt sân" },
  { value: USER_ROLES.admin, label: "Admin / Chủ sân" },
])

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
  role: USER_ROLES.customer,
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

export const isAdminUser = (user) =>
  String(user?.role || "").trim().toLowerCase() === USER_ROLES.admin

export const getUserRoleLabel = (role) =>
  isAdminUser({ role }) ? "Quản trị viên sân" : "Người đặt sân"

export const validateRegisterDetails = (form) => {
  const fullName = String(form.fullName || "").trim()
  const email = String(form.email || "").trim().toLowerCase()
  const password = String(form.password || "")
  const confirmPassword = String(form.confirmPassword || "")
  const otp = String(form.otp || "").trim()
  const role = String(form.role || "").trim().toLowerCase()

  if (!fullName || !email || !password || !confirmPassword || !otp) {
    return "Vui lòng nhập đầy đủ thông tin đăng ký và mã OTP."
  }

  if (!isValidEmail(email)) {
    return "Email không hợp lệ."
  }

  if (password.length < 6) {
    return "Mật khẩu tối thiểu 6 ký tự."
  }

  if (password !== confirmPassword) {
    return "Xác nhận mật khẩu không khớp."
  }

  if (!OTP_PATTERN.test(otp)) {
    return "Mã OTP gồm 6 chữ số."
  }

  if (role !== USER_ROLES.customer && role !== USER_ROLES.admin) {
    return "Vai trò đăng ký không hợp lệ."
  }

  return ""
}
