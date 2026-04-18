/**
 * userModel.js
 * ============
 * Model quản lý dữ liệu người dùng (user data)
 * 
 * Chức năng:
 * - Chuẩn hóa và validate dữ liệu người dùng
 * - Xác định vai trò người dùng (USER, OWNER, ADMIN)
 * - Kiểm tra trạng thái khóa/hoạt động của người dùng
 * - Nhận dạng người dùng bị xóa hoặc vô hiệu hóa
 * - Cung cấp nhãn và giá trị API cho vai trò
 * - Cung cấp nhãn trạng thái người dùng (Hoạt động, Khóa, Vô hiệu hóa)
 * 
 * Hàm chính:
 * - normalizeUser(): Chuẩn hóa dữ liệu người dùng từ API
 * - getUserList(): Tạo danh sách người dùng từ mảng người dùng
 * - getUserSummary(): Tính toán thống kê người dùng theo vai trò
 * - getManagedUserRoleLabel(): Lấy nhãn vai trò người dùng
 * - getManagedUserStatusLabel(): Lấy nhãn trạng thái người dùng
 * - getApiRoleValue(): Lấy giá trị vai trò để gửi tới API
 */

const normalizeManagedUserRole = (value, email = "") => {
  const normalized = String(value || "USER").trim().toUpperCase()

  if (normalized === "CLIENT" || normalized === "CUSTOMER" || normalized === "USER") {
    return "USER"
  }

  if (normalized === "ADMIN" || normalized === "SUPER_ADMIN" || normalized === "SUPER-ADMIN") {
    return "ADMIN"
  }

  if (["OWNER", "FIELD_OWNER", "FIELD-OWNER"].includes(normalized)) {
    return "OWNER"
  }

  return normalized || "USER"
}

const getUserLockState = (user) => {
  const status = String(user?.status || "").trim().toUpperCase()

  return Boolean(
    user?.isDeleted
    || user?.locked
    || user?.isLocked
    || user?.isActive === false
    || status === "LOCKED"
    || status === "DISABLED"
    || status === "INACTIVE"
  )
}

const normalizeUser = (user) => {
  const id = String(user?._id || user?.id || "").trim()
  const name = String(user?.name || user?.fullName || "").trim()
  const email = String(user?.email || "").trim().toLowerCase()
  const phone = String(user?.phone || "").trim()
  const role = normalizeManagedUserRole(user?.role, email)
  const isLocked = getUserLockState(user)

  if (!id || !name) {
    return null
  }

  return {
    ...user,
    id,
    name,
    email,
    phone,
    role,
    isDeleted: Boolean(user?.isDeleted),
    isLocked,
    isActive: !isLocked,
  }
}

export const getApiRoleValue = (value, email = "") => normalizeManagedUserRole(value, email)

export const getManagedUserRoleLabel = (role, email = "") => {
  const normalizedRole = getApiRoleValue(role, email)

  if (normalizedRole === "ADMIN") {
    return "Quản trị"
  }

  if (normalizedRole === "OWNER") {
    return "Chủ sân"
  }

  return "Người dùng"
}

export const getManagedUserStatusLabel = (user) =>
  user?.isLocked ? "Đã khóa" : "Đang hoạt động"

export const getUserSummary = (users) => {
  const list = Array.isArray(users) ? users : []

  return {
    total: list.length,
    customers: list.filter((user) => getApiRoleValue(user?.role, user?.email) === "USER").length,
    owners: list.filter((user) => getApiRoleValue(user?.role, user?.email) === "OWNER").length,
    admins: list.filter((user) => getApiRoleValue(user?.role, user?.email) === "ADMIN").length,
    locked: list.filter((user) => user?.isLocked).length,
  }
}

export const getUserList = (payload) => {
  const source = Array.isArray(payload) ? payload : Array.isArray(payload?.users) ? payload.users : []

  return source
    .map((user) => normalizeUser(user))
    .filter(Boolean)
}

export const getUserItem = (payload) => normalizeUser(payload?.user || payload)
