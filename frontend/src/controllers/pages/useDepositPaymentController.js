import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  confirmStaticDeposit,
  createMomoDepositPayment,
  createVnpayDepositPayment,
  getBookingDepositInfo,
} from "../../models/api"
import {
  calculateRemainingPaymentAmount,
  formatBookingDateLabel,
  formatBookingDurationLabel,
  formatCompactTimeSlot,
  getBookingDurationMinutes,
} from "../../models/bookingModel"
import { formatPrice } from "../../models/fieldModel"
import { ROUTES } from "../../models/routeModel"

const createProviderFeedback = (search) => {
  const searchParams = new URLSearchParams(search)
  const paymentStatus = String(searchParams.get("paymentStatus") || "").trim().toLowerCase()
  const paymentMessage = String(searchParams.get("paymentMessage") || "").trim()

  if (!paymentStatus) {
    return null
  }

  return {
    type: paymentStatus === "success" ? "success" : "error",
    text: paymentMessage || "Không thể xử lý kết quả thanh toán.",
  }
}

export const useDepositPaymentController = ({ authToken }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { bookingId } = useParams()

  const [booking, setBooking] = useState(location.state?.booking || null)
  const [field, setField] = useState(location.state?.field || null)
  const [paymentMethods, setPaymentMethods] = useState(null)
  const [staticTransfer, setStaticTransfer] = useState(null)
  const [loading, setLoading] = useState(Boolean(authToken))
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState(() => createProviderFeedback(location.search))
  const [actionLoading, setActionLoading] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setFeedback(createProviderFeedback(location.search))
  }, [location.search])

  useEffect(() => {
    if (!authToken) {
      setLoading(false)
      return
    }

    let mounted = true

    const loadDepositInfo = async () => {
      setLoading(true)
      setError("")

      try {
        const data = await getBookingDepositInfo(authToken, bookingId)

        if (!mounted) {
          return
        }

        setBooking(data.booking || null)
        setField(data.field || null)
        setPaymentMethods(data.paymentMethods || null)
        setStaticTransfer(data.staticTransfer || null)
      } catch (apiError) {
        if (mounted) {
          setError(apiError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDepositInfo()

    return () => {
      mounted = false
    }
  }, [authToken, bookingId, refreshKey])

  const totalPrice = useMemo(
    () => Number(booking?.totalPrice || location.state?.totalPrice || 0),
    [booking?.totalPrice, location.state?.totalPrice]
  )

  const depositAmount = useMemo(
    () => Number(booking?.depositAmount || location.state?.depositAmount || 0),
    [booking?.depositAmount, location.state?.depositAmount]
  )

  const remainingAmount = useMemo(
    () =>
      Number(
        booking?.remainingAmount ?? calculateRemainingPaymentAmount(totalPrice, depositAmount)
      ),
    [booking?.remainingAmount, depositAmount, totalPrice]
  )

  const summary = useMemo(
    () => ({
      bookingDateLabel: formatBookingDateLabel(booking?.date),
      compactTimeSlot: formatCompactTimeSlot(booking?.timeSlot),
      durationLabel: formatBookingDurationLabel(getBookingDurationMinutes(booking?.timeSlot)),
    }),
    [booking?.date, booking?.timeSlot]
  )

  const paymentConfirmed = Boolean(
    booking?.depositPaid
    || booking?.fullyPaid
    || String(booking?.paymentStatus || "").trim().toLowerCase() === "paid"
  )

  const handleConfirmStaticDeposit = async () => {
    if (!authToken || !bookingId || paymentConfirmed) {
      return
    }

    setActionLoading("static")
    setError("")
    setFeedback(null)

    try {
      const data = await confirmStaticDeposit(authToken, bookingId)
      setBooking(data.booking || null)
      setField(data.field || null)
      setPaymentMethods(data.paymentMethods || null)
      setStaticTransfer(data.staticTransfer || null)
      setFeedback({
        type: "success",
        text:
          data.message
          || "Đã gửi yêu cầu xác nhận chuyển khoản. Vui lòng chờ chủ sân kiểm tra giao dịch.",
      })
    } catch (apiError) {
      setFeedback({
        type: "error",
        text: apiError.message,
      })
    } finally {
      setActionLoading("")
    }
  }

  const handleCreateVnpayPayment = async () => {
    if (!authToken || !bookingId || paymentConfirmed) {
      return
    }

    setActionLoading("vnpay")
    setError("")
    setFeedback(null)

    try {
      const data = await createVnpayDepositPayment(authToken, bookingId)

      if (!data.paymentUrl) {
        throw new Error("Không tạo được liên kết VNPAY.")
      }

      window.location.assign(data.paymentUrl)
    } catch (apiError) {
      setFeedback({
        type: "error",
        text: apiError.message,
      })
      setActionLoading("")
    }
  }

  const handleCreateMomoPayment = async () => {
    if (!authToken || !bookingId || paymentConfirmed) {
      return
    }

    setActionLoading("momo")
    setError("")
    setFeedback(null)

    try {
      const data = await createMomoDepositPayment(authToken, bookingId)

      if (!data.paymentUrl) {
        throw new Error("Không tạo được liên kết MoMo.")
      }

      window.location.assign(data.paymentUrl)
    } catch (apiError) {
      setFeedback({
        type: "error",
        text: apiError.message,
      })
      setActionLoading("")
    }
  }

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1)
  }

  const handleGoToBookings = () => {
    navigate(ROUTES.booking)
  }

  const handleGoToFields = () => {
    navigate(ROUTES.fields)
  }

  return {
    authToken,
    currentPath: `${location.pathname}${location.search}`,
    booking,
    field,
    loading,
    error,
    feedback,
    actionLoading,
    paymentConfirmed,
    paymentMethods,
    staticTransfer,
    totalPrice,
    depositAmount,
    remainingAmount,
    summary,
    formatPrice,
    loginPath: ROUTES.login,
    bookingPath: ROUTES.booking,
    fieldsPath: ROUTES.fields,
    handleConfirmStaticDeposit,
    handleCreateVnpayPayment,
    handleCreateMomoPayment,
    handleRefresh,
    handleGoToBookings,
    handleGoToFields,
  }
}
