const normalizeManagedUserRole = (value) => {
  const normalized = String(value || "USER").trim().toUpperCase()

  if (normalized === "ADMIN") {
    return "ADMIN"
  }

  if (normalized === "OWNER") {
    return "OWNER"
  }

  if (normalized === "CLIENT" || normalized === "CUSTOMER" || normalized === "USER") {
    return "USER"
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
  const role = normalizeManagedUserRole(user?.role)
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

export const getApiRoleValue = (value) => normalizeManagedUserRole(value)

export const getManagedUserRoleLabel = (role) => {
  const normalizedRole = getApiRoleValue(role)

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
    customers: list.filter((user) => getApiRoleValue(user?.role) === "USER").length,
    owners: list.filter((user) => getApiRoleValue(user?.role) === "OWNER").length,
    admins: list.filter((user) => getApiRoleValue(user?.role) === "ADMIN").length,
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
