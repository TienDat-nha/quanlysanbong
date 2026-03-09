import { ROUTES } from "./routeModel"

const HOME_STATS = Object.freeze([
  { id: 1, iconKey: "location", value: "24/7", label: "Ho tro tim san gan ban nhanh hon" },
  { id: 2, iconKey: "flash", value: "San 5-11", label: "Da dang loai san va khung gio" },
  { id: 3, iconKey: "shield", value: "Dat coc", label: "Xac nhan lich dat va thanh toan ro rang" },
])

const HOT_SLOTS = Object.freeze([
  { id: 1, time: "18:00 - 19:30", fieldName: "San 7 Quan 8" },
  { id: 2, time: "19:30 - 21:00", fieldName: "San 5 Trung Son" },
  { id: 3, time: "20:00 - 22:00", fieldName: "San 11 Binh Chanh" },
])

export const createHomeModel = () => ({
  tagline: "He thong dat san bong truc tuyen",
  title: "Dat san nhanh, quan ly lich san va thanh toan de dang",
  description:
    "Tim san phu hop, chon khung gio trong, dat coc online va theo doi lich su dat san tren mot giao dien duy nhat.",
  primaryAction: {
    to: ROUTES.fields,
    label: "Kham pha san bong",
  },
  secondaryAction: {
    to: ROUTES.booking,
    label: "Dat san ngay",
  },
  panelTitle: "Khung gio duoc dat nhieu",
  hotSlots: HOT_SLOTS,
  stats: HOME_STATS,
})
