const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

export const REGISTER_ROLE_OPTIONS = Object.freeze([
  { value: USER_ROLES.customer, label: "Người đặt sân" },
])

export const createLoginForm = () => ({
  email: "",
  password: "",
})

export const createRegisterForm = () => ({
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
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

export const isAdminUser = (user) => {
  const normalizedRole = String(user?.role || "").trim().toLowerCase()
  return normalizedRole === USER_ROLES.admin || normalizedRole === "admin"
}

export const getUserRoleLabel = (role) =>
  isAdminUser({ role }) ? "Quản trị viên sân" : "Người đặt sân"

export const validateRegisterDetails = (form) => {
  const fullName = String(form.fullName || "").trim()
  const email = String(form.email || "").trim().toLowerCase()
  const phone = String(form.phone || "").replace(/\D/g, "")
  const password = String(form.password || "")
  const confirmPassword = String(form.confirmPassword || "")
  const role = String(form.role || "").trim().toLowerCase()

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

  if (role !== USER_ROLES.customer) {
    return "Vai trò đăng ký không hợp lệ."
  }

  return ""
}
