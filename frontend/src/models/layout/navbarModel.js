import { isAdminUser } from "../authModel"
import { ROUTES } from "../routeModel"

const BASE_NAV_ITEMS = Object.freeze([
  { key: "home", to: ROUTES.home, label: "Trang chu", end: true },
  { key: "fields", to: ROUTES.fields, label: "San bong" },
  { key: "booking", to: ROUTES.booking, label: "Dat san" },
  { key: "contact", to: ROUTES.contact, label: "Lien he" },
])

const GUEST_ACTIONS = Object.freeze([
  { key: "login", to: ROUTES.login, label: "Dang nhap", className: "btn authBtn" },
  { key: "register", to: ROUTES.register, label: "Dang ky", className: "btn outlineBtn" },
])

export const createNavbarModel = (currentUser) => {
  const navItems = isAdminUser(currentUser)
    ? [...BASE_NAV_ITEMS, { key: "adminFields", to: ROUTES.adminFields, label: "Quan ly san" }]
    : [...BASE_NAV_ITEMS]

  return {
    navItems,
    guestActions: GUEST_ACTIONS,
    isAuthenticated: Boolean(currentUser),
    currentUserName: String(currentUser?.name || currentUser?.fullName || currentUser?.email || "").trim(),
    homePath: ROUTES.home,
  }
}
