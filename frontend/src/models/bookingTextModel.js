import { validateBookingForm } from "./bookingModel"

export const validateBookingFormVi = (form, now = new Date()) => validateBookingForm(form, now)

export const formatBookingStatusVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "pending":
      return "Chá» xÃ¡c nháº­n"
    case "confirmed":
      return "ÄÃ£ xÃ¡c nháº­n"
    case "cancelled":
    case "canceled":
      return "ÄÃ£ há»§y"
    default:
      return value || ""
  }
}

export const formatDepositStatusVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "paid":
      return "ÄÃ£ thanh toÃ¡n"
    case "pending":
      return "Chá» xÃ¡c nháº­n thanh toÃ¡n"
    case "failed":
      return "Thanh toÃ¡n tháº¥t báº¡i"
    case "cancelled":
    case "canceled":
      return "ÄÃ£ há»§y"
    case "unpaid":
      return "ChÆ°a thanh toÃ¡n"
    default:
      return value || ""
  }
}

export const formatPaymentStatusVi = (paymentStatus, depositStatus = "") => {
  switch (String(paymentStatus || "").trim().toLowerCase()) {
    case "paid":
      return "ÄÃ£ thanh toÃ¡n"
    case "pending":
      return "Chá» xÃ¡c nháº­n"
    case "failed":
      return "Thanh toÃ¡n tháº¥t báº¡i"
    case "cancelled":
    case "canceled":
      return "ÄÃ£ há»§y"
    case "unpaid":
      return "ChÆ°a thanh toÃ¡n"
    default:
      return formatDepositStatusVi(depositStatus || paymentStatus)
  }
}

export const formatDepositMethodVi = (value) => {
  switch (String(value || "").trim().toLowerCase()) {
    case "cash":
      return "Tiá»n máº·t"
    case "qr":
      return "QR"
    default:
      return value || ""
  }
}
