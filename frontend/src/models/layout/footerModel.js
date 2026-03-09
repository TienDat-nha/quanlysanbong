import { ROUTES } from "../routeModel"

const FOOTER_LINKS = Object.freeze([
  { key: "home", to: ROUTES.home, label: "Trang chu" },
  { key: "fields", to: ROUTES.fields, label: "San bong" },
  { key: "booking", to: ROUTES.booking, label: "Dat san" },
  { key: "contact", to: ROUTES.contact, label: "Lien he" },
  { key: "login", to: ROUTES.login, label: "Dang nhap" },
])

const FOOTER_CONTACTS = Object.freeze([
  { key: "phone", label: "1900 123 456" },
  { key: "email", label: "support@sanbong.vn" },
  { key: "location", label: "Quan 8, TP.HCM" },
])

export const createFooterModel = () => ({
  brandName: "SanBong.",
  brandDescription:
    "Nen tang tim san, dat lich, dat coc va quan ly san bong cho nguoi choi va chu san.",
  navigationTitle: "Dieu huong",
  infoTitle: "Thong tin lien he",
  links: FOOTER_LINKS,
  contacts: FOOTER_CONTACTS,
  copyrightText: "2026 SanBong. Bao luu moi quyen.",
})
