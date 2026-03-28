export const ROUTES = Object.freeze({
  home: "/",
  users: "/users",
  adminUsers: "/quan-tri",
  login: "/dang-nhap",
  register: "/dang-ky",
  adminFields: "/quan-ly-san",
  fields: "/san-bong",
  contact: "/lien-he",
  booking: "/dat-san",
  depositPayment: "/thanh-toan-dat-coc",
})

export const STAFF_DASHBOARD_SECTIONS = Object.freeze({
  manageFields: "quan-ly-san",
  fieldList: "danh-sach-san",
  ownerBookings: "don-dat-khach",
})

export const createRouteWithHash = (path, hash = "") => {
  const normalizedHash = String(hash || "").replace(/^#+/g, "").trim()
  return normalizedHash ? `${path}#${normalizedHash}` : path
}

export const createAdminFieldsSectionRoute = (section = "") => {
  const normalizedSection = String(section || "").replace(/^#+/g, "").trim()
  return !normalizedSection || normalizedSection === STAFF_DASHBOARD_SECTIONS.manageFields
    ? ROUTES.adminFields
    : createRouteWithHash(ROUTES.adminFields, normalizedSection)
}

export const createFieldDetailRoute = (fieldId) => `${ROUTES.fields}/${fieldId}`
export const createBookingRoute = (fieldSlug = "") =>
  fieldSlug ? `${ROUTES.booking}/${fieldSlug}` : ROUTES.booking
export const createDepositPaymentRoute = (bookingId) =>
  `${ROUTES.depositPayment}/${bookingId}`
export const createPublicBookingUrl = (origin, fieldSlug = "") =>
  `${String(origin || "").replace(/\/+$/g, "")}${createBookingRoute(fieldSlug)}`
