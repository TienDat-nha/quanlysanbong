import { isAdminUser } from "../authModel"
import { ROUTES } from "../routeModel"

const BASE_NAV_ITEMS = Object.freeze([
  { key: "home", to: ROUTES.home, label: "Trang chủ", end: true },
  { key: "fields", to: ROUTES.fields, label: "Danh sách sân" },
  { key: "booking", to: ROUTES.booking, label: "Đặt sân" },
  { key: "contact", to: ROUTES.contact, label: "Liên hệ" },
])

const GUEST_ACTIONS = Object.freeze([
  { key: "login", to: ROUTES.login, label: "Đăng nhập", className: "btn authBtn" },
  { key: "register", to: ROUTES.register, label: "Đăng ký", className: "btn outlineBtn" },
])

export const createNavbarModel = (currentUser) => {
  const navItems = isAdminUser(currentUser)
    ? [...BASE_NAV_ITEMS, { key: "adminFields", to: ROUTES.adminFields, label: "Dashboard admin" }]
    : [...BASE_NAV_ITEMS]

  return {
    navItems,
    guestActions: GUEST_ACTIONS,
    isAuthenticated: Boolean(currentUser),
    currentUserName: String(
      currentUser?.name || currentUser?.fullName || currentUser?.email || ""
    ).trim(),
    homePath: ROUTES.home,
  }
}
