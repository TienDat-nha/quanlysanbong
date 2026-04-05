import { useEffect, useRef, useState } from "react"
import {
  getAdminDashboard,
  getAdminFields,
  getBookedSlots,
  getMyBookings,
  cancelAdminBooking,
  confirmAdminBooking,
  confirmAdminBookingDeposit,
  confirmAdminBookingPayment,
} from "../../models/api"
import { getBookingPaymentSummaryVi } from "../../models/bookingTextModel"
import { getAdminDashboardState } from "../../models/adminDashboardModel"
import {
  buildTimeSlotLabel,
  getTodayBookingDate,
  isMongoObjectId,
  normalizeBookingDateValue,
  parseTimeSlot,
} from "../../models/bookingModel"

const OWNER_MANAGED_BOOKINGS_DATE_STORAGE_PREFIX = "sanbong_owner_managed_bookings_date"

const isActiveManagedBooking = (booking) => {
  const normalizedStatus = String(booking?.status || "").trim().toUpperCase()
  return normalizedStatus !== "CANCELLED" && normalizedStatus !== "CANCELED"
}

const getOwnerManagedBookingDateStorageKey = (currentUser) => {
  const ownerKey = String(
    currentUser?.id || currentUser?._id || currentUser?.userId || currentUser?.email || ""
  )
    .trim()
    .toLowerCase()

  return ownerKey ? `${OWNER_MANAGED_BOOKINGS_DATE_STORAGE_PREFIX}:${ownerKey}` : ""
}

const getStoredOwnerManagedBookingDate = (currentUser) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return ""
  }

  const storageKey = getOwnerManagedBookingDateStorageKey(currentUser)
  if (!storageKey) {
    return ""
  }

  return normalizeBookingDateValue(window.localStorage.getItem(storageKey) || "")
}

const persistOwnerManagedBookingDate = (currentUser, date) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return
  }

  const storageKey = getOwnerManagedBookingDateStorageKey(currentUser)
  if (!storageKey) {
    return
  }

  const normalizedDate = normalizeBookingDateValue(date)
  if (!normalizedDate) {
    window.localStorage.removeItem(storageKey)
    return
  }

  window.localStorage.setItem(storageKey, normalizedDate)
}

const mergeUniqueBookings = (...collections) => {
  const bookingMap = new Map()

  collections.flat().forEach((collection) => {
    ;(Array.isArray(collection) ? collection : []).forEach((booking, index) => {
      if (!booking || typeof booking !== "object") {
        return
      }

      const bookingId = String(booking?.id || booking?._id || "").trim()
      const identity =
        bookingId
        || [
          normalizeBookingDateValue(booking?.date),
          String(booking?.fieldId || booking?.fieldName || "").trim(),
          String(booking?.subFieldId || booking?.subFieldName || "").trim(),
          String(booking?.timeSlotId || booking?.timeSlot || "").trim(),
          String(booking?.phone || "").trim(),
          index,
        ]
          .filter(Boolean)
          .join("|")

      if (!identity) {
        return
      }

      bookingMap.set(identity, {
        ...(bookingMap.get(identity) || {}),
        ...booking,
      })
    })
  })

  return Array.from(bookingMap.values())
}

const getManagedBookingStartMinutes = (booking) => {
  const match = String(booking?.timeSlot || "").trim().match(/^(\d{1,2}):(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER
}

const getManagedBookingCustomerGroupKey = (booking) => {
  const customerId = String(booking?.customer?.id || "").trim().toLowerCase()
  if (customerId) {
    return `id:${customerId}`
  }

  const customerPhone = String(booking?.customer?.phone || booking?.phone || "").trim().toLowerCase()
  if (customerPhone) {
    return `phone:${customerPhone}`
  }

  const customerEmail = String(booking?.customer?.email || "").trim().toLowerCase()
  if (customerEmail) {
    return `email:${customerEmail}`
  }

  const customerName = String(booking?.customer?.fullName || "").trim().toLowerCase()
  if (customerName) {
    return `name:${customerName}`
  }

  const bookingId = String(booking?.id || booking?._id || "").trim().toLowerCase()
  return bookingId ? `booking:${bookingId}` : ""
}

const getManagedBookingGroupKey = (booking) =>
  [
    normalizeBookingDateValue(booking?.date),
    String(booking?.fieldId || booking?.fieldName || "").trim().toLowerCase(),
    String(booking?.subFieldId || booking?.subFieldName || "").trim().toLowerCase(),
    getManagedBookingCustomerGroupKey(booking),
  ]
    .filter(Boolean)
    .join("|")

const getManagedBookingTimeRange = (booking) => {
  const parsed = parseTimeSlot(String(booking?.timeSlot || "").trim())
  if (parsed) {
    return parsed
  }

  const startMinutes = Number(booking?.timeSlotInfo?.startMinutes)
  const endMinutes = Number(booking?.timeSlotInfo?.endMinutes)

  if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes > startMinutes) {
    return { startMinutes, endMinutes }
  }

  return null
}

const getManagedBookingHourlyPrice = (booking) => {
  const candidates = [
    booking?.subField?.pricePerHour,
    booking?.pricePerHour,
    booking?.subFieldPricePerHour,
    booking?.hourlyPrice,
  ]

  const matchedValue = candidates.find((value) => Number(value) > 0)
  return Number(matchedValue || 0)
}

const getManagedBookingNormalizedTotalPrice = (booking, hourlyPrice = getManagedBookingHourlyPrice(booking)) => {
  const timeRange = getManagedBookingTimeRange(booking)
  const durationMinutes =
    Number.isFinite(Number(timeRange?.startMinutes))
    && Number.isFinite(Number(timeRange?.endMinutes))
    && Number(timeRange.endMinutes) > Number(timeRange.startMinutes)
      ? Number(timeRange.endMinutes) - Number(timeRange.startMinutes)
      : 0

  if (hourlyPrice > 0 && durationMinutes > 0) {
    return Math.round((hourlyPrice * durationMinutes) / 60)
  }

  return Number(booking?.totalPrice || 0)
}

const getManagedBookingActionIds = (bookingOrId) => {
  if (!bookingOrId || typeof bookingOrId !== "object") {
    const fallbackId = String(bookingOrId || "").trim()
    return fallbackId ? [fallbackId] : []
  }

  const collectedIds = Array.isArray(bookingOrId?.bookingIds)
    ? bookingOrId.bookingIds
    : [bookingOrId?.id, bookingOrId?._id]

  const validIds = collectedIds
    .map((id) => String(id || "").trim())
    .filter((id) => isMongoObjectId(id))

  if (validIds.length > 0) {
    return Array.from(new Set(validIds))
  }

  const fallbackId = String(bookingOrId?.id || bookingOrId?._id || "").trim()
  return fallbackId ? [fallbackId] : []
}

const getManagedBookingItems = (booking) =>
  Array.isArray(booking?.groupedBookings) && booking.groupedBookings.length > 0
    ? booking.groupedBookings
    : [booking].filter(Boolean)

const getGroupedManagedBookingStatus = (bookings = []) => {
  const statuses = (Array.isArray(bookings) ? bookings : [])
    .map((booking) => String(booking?.status || "").trim().toUpperCase())
    .filter(Boolean)

  if (statuses.length === 0) {
    return "PENDING"
  }

  if (statuses.every((status) => status === "COMPLETED")) {
    return "COMPLETED"
  }

  if (statuses.every((status) => status === "CONFIRMED" || status === "COMPLETED")) {
    return "CONFIRMED"
  }

  if (statuses.some((status) => status === "PENDING")) {
    return "PENDING"
  }

  return statuses[0]
}

const getGroupedManagedBookingLatestTimestamp = (bookings = [], fieldName) =>
  (Array.isArray(bookings) ? bookings : [])
    .map((booking) => String(booking?.[fieldName] || "").trim())
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null

const getGroupedManagedBookingPaymentState = (bookings = []) => {
  const paymentSummaries = (Array.isArray(bookings) ? bookings : [])
    .filter(Boolean)
    .map((booking) => getBookingPaymentSummaryVi(booking))

  if (paymentSummaries.length === 0) {
    return {
      depositAmount: 0,
      remainingAmount: 0,
      paidAmount: 0,
      depositPaid: false,
      fullyPaid: false,
      paymentType: "",
      paymentStatus: "",
      depositStatus: "",
    }
  }

  const paidDepositAmount = paymentSummaries.reduce(
    (sum, item) => sum + Number(item?.paidDepositAmount || 0),
    0
  )
  const remainingPaidAmount = paymentSummaries.reduce(
    (sum, item) => sum + Number(item?.remainingPaidAmount || 0),
    0
  )
  const fullyPaid = paymentSummaries.every((item) => item?.isFullyPaid)
  const depositPaid = paymentSummaries.every((item) => item?.hasConfirmedDeposit || item?.isFullyPaid)
  const depositPaidAt = depositPaid
    ? getGroupedManagedBookingLatestTimestamp(bookings, "depositPaidAt")
    : null
  const fullyPaidAt = fullyPaid
    ? getGroupedManagedBookingLatestTimestamp(bookings, "fullyPaidAt")
    : null

  return {
    depositAmount: paymentSummaries.reduce((sum, item) => sum + Number(item?.depositAmount || 0), 0),
    remainingAmount: paymentSummaries.reduce((sum, item) => sum + Number(item?.remainingAmount || 0), 0),
    paidAmount: paidDepositAmount + remainingPaidAmount,
    depositPaid,
    fullyPaid,
    depositPaidAt,
    fullyPaidAt,
    paymentType: fullyPaid ? "FULL" : depositPaid ? "DEPOSIT" : "",
    paymentStatus: fullyPaid ? "PAID" : depositPaid ? "DEPOSIT_PAID" : "PENDING",
    depositStatus: depositPaid ? "PAID" : "UNPAID",
  }
}

const createGroupedManagedBooking = (booking) => {
  const timeRange = getManagedBookingTimeRange(booking)
  const hourlyPrice = getManagedBookingHourlyPrice(booking)
  const groupedBookings = [booking]
  const groupedPaymentState = getGroupedManagedBookingPaymentState(groupedBookings)

  return {
    ...booking,
    bookingIds: getManagedBookingActionIds(booking),
    totalPrice: getManagedBookingNormalizedTotalPrice(booking, hourlyPrice),
    groupedBookingCount: 1,
    groupedBookings,
    status: getGroupedManagedBookingStatus(groupedBookings),
    depositAmount: groupedPaymentState.depositAmount,
    remainingAmount: groupedPaymentState.remainingAmount,
    paidAmount: groupedPaymentState.paidAmount,
    depositPaid: groupedPaymentState.depositPaid,
    fullyPaid: groupedPaymentState.fullyPaid,
    depositPaidAt: groupedPaymentState.depositPaidAt,
    fullyPaidAt: groupedPaymentState.fullyPaidAt,
    paymentType: groupedPaymentState.paymentType,
    paymentStatus: groupedPaymentState.paymentStatus,
    depositStatus: groupedPaymentState.depositStatus,
    payment: null,
    _groupKey: getManagedBookingGroupKey(booking),
    _groupStartMinutes: timeRange?.startMinutes ?? null,
    _groupEndMinutes: timeRange?.endMinutes ?? null,
    _groupHourlyPrice: hourlyPrice,
  }
}

const canMergeManagedBookings = (currentGroup, nextBooking) => {
  const currentStart = Number(currentGroup?._groupStartMinutes)
  const currentEnd = Number(currentGroup?._groupEndMinutes)
  const nextRange = getManagedBookingTimeRange(nextBooking)

  if (!currentGroup || !nextRange) {
    return false
  }

  if (currentGroup._groupKey !== getManagedBookingGroupKey(nextBooking)) {
    return false
  }

  if (!Number.isFinite(currentStart) || !Number.isFinite(currentEnd)) {
    return false
  }

  return currentEnd === nextRange.startMinutes
}

const mergeGroupedManagedBooking = (currentGroup, nextBooking) => {
  const nextRange = getManagedBookingTimeRange(nextBooking)
  const mergedBookings = [...(Array.isArray(currentGroup?.groupedBookings) ? currentGroup.groupedBookings : []), nextBooking]
  const mergedBookingIds = Array.from(
    new Set([
      ...getManagedBookingActionIds(currentGroup),
      ...getManagedBookingActionIds(nextBooking),
    ])
  )
  const mergedStartMinutes = Number(currentGroup?._groupStartMinutes)
  const mergedEndMinutes = Number(nextRange?.endMinutes ?? currentGroup?._groupEndMinutes)
  const hourlyPrice = Number(currentGroup?._groupHourlyPrice || getManagedBookingHourlyPrice(nextBooking) || 0)
  const mergedCreatedAtCandidates = mergedBookings
    .map((booking) => String(booking?.createdAt || "").trim())
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
  const groupedPaymentState = getGroupedManagedBookingPaymentState(mergedBookings)
  const mergedDurationMinutes =
    Number.isFinite(mergedStartMinutes)
    && Number.isFinite(mergedEndMinutes)
    && mergedEndMinutes > mergedStartMinutes
      ? mergedEndMinutes - mergedStartMinutes
      : 0

  return {
    ...currentGroup,
    bookingIds: mergedBookingIds,
    groupedBookingCount: mergedBookings.length,
    groupedBookings: mergedBookings,
    status: getGroupedManagedBookingStatus(mergedBookings),
    depositAmount: groupedPaymentState.depositAmount,
    remainingAmount: groupedPaymentState.remainingAmount,
    paidAmount: groupedPaymentState.paidAmount,
    depositPaid: groupedPaymentState.depositPaid,
    fullyPaid: groupedPaymentState.fullyPaid,
    depositPaidAt: groupedPaymentState.depositPaidAt,
    fullyPaidAt: groupedPaymentState.fullyPaidAt,
    paymentType: groupedPaymentState.paymentType,
    paymentStatus: groupedPaymentState.paymentStatus,
    depositStatus: groupedPaymentState.depositStatus,
    payment: null,
    totalPrice:
      hourlyPrice > 0 && mergedDurationMinutes > 0
        ? Math.round((hourlyPrice * mergedDurationMinutes) / 60)
        : Number(currentGroup?.totalPrice || 0) + getManagedBookingNormalizedTotalPrice(nextBooking),
    createdAt: mergedCreatedAtCandidates[0] || currentGroup?.createdAt || nextBooking?.createdAt || null,
    _groupEndMinutes: nextRange?.endMinutes ?? currentGroup?._groupEndMinutes,
    _groupHourlyPrice: hourlyPrice,
    timeSlot:
      Number.isFinite(Number(currentGroup?._groupStartMinutes))
      && Number.isFinite(Number(nextRange?.endMinutes))
        ? buildTimeSlotLabel(Number(currentGroup._groupStartMinutes), Number(nextRange.endMinutes))
        : String(currentGroup?.timeSlot || nextBooking?.timeSlot || "").trim(),
  }
}

const groupManagedBookings = (bookings = []) =>
  sortManagedBookings(bookings).reduce((groups, booking) => {
    if (!booking || typeof booking !== "object") {
      return groups
    }

    const lastGroup = groups[groups.length - 1]
    if (lastGroup && canMergeManagedBookings(lastGroup, booking)) {
      groups[groups.length - 1] = mergeGroupedManagedBooking(lastGroup, booking)
      return groups
    }

    groups.push(createGroupedManagedBooking(booking))
    return groups
  }, [])
    .map((booking) => {
      const nextBooking = { ...booking }
      delete nextBooking._groupKey
      delete nextBooking._groupStartMinutes
      delete nextBooking._groupEndMinutes
      delete nextBooking._groupHourlyPrice
      return nextBooking
    })

const sortManagedBookings = (bookings = []) =>
  [...(Array.isArray(bookings) ? bookings : [])].sort((left, right) => {
    const leftDate = normalizeBookingDateValue(left?.date)
    const rightDate = normalizeBookingDateValue(right?.date)

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    const leftGroupKey = String(getManagedBookingGroupKey(left) || "")
    const rightGroupKey = String(getManagedBookingGroupKey(right) || "")
    if (leftGroupKey !== rightGroupKey) {
      return leftGroupKey.localeCompare(rightGroupKey, "vi")
    }

    const slotDiff = getManagedBookingStartMinutes(left) - getManagedBookingStartMinutes(right)
    if (slotDiff !== 0) {
      return slotDiff
    }

    return String(left?.id || left?._id || "").localeCompare(String(right?.id || right?._id || ""), "vi")
  })

const getVisibleManagedBookings = (bookings = [], selectedDate = "", filterStatus = "ALL") => {
  const selectedDateKey = normalizeBookingDateValue(selectedDate)
  const activeBookings = (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      isActiveManagedBooking(booking)
      && normalizeBookingDateValue(booking?.date) === selectedDateKey
  )

  if (filterStatus === "ALL") {
    return groupManagedBookings(activeBookings)
  }

  return groupManagedBookings(
    activeBookings.filter(
      (booking) => String(booking?.status || "").trim().toUpperCase() === filterStatus
    )
  )
}

const getPreferredManagedBookingDate = (bookings = []) =>
  mergeUniqueBookings(bookings)
    .filter((booking) => isActiveManagedBooking(booking))
    .map((booking) => normalizeBookingDateValue(booking?.date))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0] || ""

const buildBookedSlotManagedBooking = (field, subField, date, booking, index = 0) => {
  const baseBooking = booking && typeof booking === "object" ? booking : null
  const timeSlotId = String(baseBooking?.timeSlotId || booking || "").trim()
  const timeSlot = String(
    baseBooking?.timeSlot
    || baseBooking?.timeSlotLabel
    || baseBooking?.timeSlotInfo?.timeSlot
    || baseBooking?.timeSlotInfo?.label
    || ""
  ).trim()

  if (!timeSlotId && !timeSlot) {
    return null
  }

  const fallbackId = `booked-slot:${String(field?.id || "").trim()}:${String(subField?.id || "").trim()}:${String(date || "").trim()}:${timeSlotId || timeSlot || index + 1}`

  return {
    ...baseBooking,
    id: String(baseBooking?.id || baseBooking?._id || "").trim() || fallbackId,
    _id: String(baseBooking?._id || baseBooking?.id || "").trim() || fallbackId,
    fieldId: String(baseBooking?.fieldId || field?.id || "").trim(),
    fieldName: String(baseBooking?.fieldName || field?.name || "").trim(),
    fieldSlug: String(baseBooking?.fieldSlug || field?.slug || "").trim(),
    fieldAddress: String(baseBooking?.fieldAddress || field?.address || "").trim(),
    fieldDistrict: String(baseBooking?.fieldDistrict || field?.district || "").trim(),
    subFieldId: String(baseBooking?.subFieldId || subField?.id || "").trim(),
    subFieldKey: String(baseBooking?.subFieldKey || subField?.key || "").trim(),
    subFieldName: String(baseBooking?.subFieldName || subField?.name || "").trim(),
    subFieldType: String(baseBooking?.subFieldType || subField?.type || field?.type || "").trim(),
    date: normalizeBookingDateValue(baseBooking?.date || date),
    timeSlotId,
    timeSlot,
    phone: String(baseBooking?.phone || baseBooking?.customer?.phone || "").trim(),
    customer:
      baseBooking?.customer
      || (baseBooking?.customerName || baseBooking?.phone
        ? {
            fullName: String(baseBooking?.customerName || "Khach hang").trim(),
            phone: String(baseBooking?.phone || "").trim(),
          }
        : null),
    status: String(baseBooking?.status || "CONFIRMED").trim(),
  }
}

const loadManagedBookingsFromBookedSlots = async (token, selectedDate) => {
  const fieldData = await getAdminFields(token)
  const fields = Array.isArray(fieldData?.fields) ? fieldData.fields : []
  const bookingTasks = fields.flatMap((field) =>
    (Array.isArray(field?.subFields) ? field.subFields : [])
      .filter((subField) => String(subField?.id || "").trim())
      .map((subField) => ({ field, subField }))
  )

  if (bookingTasks.length === 0) {
    return []
  }

  const results = await Promise.allSettled(
    bookingTasks.map(async ({ field, subField }) => {
      const data = await getBookedSlots(subField.id, selectedDate, token)
      const records = Array.isArray(data?.slotRecords) ? data.slotRecords : []

      return records
        .map((booking, index) =>
          buildBookedSlotManagedBooking(field, subField, selectedDate, booking, index)
        )
        .filter(Boolean)
    })
  )

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
}

const buildManagedBookingsCollection = async (authToken, selectedDate) => {
  const [dashboardResult, myBookingsResult] = await Promise.allSettled([
    getAdminDashboard(authToken, {
      date: selectedDate,
      months: 1,
      recentLimit: 100,
    }),
    getMyBookings(authToken),
  ])

  const dashboardData = dashboardResult.status === "fulfilled" ? dashboardResult.value : {}
  const myBookingsData = myBookingsResult.status === "fulfilled" ? myBookingsResult.value : {}
  const dashboardState = getAdminDashboardState(dashboardData)
  const myBookings = Array.isArray(myBookingsData?.bookings) ? myBookingsData.bookings : []
  let mergedBookings = mergeUniqueBookings(
    dashboardState.managedBookings || [],
    dashboardState.recentBookings || [],
    myBookings
  )

  if (mergedBookings.length === 0) {
    mergedBookings = mergeUniqueBookings(await loadManagedBookingsFromBookedSlots(authToken, selectedDate))
  }

  return {
    mergedBookings,
    preferredDate: getPreferredManagedBookingDate(mergedBookings),
    allFailed: dashboardResult.status === "rejected" && myBookingsResult.status === "rejected",
    error: dashboardResult.reason || myBookingsResult.reason || null,
  }
}

const buildVisibleBookingsForDate = async (authToken, selectedDate, filterStatus) => {
  const result = await buildManagedBookingsCollection(authToken, selectedDate)
  let visibleBookings = getVisibleManagedBookings(result.mergedBookings, selectedDate, filterStatus)

  if (visibleBookings.length === 0) {
    const bookedSlotBookings = await loadManagedBookingsFromBookedSlots(authToken, selectedDate)
    visibleBookings = getVisibleManagedBookings(bookedSlotBookings, selectedDate, filterStatus)
  }

  return {
    ...result,
    visibleBookings,
  }
}

export const useAdminBookingsController = ({ authToken, currentUser }) => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDate, setSelectedDate] = useState(
    () => getStoredOwnerManagedBookingDate(currentUser) || getTodayBookingDate()
  )
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [actionLoading, setActionLoading] = useState(null)
  const hydratedOwnerKeyRef = useRef("")
  const skipPersistRef = useRef(false)
  const latestLoadRequestRef = useRef(0)
  const ownerStorageKey = getOwnerManagedBookingDateStorageKey(currentUser)

  useEffect(() => {
    if (!ownerStorageKey || hydratedOwnerKeyRef.current === ownerStorageKey) {
      return
    }

    hydratedOwnerKeyRef.current = ownerStorageKey
    const storedDate = getStoredOwnerManagedBookingDate(currentUser)

    if (storedDate && storedDate !== selectedDate) {
      skipPersistRef.current = true
      setSelectedDate(storedDate)
    }
  }, [currentUser, ownerStorageKey, selectedDate])

  useEffect(() => {
    if (!ownerStorageKey || hydratedOwnerKeyRef.current !== ownerStorageKey) {
      return
    }

    if (skipPersistRef.current) {
      skipPersistRef.current = false
      return
    }

    persistOwnerManagedBookingDate(currentUser, selectedDate)
  }, [currentUser, ownerStorageKey, selectedDate])

  useEffect(() => {
    if (!authToken) {
      setBookings([])
      setLoading(false)
      return undefined
    }

    let active = true
    const requestId = latestLoadRequestRef.current + 1
    latestLoadRequestRef.current = requestId

    const loadBookings = async () => {
      try {
        setLoading(true)
        setError(null)

        const result = await buildVisibleBookingsForDate(authToken, selectedDate, filterStatus)

        if (!active || requestId !== latestLoadRequestRef.current) {
          return
        }

        if (result.visibleBookings.length === 0 && result.preferredDate && result.preferredDate !== selectedDate) {
          setSelectedDate(result.preferredDate)
          return
        }

        setBookings(result.visibleBookings)

        if (result.allFailed) {
          throw result.error || new Error("Không thể tải danh sách đặt sân.")
        }
      } catch (apiError) {
        if (!active || requestId !== latestLoadRequestRef.current) {
          return
        }

        setError(apiError?.message || "Không thể tải danh sách đặt sân.")
      } finally {
        if (active && requestId === latestLoadRequestRef.current) {
          setLoading(false)
        }
      }
    }

    loadBookings()

    return () => {
      active = false
    }
  }, [authToken, filterStatus, selectedDate])

  const reloadVisibleBookings = async () => {
    const result = await buildVisibleBookingsForDate(authToken, selectedDate, filterStatus)
    setBookings(result.visibleBookings)
  }

  const handleConfirmBooking = async (booking) => {
    const bookingIds = getManagedBookingActionIds(booking)
    const actionKey = String(booking?.id || bookingIds[0] || "").trim()
    const groupedBookings = getManagedBookingItems(booking)
    const primaryBookingId = String(
      booking?.id || bookingIds[0] || groupedBookings[0]?.id || groupedBookings[0]?._id || ""
    ).trim()

    if (bookingIds.length === 0) {
      setError("Không tìm thấy mã đặt sân hợp lệ để xác nhận.")
      return
    }

    try {
      setError(null)
      setActionLoading(actionKey)
      const bookingConfirmationTasks = groupedBookings.flatMap((item) => {
        const itemBookingId = String(item?.id || item?._id || "").trim()
        if (!itemBookingId) {
          return []
        }

        const itemStatus = String(item?.status || "").trim().toUpperCase()
      return itemStatus !== "CONFIRMED" && itemStatus !== "COMPLETED"
          ? [() => confirmAdminBooking(authToken, itemBookingId)]
          : []
      })
      const groupedPaymentState = getGroupedManagedBookingPaymentState(groupedBookings)
      const paymentTasks = []

      if (primaryBookingId && !groupedPaymentState.fullyPaid) {
        if (!groupedPaymentState.depositPaid) {
          paymentTasks.push(() => confirmAdminBookingDeposit(authToken, primaryBookingId, bookingIds))
        } else if (Number(groupedPaymentState.remainingAmount || 0) > 0) {
          paymentTasks.push(() =>
            confirmAdminBookingPayment(
              authToken,
              primaryBookingId,
              Number(groupedPaymentState.remainingAmount || 0),
              bookingIds
            )
          )
        }
      }

      const actionTasks = [...bookingConfirmationTasks, ...paymentTasks]
      const results = await Promise.allSettled(
        actionTasks.length > 0
          ? actionTasks.map((task) => task())
          : [Promise.resolve(null)]
      )
      await reloadVisibleBookings()
      const rejectedResult = results.find((result) => result.status === "rejected")
      if (rejectedResult?.status === "rejected") {
        throw rejectedResult.reason
      }
    } catch (apiError) {
      setError(apiError?.message || "Không thể xác nhận đặt sân.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelBooking = async (booking) => {
    const bookingIds = getManagedBookingActionIds(booking)
    const actionKey = String(booking?.id || bookingIds[0] || "").trim()

    if (bookingIds.length === 0) {
      setError("Không tìm thấy mã đặt sân hợp lệ để hủy.")
      return
    }

    try {
      setError(null)
      setActionLoading(actionKey)
      const results = await Promise.allSettled(
        bookingIds.map((bookingId) => cancelAdminBooking(authToken, bookingId))
      )
      await reloadVisibleBookings()
      const rejectedResult = results.find((result) => result.status === "rejected")
      if (rejectedResult?.status === "rejected") {
        throw rejectedResult.reason
      }
    } catch (apiError) {
      setError(apiError?.message || "Không thể hủy đặt sân.")
    } finally {
      setActionLoading(null)
    }
  }

  return {
    bookings,
    loading,
    error,
    selectedDate,
    filterStatus,
    setSelectedDate,
    setFilterStatus,
    handleConfirmBooking,
    handleCancelBooking,
    actionLoading,
  }
}
