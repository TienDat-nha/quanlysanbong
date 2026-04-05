import {
  calculateBookingDepositAmount,
  calculateRemainingPaymentAmount,
  validateBookingForm,
} from "./bookingModel"

const CANCELLED_STATUS_KEYS = new Set(["cancelled", "canceled"])
const FAILED_PAYMENT_STATUS_KEYS = new Set(["failed", "expired"])
const PENDING_PAYMENT_STATUS_KEYS = new Set(["pending", "waiting", "processing", "deposit_pending"])
const PAID_PAYMENT_STATUS_KEYS = new Set(["paid", "success", "succeeded", "completed", "deposit_paid"])
const normalizeMoney = (value) => {
  const amount = Number(value)
  return Number.isFinite(amount) ? Math.max(amount, 0) : 0
}

const normalizeStatusKey = (value) => String(value || "").trim().toLowerCase()
const hasExplicitMoneyValue = (value) =>
  value !== null
  && value !== undefined
  && (typeof value !== "string" || value.trim() !== "")

export const validateBookingFormVi = (form, now = new Date()) => validateBookingForm(form, now)

export const formatBookingStatusVi = (value) => {
  switch (normalizeStatusKey(value)) {
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
  switch (normalizeStatusKey(value)) {
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
  switch (normalizeStatusKey(paymentStatus)) {
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

export const getBookingPaymentSummaryVi = (booking) => {
  const bookingStatusKey = normalizeStatusKey(booking?.status)
  const paymentStatusKey = normalizeStatusKey(booking?.paymentStatus)
  const depositStatusKey = normalizeStatusKey(booking?.depositStatus)
  const paymentTypeKey = normalizeStatusKey(
    booking?.paymentType
    || booking?.payment?.paymentType
    || booking?.payment?.type
  )
  const paymentMethodKey = normalizeStatusKey(
    booking?.paymentMethod
    || booking?.payment?.method
    || booking?.depositMethod
  )
  const totalAmount = normalizeMoney(booking?.totalPrice)
  const configuredDepositAmount = normalizeMoney(booking?.depositAmount)
  const depositAmount =
    configuredDepositAmount > 0
      ? configuredDepositAmount
      : calculateBookingDepositAmount(totalAmount)
  const fallbackRemainingAmount = calculateRemainingPaymentAmount(totalAmount, depositAmount)
  const rawRemainingValue = booking?.remainingAmount
  const paidAmount = normalizeMoney(
    booking?.paidAmount
    ?? booking?.payment?.amount
    ?? 0
  )
  const isCancelled =
    CANCELLED_STATUS_KEYS.has(bookingStatusKey)
    || CANCELLED_STATUS_KEYS.has(paymentStatusKey)
    || CANCELLED_STATUS_KEYS.has(depositStatusKey)
  const isFailed =
    !isCancelled
    && (
      FAILED_PAYMENT_STATUS_KEYS.has(paymentStatusKey)
      || FAILED_PAYMENT_STATUS_KEYS.has(depositStatusKey)
    )
  const currentPaymentMarkedPaid = PAID_PAYMENT_STATUS_KEYS.has(paymentStatusKey)
  const depositMarkedPaid =
    currentPaymentMarkedPaid
    || PAID_PAYMENT_STATUS_KEYS.has(depositStatusKey)
  const hasExplicitDepositConfirmation = Boolean(
    booking?.depositPaid
    || booking?.depositPaidAt
    || depositStatusKey === "paid"
    || depositStatusKey === "deposit_paid"
    || paymentStatusKey === "deposit_paid"
    || (
      currentPaymentMarkedPaid
      && paymentTypeKey !== "full"
    )
  )
  const isPaymentAwaitingOwnerConfirmation = Boolean(
    !isCancelled
    && !isFailed
    && bookingStatusKey === "pending"
    && !booking?.depositPaid
    && !booking?.depositPaidAt
    && !booking?.fullyPaidAt
    && fallbackRemainingAmount > 0
    && (
      paymentMethodKey === "cash"
      || (
        !paymentMethodKey
        && depositMarkedPaid
      )
    )
  )
  const hasExplicitZeroRemainingAmount =
    hasExplicitMoneyValue(rawRemainingValue)
    && Number(rawRemainingValue) <= 0
  const hasExplicitRemainingSettlement = Boolean(
    !isCancelled
    && !isFailed
    && currentPaymentMarkedPaid
    && paidAmount > 0
    && (
      paidAmount >= fallbackRemainingAmount
      || (
        hasExplicitDepositConfirmation
        && paidAmount + depositAmount >= totalAmount
      )
    )
  )
  const hasExplicitFullPaymentSignal = Boolean(
    !isCancelled
    && !isFailed
    && !isPaymentAwaitingOwnerConfirmation
    && (
      bookingStatusKey === "completed"
      || (
        (
          booking?.fullyPaidAt
          || (
            paymentTypeKey === "full"
            && hasExplicitRemainingSettlement
          )
          || (
            hasExplicitZeroRemainingAmount
            && currentPaymentMarkedPaid
          )
        )
      )
    )
  )
  const rawRemainingAmount = hasExplicitMoneyValue(rawRemainingValue)
    ? Number(rawRemainingValue)
    : Number.NaN
  const shouldUseFallbackRemainingAmount =
    !Number.isFinite(rawRemainingAmount)
    || (
      rawRemainingAmount <= 0
      && fallbackRemainingAmount > 0
      && !hasExplicitFullPaymentSignal
    )
  const remainingAmountFromData = shouldUseFallbackRemainingAmount
    ? fallbackRemainingAmount
    : Math.max(rawRemainingAmount, 0)
  const hasConfirmedDeposit = Boolean(
    !isCancelled
    && !isFailed
    && !isPaymentAwaitingOwnerConfirmation
    && (
      hasExplicitFullPaymentSignal
      || hasExplicitDepositConfirmation
      || (
        depositMarkedPaid
        && paymentTypeKey !== "full"
      )
    )
  )
  const isFullyPaid = Boolean(
    !isCancelled
    && !isFailed
    && hasExplicitFullPaymentSignal
  )
  const remainingAmount =
    isFullyPaid
      ? 0
      : hasConfirmedDeposit
        ? remainingAmountFromData
        : totalAmount
  const paidDepositAmount = hasConfirmedDeposit ? Math.min(depositAmount || totalAmount, totalAmount) : 0
  const remainingPaidAmount = isFullyPaid ? Math.max(totalAmount - paidDepositAmount, 0) : 0
  const isRemainingPaymentAwaitingOwnerConfirmation = Boolean(
    !isCancelled
    && !isFailed
    && !isFullyPaid
    && hasConfirmedDeposit
    && paymentTypeKey === "full"
    && paymentMethodKey === "cash"
    && PENDING_PAYMENT_STATUS_KEYS.has(paymentStatusKey)
    && remainingAmount > 0
  )

  if (isCancelled) {
    return {
      statusKey: "cancelled",
      label: "Đã hủy",
      tone: "neutral",
      totalAmount,
      depositAmount,
      remainingAmount,
      paidDepositAmount,
      remainingPaidAmount,
      hasConfirmedDeposit,
      isFullyPaid,
      canShowPaymentAction: false,
      actionLabel: "",
    }
  }

  if (isFailed) {
    return {
      statusKey: "failed",
      label: "Thanh toán thất bại",
      tone: "danger",
      totalAmount,
      depositAmount,
      remainingAmount,
      paidDepositAmount: 0,
      remainingPaidAmount: 0,
      hasConfirmedDeposit: false,
      isFullyPaid: false,
      canShowPaymentAction: true,
      actionLabel: "Thanh toán lại",
    }
  }

  if (isFullyPaid) {
    return {
      statusKey: "paid",
      label: "Đã thanh toán đủ",
      tone: "success",
      totalAmount,
      depositAmount,
      remainingAmount: 0,
      paidDepositAmount,
      remainingPaidAmount,
      hasConfirmedDeposit,
      isFullyPaid: true,
      canShowPaymentAction: false,
      actionLabel: "",
    }
  }

  if (isRemainingPaymentAwaitingOwnerConfirmation) {
    return {
      statusKey: "remaining_pending",
      label: "Chờ xác nhận thanh toán nốt",
      tone: "warning",
      totalAmount,
      depositAmount,
      remainingAmount,
      paidDepositAmount,
      remainingPaidAmount: 0,
      hasConfirmedDeposit: true,
      isFullyPaid: false,
      canShowPaymentAction: false,
      actionLabel: "",
    }
  }

  if (hasConfirmedDeposit && remainingAmount > 0) {
    return {
      statusKey: "deposit_paid",
      label: "Đã cọc",
      tone: "warning",
      totalAmount,
      depositAmount,
      remainingAmount,
      paidDepositAmount,
      remainingPaidAmount: 0,
      hasConfirmedDeposit: true,
      isFullyPaid: false,
      canShowPaymentAction: true,
      actionLabel: "Thanh toán phần còn lại",
    }
  }

  if (
    PENDING_PAYMENT_STATUS_KEYS.has(paymentStatusKey)
    || PENDING_PAYMENT_STATUS_KEYS.has(depositStatusKey)
    || bookingStatusKey === "pending"
  ) {
    return {
      statusKey: "pending",
      label: "Chờ xác nhận",
      tone: "warning",
      totalAmount,
      depositAmount,
      remainingAmount,
      paidDepositAmount: 0,
      remainingPaidAmount: 0,
      hasConfirmedDeposit: false,
      isFullyPaid: false,
      canShowPaymentAction: true,
      actionLabel: "Xem yêu cầu thanh toán",
    }
  }

  return {
    statusKey: "unpaid",
    label: "Chưa thanh toán",
    tone: "warning",
    totalAmount,
    depositAmount,
    remainingAmount,
    paidDepositAmount: 0,
    remainingPaidAmount: 0,
    hasConfirmedDeposit: false,
    isFullyPaid: false,
    canShowPaymentAction: true,
    actionLabel: "Thanh toán đặt cọc",
  }
}

export const formatDepositMethodVi = (value) => {
  switch (normalizeStatusKey(value)) {
    case "cash":
      return "Tiền mặt"
    case "qr":
      return "QR"
    default:
      return value || ""
  }
}
