import { ROUTES } from "../routeModel"

const USER_NAV_ITEMS = Object.freeze([
  { key: "home", to: ROUTES.home, label: "Trang chủ", end: true },
  { key: "users", to: ROUTES.users, label: "Người dùng" },
])

const GUEST_ACTIONS = Object.freeze([
  { key: "login", to: ROUTES.login, label: "Đăng nhập", className: "btn authBtn" },
  { key: "register", to: ROUTES.register, label: "Đăng ký", className: "btn outlineBtn" },
])

export const createNavbarModel = (currentUser) => {
  return {
    navItems: USER_NAV_ITEMS,
    guestActions: GUEST_ACTIONS,
    isAuthenticated: Boolean(currentUser),
    currentUserName: String(currentUser?.name || currentUser?.fullName || currentUser?.email || "").trim(),
    homePath: ROUTES.home,
  }
}
