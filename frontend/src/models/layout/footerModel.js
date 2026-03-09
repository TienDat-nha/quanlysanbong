import { ROUTES } from "../routeModel"

const FOOTER_LINKS = Object.freeze([
  { key: "home", to: ROUTES.home, label: "Trang chủ" },
  { key: "fields", to: ROUTES.fields, label: "Danh sách sân" },
  { key: "booking", to: ROUTES.booking, label: "Đặt sân" },
  { key: "contact", to: ROUTES.contact, label: "Liên hệ" },
])

const FOOTER_CONTACTS = Object.freeze([
  { key: "phone", label: "1900 123 456" },
  { key: "email", label: "support@sanbong.vn" },
  { key: "location", label: "Quận 8, TP.HCM" },
])

export const createFooterModel = () => ({
  brandName: "SanBong.",
  brandDescription:
    "Nền tảng đặt sân online hàng đầu Việt Nam. Chúng tôi giúp bạn tìm sân phù hợp và đặt sân nhanh chóng với lịch minh bạch.",
  navigationTitle: "Điều hướng",
  infoTitle: "Thông tin liên hệ",
  links: FOOTER_LINKS,
  contacts: FOOTER_CONTACTS,
  copyrightText: "2026 SanBong. All rights reserved.",
})
