import { isAdminUser, isOwnerUser } from "../authModel"
import {
  createAdminFieldsSectionRoute,
  ROUTES,
  STAFF_DASHBOARD_SECTIONS,
} from "../routeModel"

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

const ADMIN_NAV_ITEMS = Object.freeze([
  { key: "adminUsers", to: ROUTES.adminUsers, label: "Quản lý tài khoản" },
  {
    key: "manageFields",
    to: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.manageFields),
    label: "Quản lý sân",
  },
  {
    key: "fieldList",
    to: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.fieldList),
    label: "Danh sách sân",
  },
])

const OWNER_NAV_ITEMS = Object.freeze([
  { key: "manualBooking", to: ROUTES.booking, label: "Đặt sân thủ công" },
  { key: "fields", to: ROUTES.fields, label: "Danh sách sân" },
  {
    key: "manageFields",
    to: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.manageFields),
    label: "Quản lý sân",
  },
  {
    key: "ownerBookings",
    to: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.ownerBookings),
    label: "Đơn đặt của khách",
  },
])

export const createNavbarModel = (currentUser) => {
  const navItems = isAdminUser(currentUser)
    ? [...ADMIN_NAV_ITEMS]
    : isOwnerUser(currentUser)
      ? [...OWNER_NAV_ITEMS]
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
