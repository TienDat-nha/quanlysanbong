export const ROUTES = Object.freeze({
  home: "/",
  users: "/users",
  login: "/dang-nhap",
  register: "/dang-ky",
  adminFields: "/quan-ly-san",
  fields: "/san-bong",
  contact: "/lien-he",
  booking: "/dat-san",
  depositPayment: "/thanh-toan-dat-coc",
})

export const createFieldDetailRoute = (fieldId) => `${ROUTES.fields}/${fieldId}`
export const createBookingRoute = (fieldSlug = "") =>
  fieldSlug ? `${ROUTES.booking}/${fieldSlug}` : ROUTES.booking
export const createDepositPaymentRoute = (bookingId) =>
  `${ROUTES.depositPayment}/${bookingId}`
export const createPublicBookingUrl = (origin, fieldSlug = "") =>
  `${String(origin || "").replace(/\/+$/g, "")}${createBookingRoute(fieldSlug)}`
