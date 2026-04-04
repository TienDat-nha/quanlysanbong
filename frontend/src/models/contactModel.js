export const createContactForm = () => ({
  name: "",
  email: "",
  phone: "",
  message: "",
})

export const createContactFeedback = () => ({
  type: "",
  text: "",
})

const normalizeAdminContact = (contact) => {
  if (!contact || typeof contact !== "object") {
    return null
  }

  return {
    id: Number(contact.id || 0),
    name: String(contact.name || "").trim(),
    email: String(contact.email || "").trim(),
    phone: String(contact.phone || "").trim(),
    message: String(contact.message || "").trim(),
    createdAt: contact.createdAt || null,
  }
}

export const getAdminContactList = (payload) => {
  const source = Array.isArray(payload?.contacts) ? payload.contacts : []
  return source.map((contact) => normalizeAdminContact(contact)).filter(Boolean)
}
