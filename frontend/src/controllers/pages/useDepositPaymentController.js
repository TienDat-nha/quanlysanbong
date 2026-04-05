import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { confirmPayment, createBookingPayment, getBookingById, getMyBookings } from "../../models/api"
import {
  getStoredKnownBookings,
  mergeKnownBookingCollections,
  persistKnownBookings,
} from "../../models/bookingCacheModel"
import {
  buildTimeSlotLabel,
  calculateBookingDepositAmount,
  calculateRemainingPaymentAmount,
  formatBookingDateLabel,
  formatBookingDurationLabel,
  formatCompactTimeSlot,
  getBookingDurationMinutes,
  parseTimeSlot,
} from "../../models/bookingModel"
import { getBookingPaymentSummaryVi } from "../../models/bookingTextModel"
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

const deriveFieldFromBooking = (booking, fallbackField = null) => {
  if (fallbackField) {
    return fallbackField
  }

  if (!booking || typeof booking !== "object") {
    return null
  }

  if (booking.field && typeof booking.field === "object") {
    return booking.field
  }

  const name = String(booking.fieldName || "").trim()
  const address = String(booking.fieldAddress || "").trim()
  const district = String(booking.fieldDistrict || "").trim()

  if (!name && !address && !district) {
    return null
  }

  return {
    id: String(booking.fieldId || "").trim(),
    name,
    address,
    district,
  }
}

const findStoredBookingById = (bookingId) =>
  getStoredKnownBookings().find((item) => String(item?.id || "").trim() === String(bookingId || "").trim()) || null

const persistKnownBooking = (booking) => {
  if (!booking) {
    return
  }

  persistKnownBookings(mergeKnownBookingCollections(getStoredKnownBookings(), [booking]))
}

const formatCountdownLabel = (totalSeconds = 0) => {
  const normalizedSeconds = Math.max(Number(totalSeconds) || 0, 0)
  const minutes = Math.floor(normalizedSeconds / 60)
  const seconds = normalizedSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const HOLD_EXPIRED_BOOKING_MESSAGE =
  "Đơn đặt sân đã hết thời gian chờ. Vui lòng chọn lại khung giờ khác."

const getExpiryTimestamp = (value) => {
  if (!value) {
    return 0
  }

  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime()
}

const getGroupedBookingIds = (bookingId, locationState, search) => {
  const searchParams = new URLSearchParams(search || "")
  const searchBookingIds = String(searchParams.get("bookingIds") || "")
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean)
  const stateBookingIds = Array.isArray(locationState?.bookingIds)
    ? locationState.bookingIds
    : Array.isArray(locationState?.booking?.bookingIds)
      ? locationState.booking.bookingIds
      : []

  return Array.from(
    new Set(
      [...stateBookingIds, ...searchBookingIds, bookingId]
        .map((item) => String(item || "").trim())
        .filter(Boolean)
      )
  )
}

const isNavigationEventLike = (value) =>
  Boolean(
    value
    && typeof value === "object"
    && (
      typeof value.preventDefault === "function"
      || typeof value.stopPropagation === "function"
      || "nativeEvent" in value
      || "currentTarget" in value
      || "target" in value
    )
  )

const getBookingTimeRange = (booking) => {
  const parsedRange = parseTimeSlot(String(booking?.timeSlot || "").trim())
  if (parsedRange) {
    return parsedRange
  }

  const startTime = String(booking?.timeSlotInfo?.startTime || "").trim()
  const endTime = String(booking?.timeSlotInfo?.endTime || "").trim()
  const parsedFromInfo = parseTimeSlot(startTime && endTime ? `${startTime} - ${endTime}` : "")
  if (parsedFromInfo) {
    return parsedFromInfo
  }

  const startMinutes = Number(booking?.timeSlotInfo?.startMinutes)
  const endMinutes = Number(booking?.timeSlotInfo?.endMinutes)
  if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes) {
    return { startMinutes, endMinutes }
  }

  return null
}

const hasExplicitAmountValue = (value) =>
  value !== null
  && value !== undefined
  && (typeof value !== "string" || value.trim() !== "")

const applyConfirmedPaymentSelectionToBooking = (
  booking,
  {
    paymentOption = "deposit",
    paymentAmount = 0,
    totalAmount = 0,
    depositAmount = 0,
    remainingAmount = 0,
  } = {}
) => {
  if (!booking || typeof booking !== "object") {
    return null
  }

  const normalizedPaymentOption = String(paymentOption || "deposit").trim().toLowerCase()
  const normalizedTotalAmount = Math.max(Number(booking?.totalPrice || totalAmount || 0), 0)
  const fallbackDepositAmount = calculateBookingDepositAmount(normalizedTotalAmount)
  const currentDepositAmount = Number(booking?.depositAmount)
  const effectiveDepositAmount =
    Number.isFinite(currentDepositAmount) && currentDepositAmount > 0
      ? currentDepositAmount
      : Math.max(Number(depositAmount || fallbackDepositAmount), 0)
  const currentRemainingAmount = hasExplicitAmountValue(booking?.remainingAmount)
    ? Number(booking?.remainingAmount)
    : Number.NaN
  const fallbackRemainingAmount = calculateRemainingPaymentAmount(normalizedTotalAmount, effectiveDepositAmount)
  const effectiveRemainingAmount =
    normalizedPaymentOption === "full"
      ? 0
      : (
        Number.isFinite(currentRemainingAmount) && currentRemainingAmount > 0
          ? currentRemainingAmount
          : Math.max(Number(remainingAmount || fallbackRemainingAmount), 0)
      )
  const effectivePaymentAmount =
    normalizedPaymentOption === "full"
      ? Math.max(Number(paymentAmount || normalizedTotalAmount), normalizedTotalAmount)
      : Math.max(Number(paymentAmount || effectiveDepositAmount), effectiveDepositAmount)

  return {
    ...booking,
    totalPrice: normalizedTotalAmount,
    paymentType: normalizedPaymentOption === "full" ? "FULL" : "DEPOSIT",
    type: normalizedPaymentOption === "full" ? "FULL" : "DEPOSIT",
    depositAmount: effectiveDepositAmount,
    remainingAmount: effectiveRemainingAmount,
    paidAmount: effectivePaymentAmount,
    depositPaid: true,
    fullyPaid: normalizedPaymentOption === "full",
    depositStatus: "PAID",
    paymentStatus: normalizedPaymentOption === "full" ? "PAID" : "DEPOSIT_PAID",
    expiredAt: "",
    holdExpiresAt: "",
  }
}

const aggregatePaymentBookings = (bookings = [], fallbackBooking = null) => {
  const nextBookings = (Array.isArray(bookings) ? bookings : []).filter(Boolean)
  const fallback = fallbackBooking && typeof fallbackBooking === "object" ? fallbackBooking : null

  if (nextBookings.length === 0) {
    return fallback
  }

  if (nextBookings.length === 1) {
    const [singleBooking] = nextBookings
    return {
      ...singleBooking,
      bookingIds: [String(singleBooking?.id || singleBooking?._id || "").trim()].filter(Boolean),
      groupedBookings: [singleBooking],
      groupedBookingCount: 1,
    }
  }

  const sortedBookings = [...nextBookings].sort((left, right) => {
    const leftRange = getBookingTimeRange(left)
    const rightRange = getBookingTimeRange(right)
    return Number(leftRange?.startMinutes || 0) - Number(rightRange?.startMinutes || 0)
  })
  const firstBooking = sortedBookings[0] || fallback || null
  const lastBooking = sortedBookings[sortedBookings.length - 1] || firstBooking
  const firstRange = getBookingTimeRange(firstBooking)
  const lastRange = getBookingTimeRange(lastBooking)
  const paymentSummaries = sortedBookings.map((item) => getBookingPaymentSummaryVi(item))
  const fullyPaidCount = paymentSummaries.filter((item) => item?.isFullyPaid).length
  const confirmedDepositCount = paymentSummaries.filter((item) => item?.hasConfirmedDeposit).length
  const earliestExpiry = sortedBookings
    .map((booking) => String(booking?.expiredAt || booking?.holdExpiresAt || "").trim())
    .map((value) => ({ value, timestamp: getExpiryTimestamp(value) }))
    .filter((item) => item.timestamp > 0)
    .sort((left, right) => left.timestamp - right.timestamp)[0]

  return {
    ...firstBooking,
    bookingIds: sortedBookings
      .map((booking) => String(booking?.id || booking?._id || "").trim())
      .filter(Boolean),
    groupedBookings: sortedBookings,
    groupedBookingCount: sortedBookings.length,
    timeSlot:
      firstRange && lastRange
        ? buildTimeSlotLabel(firstRange.startMinutes, lastRange.endMinutes)
        : String(firstBooking?.timeSlot || "").trim(),
    totalPrice: paymentSummaries.reduce((sum, item) => sum + Number(item?.totalAmount || 0), 0),
    depositAmount: paymentSummaries.reduce((sum, item) => sum + Number(item?.depositAmount || 0), 0),
    remainingAmount: paymentSummaries.reduce((sum, item) => sum + Number(item?.remainingAmount || 0), 0),
    paidAmount: paymentSummaries.reduce(
      (sum, item) => sum + Number(item?.paidDepositAmount || 0) + Number(item?.remainingPaidAmount || 0),
      0
    ),
    depositPaid: confirmedDepositCount === sortedBookings.length,
    fullyPaid: fullyPaidCount === sortedBookings.length,
    paymentStatus:
      fullyPaidCount === sortedBookings.length
        ? "PAID"
        : confirmedDepositCount === sortedBookings.length
          ? "DEPOSIT_PAID"
          : confirmedDepositCount > 0
            ? "PARTIAL"
            : String(firstBooking?.paymentStatus || firstBooking?.depositStatus || "UNPAID").trim(),
    depositStatus:
      confirmedDepositCount === sortedBookings.length
        ? "PAID"
        : "UNPAID",
    paymentType:
      fullyPaidCount === sortedBookings.length
        ? "FULL"
        : confirmedDepositCount > 0
          ? "DEPOSIT"
          : String(firstBooking?.paymentType || firstBooking?.type || "").trim(),
    status:
      sortedBookings.every((booking) => String(booking?.status || "").trim().toUpperCase() === "CONFIRMED")
        ? "CONFIRMED"
        : sortedBookings.some((booking) => String(booking?.status || "").trim().toUpperCase() === "PENDING")
          ? "PENDING"
          : String(firstBooking?.status || "").trim(),
    expiredAt: earliestExpiry?.value || "",
    holdExpiresAt: earliestExpiry?.value || "",
  }
}

const isBookingPaymentConfirmed = (booking) => {
  if (!booking || typeof booking !== "object") {
    return false
  }

  const paymentSummary = getBookingPaymentSummaryVi(booking)
  return paymentSummary.hasConfirmedDeposit || paymentSummary.isFullyPaid
}

export const useDepositPaymentController = ({ authToken }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { bookingId } = useParams()
  const cachedBooking = findStoredBookingById(bookingId)
  const paymentBookingIds = useMemo(
    () => getGroupedBookingIds(bookingId, location.state, location.search),
    [bookingId, location.search, location.state]
  )
  const initialBooking = useMemo(
    () =>
      aggregatePaymentBookings(
        [location.state?.booking || cachedBooking].filter(Boolean),
        location.state?.booking || cachedBooking || null
      ),
    [cachedBooking, location.state]
  )
  const initialField = useMemo(
    () => deriveFieldFromBooking(initialBooking, location.state?.field || cachedBooking?.field || null),
    [cachedBooking?.field, initialBooking, location.state]
  )

  const [booking, setBooking] = useState(initialBooking)
  const [field, setField] = useState(initialField)
  const [loading, setLoading] = useState(Boolean(authToken))
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState(() => createProviderFeedback(location.search))
  const [actionLoading, setActionLoading] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now())
  const [paymentOption, setPaymentOption] = useState("deposit")
  const [lastAutoExpiredHold, setLastAutoExpiredHold] = useState("")

  useEffect(() => {
    setFeedback(createProviderFeedback(location.search))
  }, [location.search])

  useEffect(() => {
    if (!authToken) {
      setLoading(false)
      return
    }

    let mounted = true

    const loadBooking = async () => {
      setLoading(true)
      setError("")

      try {
        let nextBooking = null

        if (paymentBookingIds.length > 1) {
          const bookingData = await getMyBookings(authToken)
          const liveBookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
          const liveBookingMap = new Map(
            liveBookings.map((item) => [String(item?.id || item?._id || "").trim(), item])
          )
          const matchedBookings = paymentBookingIds
            .map((id) => liveBookingMap.get(String(id || "").trim()))
            .filter(Boolean)

          nextBooking = aggregatePaymentBookings(matchedBookings, initialBooking)
          if (!nextBooking) {
            throw new Error("Không tìm thấy đơn đặt sân cần thanh toán.")
          }

          matchedBookings.forEach((item) => persistKnownBooking(item))
        } else {
          const data = await getBookingById(bookingId, authToken)
          nextBooking = data.booking || initialBooking || null
          persistKnownBooking(nextBooking)
        }

        if (!mounted) {
          return
        }

        const nextField = deriveFieldFromBooking(
          nextBooking,
          location.state?.field || nextBooking?.field || cachedBooking?.field || null
        )

        setBooking(nextBooking)
        setField(nextField)
      } catch (apiError) {
        if (!mounted) {
          return
        }

        const fallbackBooking = initialBooking
        const fallbackField = deriveFieldFromBooking(
          fallbackBooking,
          location.state?.field || cachedBooking?.field || null
        )

        if (fallbackBooking) {
          setBooking(fallbackBooking)
          setField(fallbackField)
          setError("")
        } else {
          setError(apiError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadBooking()

    return () => {
      mounted = false
    }
  }, [authToken, bookingId, cachedBooking, initialBooking, location.state, paymentBookingIds, refreshKey])

  useEffect(() => {
    const hasExpiry = Boolean(booking?.expiredAt || booking?.holdExpiresAt)
    if (!hasExpiry) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [booking?.expiredAt, booking?.holdExpiresAt])

  const totalPrice = useMemo(
    () => Number(booking?.totalPrice || location.state?.totalPrice || 0),
    [booking?.totalPrice, location.state?.totalPrice]
  )

  const depositAmount = useMemo(
    () => {
      const bookingDepositAmount = Number(booking?.depositAmount)
      if (Number.isFinite(bookingDepositAmount) && bookingDepositAmount > 0) {
        return bookingDepositAmount
      }

      const stateDepositAmount = Number(location.state?.depositAmount)
      if (Number.isFinite(stateDepositAmount) && stateDepositAmount > 0) {
        return stateDepositAmount
      }

      return calculateBookingDepositAmount(totalPrice)
    },
    [booking?.depositAmount, location.state?.depositAmount, totalPrice]
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

  const paymentSummary = useMemo(
    () =>
      getBookingPaymentSummaryVi({
        ...booking,
        totalPrice,
        depositAmount,
        remainingAmount,
      }),
    [booking, depositAmount, remainingAmount, totalPrice]
  )
  const fullyPaid = paymentSummary.isFullyPaid
  const paymentConfirmed = paymentSummary.hasConfirmedDeposit || paymentSummary.isFullyPaid
  const holdExpiresAt = String(booking?.expiredAt || booking?.holdExpiresAt || "").trim()
  const holdExpiryTimestamp = getExpiryTimestamp(holdExpiresAt)
  const secondsRemaining = paymentConfirmed || !holdExpiryTimestamp
    ? 0
    : Math.max(0, Math.ceil((holdExpiryTimestamp - nowTimestamp) / 1000))
  const holdExpired = !paymentConfirmed && holdExpiryTimestamp > 0 && secondsRemaining <= 0
  const countdownLabel = formatCountdownLabel(secondsRemaining)

  useEffect(() => {
    if (!holdExpired || paymentConfirmed || !holdExpiresAt) {
      return
    }

    if (lastAutoExpiredHold === holdExpiresAt) {
      return
    }

    setLastAutoExpiredHold(holdExpiresAt)

    let cancelled = false

    const redirectExpiredPaymentFlow = async () => {
      const targetBookingIds =
        Array.isArray(booking?.bookingIds) && booking.bookingIds.length > 0
          ? booking.bookingIds.map((item) => String(item || "").trim()).filter(Boolean)
          : paymentBookingIds

      let latestBooking = booking || null

      try {
        if (authToken && targetBookingIds.length > 0) {
          if (targetBookingIds.length > 1) {
            const bookingData = await getMyBookings(authToken)
            const liveBookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
            const liveBookingMap = new Map(
              liveBookings.map((item) => [String(item?.id || item?._id || "").trim(), item])
            )
            const matchedBookings = targetBookingIds
              .map((id) => liveBookingMap.get(String(id || "").trim()))
              .filter(Boolean)

            latestBooking = aggregatePaymentBookings(matchedBookings, booking || null)
          } else {
            const bookingData = await getBookingById(targetBookingIds[0], authToken)
            latestBooking = bookingData?.booking || latestBooking
          }
        }
      } catch (_error) {
        latestBooking = booking || latestBooking
      }

      if (cancelled) {
        return
      }

      if (isBookingPaymentConfirmed(latestBooking)) {
        setBooking(latestBooking)
        if (latestBooking?.groupedBookings?.length) {
          latestBooking.groupedBookings.forEach((item) => persistKnownBooking(item))
        } else {
          persistKnownBooking(latestBooking)
        }
        return
      }

      navigate(ROUTES.booking, {
        replace: true,
        state: {
          bookingMessage: HOLD_EXPIRED_BOOKING_MESSAGE,
          bookingMessageType: "error",
        },
      })
    }

    redirectExpiredPaymentFlow()

    return () => {
      cancelled = true
    }
  }, [
    authToken,
    booking,
    holdExpired,
    holdExpiresAt,
    lastAutoExpiredHold,
    navigate,
    paymentBookingIds,
    paymentConfirmed,
  ])

  useEffect(() => {
    if (fullyPaid) {
      setPaymentOption("full")
      return
    }

    setPaymentOption("deposit")
  }, [fullyPaid, booking?.id])

  const selectedPaymentAmount = useMemo(
    () => (
      paymentOption === "full"
        ? Math.max(totalPrice, 0)
        : Math.max(depositAmount, 0)
    ),
    [depositAmount, paymentOption, totalPrice]
  )

  const selectedRemainingAmount = useMemo(
    () => (
      paymentOption === "full"
        ? 0
        : remainingAmount
    ),
    [paymentOption, remainingAmount]
  )

  // eslint-disable-next-line no-unused-vars
  const paymentOptionLabel = paymentOption === "full" ? "toàn bộ" : "đặt cọc 40%"

  // eslint-disable-next-line no-unused-vars
  const paymentOptions = useMemo(
    () => [
      {
        id: "deposit",
        label: "Đặt cọc 40%",
        amount: depositAmount,
        remainingAmount,
        description: "Xác nhận sân với mức cọc 40% tổng tiền.",
      },
      {
        id: "full",
        label: "Thanh toán toàn bộ",
        amount: totalPrice,
        remainingAmount: 0,
        description: "Thanh toán đủ 100% tổng tiền sân đã đặt.",
      },
    ],
    [depositAmount, remainingAmount, totalPrice]
  )

  // eslint-disable-next-line no-unused-vars
  const paymentMethods = useMemo(
    () => ({
      staticTransfer: {
        enabled: Boolean(booking?.id) && !paymentConfirmed && !holdExpired,
        message: holdExpired ? "Booking đã hết thời gian giữ chỗ." : "",
      },
      vnpay: {
        enabled: false,
        message: "Flow moi cua backend xac nhan booking truc tiep theo expiredAt.",
      },
      momo: {
        enabled: false,
        message: "Flow moi cua backend xac nhan booking truc tiep theo expiredAt.",
      },
    }),
    [booking?.id, holdExpired, paymentConfirmed]
  )

  const displayPaymentOptionLabel = paymentOption === "full" ? "toàn bộ" : "đặt cọc 40%"

  const displayPaymentOptions = useMemo(
    () => [
      {
        id: "deposit",
        label: "Đặt cọc 40%",
        amount: depositAmount,
        remainingAmount,
        description: "Xác nhận sân với mức cọc 40% tổng tiền.",
      },
      {
        id: "full",
        label: "Thanh toán toàn bộ",
        amount: totalPrice,
        remainingAmount: 0,
        description: "Thanh toán đủ 100% tổng tiền sân đã đặt.",
      },
    ],
    [depositAmount, remainingAmount, totalPrice]
  )

  const displayPaymentMethods = useMemo(
    () => ({
      staticTransfer: {
        enabled: Boolean(booking?.id) && !paymentConfirmed && !holdExpired,
        message: holdExpired ? "Đơn đặt sân đã hết thời gian giữ chỗ." : "",
      },
      vnpay: {
        enabled: false,
        message: "Luồng backend hiện xác nhận booking trực tiếp theo thời gian giữ chỗ.",
      },
      momo: {
        enabled: false,
        message: "Luồng backend hiện xác nhận booking trực tiếp theo thời gian giữ chỗ.",
      },
    }),
    [booking?.id, holdExpired, paymentConfirmed]
  )

  const staticTransfer = useMemo(
    () => ({
      amount: selectedPaymentAmount,
      accountNumber: String(booking?.id || "").trim(),
      accountName: "BOOKING",
      transferNote: String(booking?.id || "").trim(),
      qrImageUrl: "",
    }),
    [booking?.id, selectedPaymentAmount]
  )

  // eslint-disable-next-line no-unused-vars
  const handleConfirmStaticDeposit = async () => {
    if (!authToken || !bookingId || paymentConfirmed || holdExpired) {
      return
    }

    setActionLoading("static")
    setError("")
    setFeedback(null)

    try {
      const paymentData = await createBookingPayment(
        authToken,
        bookingId,
        "CASH",
        paymentOption === "full" ? "FULL" : "DEPOSIT",
        selectedPaymentAmount
      )
      const paymentId = String(paymentData?.payment?.id || paymentData?.payment?._id || "").trim()

      if (!paymentId) {
        throw new Error("Backend khong tra ve payment hop le.")
      }

      await confirmPayment(authToken, paymentId)

      let nextBooking = null

      try {
        const bookingData = await getBookingById(bookingId, authToken)
        nextBooking = applyConfirmedPaymentSelectionToBooking(bookingData.booking || null, {
          paymentOption,
          paymentAmount: selectedPaymentAmount,
          totalAmount: totalPrice,
          depositAmount,
          remainingAmount,
        })
      } catch (_apiError) {
        nextBooking = applyConfirmedPaymentSelectionToBooking(booking, {
          paymentOption,
          paymentAmount: selectedPaymentAmount,
          totalAmount: totalPrice,
          depositAmount,
          remainingAmount,
        })
      }

      setBooking(nextBooking || booking)
      persistKnownBooking(nextBooking || booking)
      setFeedback({
        type: "success",
        text:
          paymentOption === "full"
            ? "Da xac nhan thanh toan toàn bộ thanh cong."
            : "Da xac nhan dat coc thanh cong.",
      })
      setRefreshKey((value) => value + 1)
    } catch (apiError) {
      setFeedback({
        type: "error",
        text: apiError.message,
      })
    } finally {
      setActionLoading("")
    }
  }

  const handleConfirmStaticDepositClean = async () => {
    const targetBookingIds =
      Array.isArray(booking?.bookingIds) && booking.bookingIds.length > 0
        ? booking.bookingIds.map((item) => String(item || "").trim()).filter(Boolean)
        : paymentBookingIds

    if (!authToken || targetBookingIds.length === 0 || paymentConfirmed || holdExpired) {
      return
    }

    setActionLoading("static")
    setError("")
    setFeedback(null)

    try {
      const paymentResults = await Promise.allSettled(
        targetBookingIds.map(async (targetBookingId) => {
          const paymentData = await createBookingPayment(
            authToken,
            targetBookingId,
            "CASH",
            paymentOption === "full" ? "FULL" : "DEPOSIT",
            targetBookingIds.length === 1 ? selectedPaymentAmount : null
          )
          const paymentId = String(paymentData?.payment?.id || paymentData?.payment?._id || "").trim()

          if (!paymentId) {
            throw new Error("Backend không trả về payment hợp lệ.")
          }

          await confirmPayment(authToken, paymentId)
          return targetBookingId
        })
      )

      const confirmedBookingIds = paymentResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
        .filter(Boolean)

      if (confirmedBookingIds.length === 0) {
        const rejectedResult = paymentResults.find((result) => result.status === "rejected")
        throw rejectedResult?.reason || new Error("Không thể xác nhận thanh toán cho đơn đặt sân này.")
      }

      let nextBooking = null

      try {
        if (targetBookingIds.length > 1) {
          const bookingData = await getMyBookings(authToken)
          const liveBookings = Array.isArray(bookingData?.bookings) ? bookingData.bookings : []
          const liveBookingMap = new Map(
            liveBookings.map((item) => [String(item?.id || item?._id || "").trim(), item])
          )
          const matchedBookings = targetBookingIds
            .map((id) => liveBookingMap.get(String(id || "").trim()))
            .filter(Boolean)
            .map((item) => {
              const itemTotalAmount = Number(item?.totalPrice || 0)
              const itemDepositAmount =
                Number(item?.depositAmount) > 0
                  ? Number(item.depositAmount)
                  : calculateBookingDepositAmount(itemTotalAmount)
              const itemRemainingAmount =
                hasExplicitAmountValue(item?.remainingAmount)
                  ? Number(item.remainingAmount)
                  : calculateRemainingPaymentAmount(itemTotalAmount, itemDepositAmount)

              return applyConfirmedPaymentSelectionToBooking(item, {
                paymentOption,
                paymentAmount: paymentOption === "full" ? itemTotalAmount : itemDepositAmount,
                totalAmount: itemTotalAmount,
                depositAmount: itemDepositAmount,
                remainingAmount: itemRemainingAmount,
              })
            })
            .filter(Boolean)

          nextBooking = aggregatePaymentBookings(matchedBookings, booking)
          matchedBookings.forEach((item) => persistKnownBooking(item))
        } else {
          const bookingData = await getBookingById(targetBookingIds[0], authToken)
          nextBooking = applyConfirmedPaymentSelectionToBooking(bookingData.booking || null, {
            paymentOption,
            paymentAmount: selectedPaymentAmount,
            totalAmount: totalPrice,
            depositAmount,
            remainingAmount,
          })
          persistKnownBooking(nextBooking)
        }
      } catch (_apiError) {
        nextBooking = confirmedBookingIds.length === targetBookingIds.length
          ? applyConfirmedPaymentSelectionToBooking(booking, {
              paymentOption,
              paymentAmount: selectedPaymentAmount,
              totalAmount: totalPrice,
              depositAmount,
              remainingAmount: selectedRemainingAmount,
            })
          : booking || null
      }

      setBooking(nextBooking || booking)
      if (nextBooking?.groupedBookings?.length) {
        nextBooking.groupedBookings.forEach((item) => persistKnownBooking(item))
      } else {
        persistKnownBooking(nextBooking || booking)
      }
      setFeedback({
        type: confirmedBookingIds.length === targetBookingIds.length ? "success" : "warning",
        text:
          confirmedBookingIds.length === targetBookingIds.length
            ? (
              paymentOption === "full"
                ? `Đã xác nhận thanh toán toàn bộ thành công${targetBookingIds.length > 1 ? ` cho ${targetBookingIds.length} khung giờ` : ""}.`
                : `Đã xác nhận đặt cọc thành công${targetBookingIds.length > 1 ? ` cho ${targetBookingIds.length} khung giờ` : ""}.`
            )
            : `Đã xác nhận ${confirmedBookingIds.length}/${targetBookingIds.length} khung giờ. Vui lòng kiểm tra lại các khung còn lại.`,
      })
      setRefreshKey((value) => value + 1)
    } catch (apiError) {
      setFeedback({
        type: "error",
        text: apiError.message,
      })
    } finally {
      setActionLoading("")
    }
  }

  const handleCreateVnpayPayment = () => {
    setFeedback({
      type: "warning",
      text: "Luồng backend hiện xác nhận booking trực tiếp trước khi hết thời gian giữ chỗ.",
    })
  }

  const handleCreateMomoPayment = () => {
    setFeedback({
      type: "warning",
      text: "Luồng backend hiện xác nhận booking trực tiếp trước khi hết thời gian giữ chỗ.",
    })
  }

  const handleRefresh = () => {
    setRefreshKey((value) => value + 1)
  }

  const handleGoToBookings = (navigationState = null) => {
    const nextState =
      navigationState
      && typeof navigationState === "object"
      && !isNavigationEventLike(navigationState)
        ? navigationState
        : undefined

    navigate(
      ROUTES.booking,
      nextState ? { state: nextState } : undefined
    )
  }

  const handleGoToFields = () => {
    navigate(ROUTES.fields)
  }

  const handlePaymentOptionChange = (value) => {
    if (paymentConfirmed || holdExpired) {
      return
    }

    const normalizedValue = String(value || "").trim().toLowerCase()
    setPaymentOption(normalizedValue === "full" ? "full" : "deposit")
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
    holdExpiresAt,
    holdExpired,
    countdownLabel,
    paymentMethods: displayPaymentMethods,
    staticTransfer,
    totalPrice,
    depositAmount,
    remainingAmount,
    selectedPaymentAmount,
    selectedRemainingAmount,
    paymentOption,
    paymentOptionLabel: displayPaymentOptionLabel,
    paymentOptions: displayPaymentOptions,
    summary,
    formatPrice,
    loginPath: ROUTES.login,
    bookingPath: ROUTES.booking,
    fieldsPath: ROUTES.fields,
    handleConfirmStaticDeposit: handleConfirmStaticDepositClean,
    handlePaymentOptionChange,
    handleCreateVnpayPayment,
    handleCreateMomoPayment,
    handleRefresh,
    handleGoToBookings,
    handleGoToFields,
  }
}
