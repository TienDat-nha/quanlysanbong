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
])

const GUEST_ACTIONS = Object.freeze([
  { key: "login", to: ROUTES.login, label: "Đăng nhập", className: "btn authBtn" },
  { key: "register", to: ROUTES.register, label: "Đăng ký", className: "btn outlineBtn" },
])

const ADMIN_NAV_ITEMS = Object.freeze([
  { key: "adminUsers", to: ROUTES.adminUsers, label: "Quản lý tài khoản" },
  { key: "adminOwnerFields", to: ROUTES.adminOwnerFields, label: "Quản lý sân chủ sân" },
  { key: "adminFieldRequests", to: ROUTES.adminFieldRequests, label: "Duyệt yêu cầu tạo sân" },
])

const OWNER_NAV_ITEMS = Object.freeze([
  { key: "adminBookings", to: ROUTES.adminBookings, label: "Quản lý đơn đặt" },
  {
    key: "manageFields",
    to: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.manageFields),
    label: "Quản lý sân",
  },
  { key: "ownerFieldRequests", to: ROUTES.ownerFieldRequests, label: "Yêu cầu tạo sân" },
])

export const createNavbarModel = (currentUser) => {
  const baseItems = [...BASE_NAV_ITEMS]
  const isAdmin = isAdminUser(currentUser)
  const isOwner = isOwnerUser(currentUser)
  const isAuthenticated = Boolean(currentUser)

  if (isAuthenticated && !isAdmin && !isOwner) {
    baseItems.push({ key: "myPayments", to: ROUTES.myPayments, label: "Thanh toán" })
  }

  const navItems = isAdmin
    ? [...ADMIN_NAV_ITEMS]
    : isOwner
      ? [...OWNER_NAV_ITEMS]
      : baseItems

  return {
    navItems,
    guestActions: GUEST_ACTIONS,
    isAuthenticated,
    currentUserName: String(
      currentUser?.name || currentUser?.fullName || currentUser?.email || ""
    ).trim(),
    homePath: ROUTES.home,
  }
}
