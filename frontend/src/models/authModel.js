const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  admin: "admin",
})

export const REGISTER_ROLE_OPTIONS = Object.freeze([
  { value: USER_ROLES.customer, label: "NgÆ°á»i Ä‘áº·t sÃ¢n" },
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

export const getAuthCheckingMessage = () => "Äang xÃ¡c thá»±c tÃ i khoáº£n..."

export const isAdminUser = (user) => {
  const normalizedRole = String(user?.role || "").trim().toLowerCase()
  return normalizedRole === USER_ROLES.admin || normalizedRole === "admin"
}

export const getUserRoleLabel = (role) =>
  isAdminUser({ role }) ? "Quáº£n trá»‹ viÃªn sÃ¢n" : "NgÆ°á»i Ä‘áº·t sÃ¢n"

export const validateRegisterDetails = (form) => {
  const fullName = String(form.fullName || "").trim()
  const email = String(form.email || "").trim().toLowerCase()
  const phone = String(form.phone || "").replace(/\D/g, "")
  const password = String(form.password || "")
  const confirmPassword = String(form.confirmPassword || "")
  const role = String(form.role || "").trim().toLowerCase()

  if (!fullName || !email || !phone || !password || !confirmPassword) {
    return "Vui lÃ²ng nháº­p Ä‘áº§y Ä‘á»§ thÃ´ng tin Ä‘Äƒng kÃ½."
  }

  if (!isValidEmail(email)) {
    return "Email khÃ´ng há»£p lá»‡."
  }

  if (!/^0\d{9}$/.test(phone)) {
    return "Sá»‘ Ä‘iá»‡n thoáº¡i khÃ´ng há»£p lá»‡."
  }

  if (password.length < 6) {
    return "Máº­t kháº©u tá»‘i thiá»ƒu 6 kÃ½ tá»±."
  }

  if (password !== confirmPassword) {
    return "XÃ¡c nháº­n máº­t kháº©u khÃ´ng khá»›p."
  }

  if (role !== USER_ROLES.customer) {
    return "Vai trÃ² Ä‘Äƒng kÃ½ khÃ´ng há»£p lá»‡."
  }

  return ""
}
