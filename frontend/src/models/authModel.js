/**
 * Chức năng:
 * - Quản lý token xác thực (lưu/lấy từ localStorage)
 * - Quản lý loại tài khoản đăng nhập (customer, owner, admin)
 * - Xác thực email hợp lệ
 * - Tạo form đăng nhập, đăng ký
 * - Xác định vai trò người dùng (isAdminUser, isOwnerUser)
 * - Kiểm tra khớp giữa loại tài khoản và vai trò thực tế
 * - Xử lý lỗi xác thực
 * 
 * Hằng số:
 * - USER_ROLES: Các vai trò (customer, owner, admin)
 * - LOGIN_ACCOUNT_TYPES: Các loại tài khoản đăng nhập
 * 
 * Hàm chính:
 * - createLoginForm(): Tạo form đăng nhập mặc định
 * - createRegisterForm(): Tạo form đăng ký mặc định
 * - isValidEmail(): Kiểm tra email hợp lệ
 * - getStoredAuthToken(): Lấy token từ localStorage
 * - persistAuthToken(): Lưu token vào localStorage
 * - isAdminUser(), isOwnerUser(): Kiểm tra vai trò
 */

const TOKEN_STORAGE_KEY = "sanbong_auth_token"
const LOGIN_TYPE_STORAGE_KEY = "sanbong_login_account_type"
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const USER_ROLES = Object.freeze({
  customer: "customer",
  owner: "owner",
  admin: "admin",
})

export const LOGIN_ACCOUNT_TYPES = Object.freeze({
  customer: "customer",
  owner: "owner",
  admin: "admin",
})

const LOGIN_ACCOUNT_TYPE_VALUES = Object.values(LOGIN_ACCOUNT_TYPES)

const normalizeEmailValue = (value) => String(value || "").trim().toLowerCase()

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

export const isValidEmail = (value) => EMAIL_PATTERN.test(normalizeEmailValue(value))

export const normalizeLoginAccountType = (value, fallback = LOGIN_ACCOUNT_TYPES.customer) => {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase()

  return LOGIN_ACCOUNT_TYPE_VALUES.includes(normalizedValue) ? normalizedValue : fallback
}

export const getStoredAuthToken = () => localStorage.getItem(TOKEN_STORAGE_KEY) || ""

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

export const getRoleBasedLoginAccountType = (user) => {
  const normalizedRole = String(user?.role || "").trim().toLowerCase()

  if (["admin", "super_admin", "super-admin"].includes(normalizedRole)) {
    return LOGIN_ACCOUNT_TYPES.admin
  }

  if (["owner", "field_owner", "field-owner"].includes(normalizedRole)) {
    return LOGIN_ACCOUNT_TYPES.owner
  }

  return LOGIN_ACCOUNT_TYPES.customer
}

export const isStaffAccount = (user) =>
  getRoleBasedLoginAccountType(user) !== LOGIN_ACCOUNT_TYPES.customer

export const isOwnerAccount = (user) =>
  getRoleBasedLoginAccountType(user) === LOGIN_ACCOUNT_TYPES.owner

export const getUserLoginAccountType = (user) =>
  normalizeLoginAccountType(user?.loginAccountType || user?.accountType || user?.portalType, "")

export const resolveUserLoginAccountType = (user, preferredAccountType = "") => {
  const roleBasedAccountType = getRoleBasedLoginAccountType(user)
  if (roleBasedAccountType !== LOGIN_ACCOUNT_TYPES.customer) {
    return roleBasedAccountType
  }

  const normalizedPreferred = normalizeLoginAccountType(preferredAccountType, "")
  if (normalizedPreferred === LOGIN_ACCOUNT_TYPES.customer) {
    return LOGIN_ACCOUNT_TYPES.customer
  }

  const existingAccountType = getUserLoginAccountType(user)
  return existingAccountType || LOGIN_ACCOUNT_TYPES.customer
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
  return normalizedType === getRoleBasedLoginAccountType(user)
}

export const getUserRoleLabel = (role, email = "") => {
  const accountType = getRoleBasedLoginAccountType({ role, email })

  if (accountType === LOGIN_ACCOUNT_TYPES.admin) {
    return "Quản trị"
  }

  if (accountType === LOGIN_ACCOUNT_TYPES.owner) {
    return "Chủ sân"
  }

  return "Người dùng"
}

export const validateRegisterDetails = (form) => {
  const fullName = String(form.fullName || "").trim()
  const email = normalizeEmailValue(form.email)
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
