import { ROUTES } from "../routeModel"

const FOOTER_LINKS = Object.freeze([
  { key: "home", to: ROUTES.home, label: "Trang chủ" },
  { key: "users", to: ROUTES.users, label: "Người dùng" },
  { key: "login", to: ROUTES.login, label: "Đăng nhập" },
  { key: "register", to: ROUTES.register, label: "Đăng ký" },
])

const FOOTER_CONTACTS = Object.freeze([
  { key: "phone", label: "1900 123 456" },
  { key: "email", label: "support@sanbong.vn" },
  { key: "location", label: "Quận 8, TP.HCM" },
])

export const createFooterModel = () => ({
  brandName: "SanBong.",
  brandDescription:
    "Frontend nay da duoc noi truc tiep den backend api-be-football tren Render de dang nhap, dang ky va quan ly nguoi dung.",
  navigationTitle: "Điều hướng",
  infoTitle: "Thông tin liên hệ",
  links: FOOTER_LINKS,
  contacts: FOOTER_CONTACTS,
  copyrightText: "2026 SanBong. Bảo lưu mọi quyền.",
})
