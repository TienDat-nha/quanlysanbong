import { ROUTES } from "./routeModel"

const HOME_STATS = Object.freeze([
  { id: 1, iconKey: "location", value: "120+", label: "Sân Đang Hoạt Động" },
  { id: 2, iconKey: "flash", value: "30s", label: "Đặt Sân Nhanh Chóng" },
  { id: 3, iconKey: "shield", value: "98%", label: "Đánh Giá Hài Lòng" },
])

const HOT_SLOTS = Object.freeze([
  { id: 1, time: "17:00 - 18:30", fieldName: "Sân 7 người Hoa Bình" },
  { id: 2, time: "18:30 - 20:00", fieldName: "Sân mini Bình Thạnh" },
  { id: 3, time: "20:00 - 21:30", fieldName: "Sân 11 người Phú Nhuận" },
])

export const createHomeModel = () => ({
  tagline: "NỀN TẢNG ĐẶT SÂN BÓNG ONLINE",
  title: "Đặt Sân Bóng Gần Bạn Ngay",
  description:
    "Chọn sân, khung giờ và thanh toán ngay trong một giao diện đơn giản. Tất cả lịch đều được cập nhật nhanh chóng và chính xác.",
  primaryAction: {
    to: ROUTES.fields,
    label: "Xem Danh Sách Sân",
  },
  secondaryAction: {
    to: ROUTES.booking,
    label: "Đặt Sân Ngay",
  },
  panelTitle: "Khung giờ hot hôm nay",
  hotSlots: HOT_SLOTS,
  stats: HOME_STATS,
})
