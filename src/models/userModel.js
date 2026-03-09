const normalizeUser = (user) => {
  const id = String(user?._id || user?.id || "").trim()
  const name = String(user?.name || user?.fullName || "").trim()
  const email = String(user?.email || "").trim().toLowerCase()
  const phone = String(user?.phone || "").trim()
  const role = String(user?.role || "USER").trim().toUpperCase()

  if (!id || !name) {
    return null
  }

  return {
    id,
    name,
    email,
    phone,
    role,
  }
}

export const getUserList = (payload) => {
  const source = Array.isArray(payload) ? payload : Array.isArray(payload?.users) ? payload.users : []

  return source
    .map((user) => normalizeUser(user))
    .filter(Boolean)
}

export const getUserItem = (payload) => {
  return normalizeUser(payload?.user || payload)
}
