import { validateBookingForm } from "./bookingModel"

export const validateBookingFormVi = (form, now = new Date()) => validateBookingForm(form, now)

export const formatBookingStatusVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "pending":
      return "Chờ xác nhận"
    case "confirmed":
      return "Đã xác nhận"
    case "cancelled":
    case "canceled":
      return "Đã hủy"
    default:
      return value || ""
  }
}

export const formatDepositStatusVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "paid":
      return "Đã thanh toán"
    case "pending":
      return "Chờ xác nhận thanh toán"
    case "failed":
      return "Thanh toán thất bại"
    case "cancelled":
    case "canceled":
      return "Đã hủy"
    case "unpaid":
      return "Chưa thanh toán"
    default:
      return value || ""
  }
}

export const formatPaymentStatusVi = (paymentStatus, depositStatus = "") => {
  switch (String(paymentStatus || "").trim().toLowerCase()) {
    case "paid":
      return "Đã thanh toán"
    case "pending":
      return "Chờ xác nhận"
    case "failed":
      return "Thanh toán thất bại"
    case "cancelled":
    case "canceled":
      return "Đã hủy"
    case "unpaid":
      return "Chưa thanh toán"
    default:
      return formatDepositStatusVi(depositStatus || paymentStatus)
  }
}

export const formatDepositMethodVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "cash":
      return "Tiền mặt"
    case "qr":
      return "QR"
    default:
      return value || ""
  }
}
