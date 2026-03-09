import { ROUTES } from "./routeModel"

const HOME_STATS = Object.freeze([
  { id: 1, iconKey: "location", value: "Render", label: "Backend đang hoạt động" },
  { id: 2, iconKey: "flash", value: "MongoDB", label: "Dữ liệu người dùng trực tuyến" },
  { id: 3, iconKey: "shield", value: "Auth", label: "Đăng nhập bằng token" },
])

const HOT_SLOTS = Object.freeze([
  { id: 1, time: "POST", fieldName: "/api/user/login" },
  { id: 2, time: "POST", fieldName: "/api/user/register" },
  { id: 3, time: "GET", fieldName: "/api/user/getAllUser" },
])

export const createHomeModel = () => ({
  tagline: "Frontend ket noi backend Render",
  title: "Quan ly nguoi dung voi api-be-football",
  description:
    "Ung dung nay da duoc chinh de goi truc tiep backend api-be-football.onrender.com thong qua cac API dang nhap, dang ky va danh sach nguoi dung.",
  primaryAction: {
    to: ROUTES.users,
    label: "Xem danh sach nguoi dung",
  },
  secondaryAction: {
    to: ROUTES.register,
    label: "Tao tai khoan moi",
  },
  panelTitle: "API dang duoc su dung",
  hotSlots: HOT_SLOTS,
  stats: HOME_STATS,
})
