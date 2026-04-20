import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  cancelMyBooking,
  createBooking,
  getFieldById,
  getBookedSlots,
  getFields,
  getMyBookings,
  getSubFieldsByField,
  getTimeSlots,
} from "../../models/api"
import { isOwnerUser } from "../../models/authModel"
import {
  createLocalBookingRecord,
  getStoredKnownBookings,
  mergeKnownBookingCollections,
  persistKnownBookings,
} from "../../models/bookingCacheModel"
import {
  applyBookingSlotSelection,
  buildTimeSlotLabel,
  buildBookingPayload,
  buildBookingScheduleRows,
  calculateBookingDepositAmount,
  calculateBookingTotalPrice,
  createBookingForm,
  createFallbackBookingTimeline,
  createBookingTimeline,
  createFeedbackState,
  formatBookingDateTime,
  getSelectedTimeSlotIds,
  getTodayBookingDate,
  isMongoObjectId,
  isSelectedTimeSlotStillAvailable,
  normalizeBookingDateValue,
  normalizeSubFieldKey,
  parseTimeSlot,
} from "../../models/bookingModel"
import {
  formatBookingStatusVi,
  getBookingPaymentSummaryVi,
  validateBookingFormVi,
} from "../../models/bookingTextModel"
import { getFieldList, isFieldApprovedForPublic } from "../../models/fieldModel"
import { createDepositPaymentRoute, ROUTES } from "../../models/routeModel"

const getPortalOwnerKeys = (currentUser) =>
  [
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.email,
    currentUser?.name,
    currentUser?.fullName,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

const filterFieldsForOwnerPortal = (fields, currentUser, isOwnerPortal) => {
  const nextFields = Array.isArray(fields) ? fields : []

  if (!isOwnerPortal) {
    return nextFields
  }

  const ownerKeys = getPortalOwnerKeys(currentUser)
  if (ownerKeys.length === 0) {
    return []
  }

  const ownedFields = nextFields.filter((field) => {
    const fieldKeys = [
      field?.ownerUserId,
      field?.userId,
      field?.ownerEmail,
      field?.ownerFullName,
      field?.ownerName,
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)

    return fieldKeys.some((value) => ownerKeys.includes(value))
  })

  if (ownedFields.length > 0) {
    return ownedFields
  }

  const hasAnyOwnerMetadata = nextFields.some((field) =>
    [
      field?.ownerUserId,
      field?.userId,
      field?.ownerEmail,
      field?.ownerFullName,
      field?.ownerName,
    ].some((value) => String(value || "").trim())
  )

  return hasAnyOwnerMetadata ? ownedFields : nextFields
}

const isFieldApprovedForBooking = (field) => isFieldApprovedForPublic(field)

const getBookingIdentity = (booking, index = 0) => {
  const bookingId = String(booking?.id || booking?._id || "").trim()
  if (bookingId) {
    return `id:${bookingId}`
  }

  const compositeParts = [
    booking?.fieldId,
    booking?.subFieldId,
    normalizeBookingDateValue(booking?.date),
    booking?.timeSlotId,
    booking?.timeSlot,
    booking?.phone,
    booking?.createdAt,
    index,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  return compositeParts.length > 0 ? `slot:${compositeParts.join("|")}` : ""
}

const mergeBookingCollections = (...collections) => {
  const bookingMap = new Map()

  collections.flat().forEach((collection) => {
    ;(Array.isArray(collection) ? collection : []).forEach((booking, index) => {
      if (!booking || typeof booking !== "object") {
        return
      }

      const identity = getBookingIdentity(booking, index)
      if (!identity) {
        return
      }

      const currentValue = bookingMap.get(identity) || {}
      bookingMap.set(identity, {
        ...currentValue,
        ...booking,
      })
    })
  })

  return Array.from(bookingMap.values())
}

const getUserBookingActionIds = (bookingOrId) => {
  if (!bookingOrId || typeof bookingOrId !== "object") {
    const fallbackId = String(bookingOrId || "").trim()
    return fallbackId && isMongoObjectId(fallbackId) ? [fallbackId] : []
  }

  const candidateIds = Array.isArray(bookingOrId?.bookingIds)
    ? bookingOrId.bookingIds
    : [bookingOrId?.id, bookingOrId?._id]

  return Array.from(
    new Set(
      candidateIds
        .map((id) => String(id || "").trim())
        .filter((id) => isMongoObjectId(id))
    )
  )
}

const getUserBookingTimeRange = (booking) => {
  const parsed = parseTimeSlot(String(booking?.timeSlot || "").trim(), { allowOvernight: true })
  if (parsed) {
    return parsed
  }

  const startMinutes = Number(booking?.timeSlotInfo?.startMinutes)
  const endMinutes = Number(booking?.timeSlotInfo?.endMinutes)

  if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes)) {
    if (endMinutes > startMinutes) {
      return { startMinutes, endMinutes }
    }

    if (endMinutes < startMinutes) {
      return { startMinutes, endMinutes: endMinutes + 24 * 60 }
    }
  }

  return null
}

const getUserBookingStartMinutes = (booking) => {
  const timeRange = getUserBookingTimeRange(booking)
  return Number.isFinite(Number(timeRange?.startMinutes))
    ? Number(timeRange.startMinutes)
    : Number.MAX_SAFE_INTEGER
}

const normalizeUserBookingStatusKey = (value) => {
  const normalizedValue = String(value || "").trim().toUpperCase()

  switch (normalizedValue) {
    case "CANCELED":
      return "CANCELLED"
    case "APPROVED":
      return "CONFIRMED"
    default:
      return normalizedValue
  }
}

const normalizeUserPaymentStatusKey = (paymentStatus, depositStatus = "") => {
  const normalizedValue = String(paymentStatus || depositStatus || "").trim().toUpperCase()

  switch (normalizedValue) {
    case "":
    case "UNPAID":
    case "NONE":
      return "UNPAID"
    case "SUCCESS":
    case "SUCCEEDED":
    case "COMPLETED":
    case "COMPLETE":
    case "DEPOSIT_PAID":
      return "PAID"
    case "WAITING":
    case "PROCESSING":
    case "DEPOSIT_PENDING":
      return "PENDING"
    case "CANCELED":
      return "CANCELLED"
    default:
      return normalizedValue
  }
}

const getUserBookingFieldGroupKey = (booking) => {
  const fieldName = String(booking?.fieldName || booking?.field?.name || "").trim().toLowerCase()
  if (fieldName) {
    return `name:${fieldName}`
  }

  const fieldId = String(booking?.fieldId || booking?.field?.id || booking?.field?._id || "").trim().toLowerCase()
  return fieldId ? `id:${fieldId}` : ""
}

const getUserBookingSubFieldGroupKey = (booking) => {
  const subFieldName = String(booking?.subFieldName || booking?.subField?.name || "").trim().toLowerCase()
  if (subFieldName) {
    return `name:${subFieldName}`
  }

  const subFieldKey = String(booking?.subFieldKey || booking?.subField?.key || "").trim().toLowerCase()
  if (subFieldKey) {
    return `key:${subFieldKey}`
  }

  const subFieldId = String(booking?.subFieldId || booking?.subField?.id || booking?.subField?._id || "").trim().toLowerCase()
  return subFieldId ? `id:${subFieldId}` : ""
}

const getUserBookingRichnessScore = (booking) => {
  const bookingId = String(booking?.id || booking?._id || "").trim()
  const statusKey = normalizeUserBookingStatusKey(booking?.status)
  const paymentKey = normalizeUserPaymentStatusKey(booking?.paymentStatus, booking?.depositStatus)

  let score = 0

  if (isMongoObjectId(bookingId)) {
    score += 5
  }

  if (booking?.timeSlotInfo) {
    score += 2
  }

  if (String(booking?.phone || booking?.customer?.phone || "").trim()) {
    score += 2
  }

  if (statusKey === "CONFIRMED" || statusKey === "COMPLETED") {
    score += 2
  }

  if (paymentKey === "PAID" || paymentKey === "PENDING") {
    score += 1
  }

  if (Number(booking?.totalPrice || 0) > 0) {
    score += 1
  }

  return score
}

const mergePreferredUserBooking = (currentBooking, nextBooking) => {
  const currentScore = getUserBookingRichnessScore(currentBooking)
  const nextScore = getUserBookingRichnessScore(nextBooking)

  return nextScore >= currentScore
    ? { ...currentBooking, ...nextBooking }
    : { ...nextBooking, ...currentBooking }
}

const getUserBookingSlotIdentity = (booking) => {
  const timeRange = getUserBookingTimeRange(booking)

  return [
    normalizeBookingDateValue(booking?.date),
    getUserBookingFieldGroupKey(booking),
    getUserBookingSubFieldGroupKey(booking),
    Number.isFinite(Number(timeRange?.startMinutes)) ? Number(timeRange.startMinutes) : "",
    Number.isFinite(Number(timeRange?.endMinutes)) ? Number(timeRange.endMinutes) : "",
  ]
    .filter((value) => value !== "")
    .join("|")
}

const dedupeUserBookingsForGrouping = (bookings = []) => {
  const bookingMap = new Map()

  ;(Array.isArray(bookings) ? bookings : []).forEach((booking, index) => {
    if (!booking || typeof booking !== "object") {
      return
    }

    const slotIdentity = getUserBookingSlotIdentity(booking)
      || `${String(booking?.id || booking?._id || "").trim()}:${index}`

    const currentValue = bookingMap.get(slotIdentity) || null
    bookingMap.set(
      slotIdentity,
      currentValue ? mergePreferredUserBooking(currentValue, booking) : booking
    )
  })

  return Array.from(bookingMap.values())
}

const getUserBookingGroupKey = (booking) =>
  [
    normalizeBookingDateValue(booking?.date),
    getUserBookingFieldGroupKey(booking),
    getUserBookingSubFieldGroupKey(booking),
    normalizeUserBookingStatusKey(booking?.status),
    normalizeUserPaymentStatusKey(booking?.paymentStatus, booking?.depositStatus),
  ]
    .filter(Boolean)
    .join("|")

const sortUserBookingsForGrouping = (bookings = []) =>
  [...(Array.isArray(bookings) ? bookings : [])].sort((left, right) => {
    const leftDate = normalizeBookingDateValue(left?.date)
    const rightDate = normalizeBookingDateValue(right?.date)

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    const fieldDiff = String(left?.fieldName || "").localeCompare(String(right?.fieldName || ""), "vi")
    if (fieldDiff !== 0) {
      return fieldDiff
    }

    const subFieldDiff = String(left?.subFieldName || "").localeCompare(String(right?.subFieldName || ""), "vi")
    if (subFieldDiff !== 0) {
      return subFieldDiff
    }

    return getUserBookingStartMinutes(left) - getUserBookingStartMinutes(right)
  })

const createGroupedUserBooking = (booking) => {
  const timeRange = getUserBookingTimeRange(booking)
  const paymentSummary = getBookingPaymentSummaryVi(booking)

  return {
    ...booking,
    bookingIds: getUserBookingActionIds(booking),
    groupedBookingCount: 1,
    groupedBookings: [booking],
    depositAmount: Number(paymentSummary.depositAmount || 0),
    remainingAmount: Number(paymentSummary.remainingAmount || 0),
    depositPaid: paymentSummary.hasConfirmedDeposit,
    fullyPaid: paymentSummary.isFullyPaid,
    _groupKey: getUserBookingGroupKey(booking),
    _groupStartMinutes: timeRange?.startMinutes ?? null,
    _groupEndMinutes: timeRange?.endMinutes ?? null,
  }
}

const canMergeUserBookings = (currentGroup, nextBooking) => {
  const nextRange = getUserBookingTimeRange(nextBooking)

  if (!currentGroup || !nextRange) {
    return false
  }

  if (String(currentGroup?._groupKey || "") !== getUserBookingGroupKey(nextBooking)) {
    return false
  }

  return Number(currentGroup?._groupEndMinutes) === Number(nextRange.startMinutes)
}

const mergeGroupedUserBooking = (currentGroup, nextBooking) => {
  const nextRange = getUserBookingTimeRange(nextBooking)
  const mergedBookings = [...(Array.isArray(currentGroup?.groupedBookings) ? currentGroup.groupedBookings : []), nextBooking]
  const mergedIds = Array.from(
    new Set([
      ...getUserBookingActionIds(currentGroup),
      ...getUserBookingActionIds(nextBooking),
    ])
  )
  const mergedStartMinutes = Number(currentGroup?._groupStartMinutes)
  const mergedEndMinutes = Number(nextRange?.endMinutes ?? currentGroup?._groupEndMinutes)
  const mergedCreatedAtCandidates = mergedBookings
    .map((booking) => String(booking?.createdAt || "").trim())
    .filter(Boolean)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())
  const mergedPaymentSummaries = mergedBookings.map((booking) => getBookingPaymentSummaryVi(booking))

  return {
    ...currentGroup,
    bookingIds: mergedIds,
    groupedBookingCount: mergedBookings.length,
    groupedBookings: mergedBookings,
    depositAmount: mergedPaymentSummaries.reduce((sum, item) => sum + Number(item?.depositAmount || 0), 0),
    depositPaid: mergedPaymentSummaries.some((item) => item?.hasConfirmedDeposit),
    fullyPaid: mergedPaymentSummaries.every((item) => item?.isFullyPaid),
    totalPrice: mergedBookings.reduce((sum, booking) => sum + Number(booking?.totalPrice || 0), 0),
    remainingAmount: mergedPaymentSummaries.reduce((sum, item) => sum + Number(item?.remainingAmount || 0), 0),
    createdAt: mergedCreatedAtCandidates[0] || currentGroup?.createdAt || nextBooking?.createdAt || null,
    _groupEndMinutes: nextRange?.endMinutes ?? currentGroup?._groupEndMinutes,
    timeSlot:
      Number.isFinite(mergedStartMinutes) && Number.isFinite(mergedEndMinutes) && mergedEndMinutes > mergedStartMinutes
        ? buildTimeSlotLabel(mergedStartMinutes, mergedEndMinutes)
        : String(currentGroup?.timeSlot || nextBooking?.timeSlot || "").trim(),
  }
}

const groupUserBookings = (bookings = []) =>
  sortUserBookingsForGrouping(dedupeUserBookingsForGrouping(bookings))
    .reduce((groups, booking) => {
      if (!booking || typeof booking !== "object") {
        return groups
      }

      const lastGroup = groups[groups.length - 1]
      if (lastGroup && canMergeUserBookings(lastGroup, booking)) {
        groups[groups.length - 1] = mergeGroupedUserBooking(lastGroup, booking)
        return groups
      }

      groups.push(createGroupedUserBooking(booking))
      return groups
    }, [])
    .sort((left, right) => {
      const leftCreatedAt = new Date(String(left?.createdAt || "")).getTime()
      const rightCreatedAt = new Date(String(right?.createdAt || "")).getTime()

      if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt) && leftCreatedAt !== rightCreatedAt) {
        return rightCreatedAt - leftCreatedAt
      }

      const leftDate = normalizeBookingDateValue(left?.date)
      const rightDate = normalizeBookingDateValue(right?.date)

      if (leftDate !== rightDate) {
        return rightDate.localeCompare(leftDate)
      }

      return Number(right?._groupStartMinutes || 0) - Number(left?._groupStartMinutes || 0)
    })
    .map((booking) => {
      const nextBooking = { ...booking }
      delete nextBooking._groupKey
      delete nextBooking._groupStartMinutes
      delete nextBooking._groupEndMinutes
      return nextBooking
    })

const isPaidUserBooking = (booking) => {
  const paymentSummary = getBookingPaymentSummaryVi(booking)
  return Boolean(paymentSummary?.hasConfirmedDeposit || paymentSummary?.isFullyPaid)
}

const getUserBookingHoldExpiryTimestamp = (booking) => {
  const rawValue = String(booking?.holdExpiresAt || booking?.expiredAt || "").trim()
  if (!rawValue) {
    return 0
  }

  const parsedDate = new Date(rawValue)
  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime()
}

const isPendingUnpaidUserBooking = (booking) =>
  normalizeUserBookingStatusKey(booking?.status) === "PENDING" && !isPaidUserBooking(booking)

const canCancelUserBooking = (booking) => {
  const groupedBookings = Array.isArray(booking?.groupedBookings) && booking.groupedBookings.length > 0
    ? booking.groupedBookings
    : [booking]

  return groupedBookings.every((item) => !isPaidUserBooking(item))
}

const createBookedSlotRecords = ({ field, subField, date, timeSlots = [] }) =>
  (Array.isArray(timeSlots) ? timeSlots : [])
    .map((item) => {
      if (typeof item === "string") {
        return {
          timeSlotId: String(item || "").trim(),
        }
      }

      return item && typeof item === "object" ? item : null
    })
    .filter(Boolean)
    .map((item, index) => {
      const baseRecord = item && typeof item === "object" ? item : null
      const timeSlotId = String(item?.timeSlotId || "").trim()
      const timeSlot = String(item?.timeSlot || item?.timeSlotLabel || "").trim()
      const slotIdentity = timeSlotId || timeSlot || `slot-${index + 1}`
      const fallbackId =
        `lock:${String(field?.id || "").trim()}:${String(subField?.id || "").trim()}:${String(date || "").trim()}:${slotIdentity}`

      return {
        ...baseRecord,
        id: String(baseRecord?.id || baseRecord?._id || "").trim() || fallbackId,
        _id: String(baseRecord?._id || baseRecord?.id || "").trim() || fallbackId,
        fieldId: String(baseRecord?.fieldId || field?.id || "").trim(),
        fieldName: String(baseRecord?.fieldName || field?.name || "").trim(),
        fieldSlug: String(baseRecord?.fieldSlug || field?.slug || "").trim(),
        fieldAddress: String(baseRecord?.fieldAddress || field?.address || "").trim(),
        fieldDistrict: String(baseRecord?.fieldDistrict || field?.district || "").trim(),
        subFieldId: String(baseRecord?.subFieldId || subField?.id || "").trim(),
        subFieldKey: String(baseRecord?.subFieldKey || subField?.key || "").trim(),
        subFieldName: String(baseRecord?.subFieldName || subField?.name || "").trim(),
        subFieldType: String(baseRecord?.subFieldType || subField?.type || field?.type || "").trim(),
        date: normalizeBookingDateValue(baseRecord?.date || date),
        timeSlotId,
        timeSlot,
        timeSlotInfo: baseRecord?.timeSlotInfo || null,
        holdExpiresAt: String(baseRecord?.holdExpiresAt || baseRecord?.expiredAt || "").trim(),
        status: String(baseRecord?.status || "PENDING").trim(),
        phone: String(baseRecord?.phone || baseRecord?.customer?.phone || "").trim(),
        customer: baseRecord?.customer || null,
      }
    })

const getBookingRouteFeedback = (locationState) => {
  const text = String(locationState?.bookingMessage || "").trim()
  if (!text) {
    return createFeedbackState()
  }

  return {
    type: String(locationState?.bookingMessageType || "success").trim() || "success",
    text,
  }
}

export const useBookingController = ({ authToken, currentUser }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { fieldSlug = "" } = useParams()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const preselectedField = searchParams.get("fieldId") || ""
  const minBookingDate = getTodayBookingDate()
  const isOwnerPortal = isOwnerUser(currentUser)

  const [fields, setFields] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [availabilityBookings, setAvailabilityBookings] = useState([])
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0)
  const [bookingsRefreshKey, setBookingsRefreshKey] = useState(0)
  const [catalogMessage, setCatalogMessage] = useState("")
  const [form, setForm] = useState(() => createBookingForm(preselectedField, minBookingDate))
  const [submitting, setSubmitting] = useState(false)
  const [cancellingBookingId, setCancellingBookingId] = useState("")
  const [feedback, setFeedback] = useState(() => getBookingRouteFeedback(location.state))
  const [bookingStep, setBookingStep] = useState("schedule")

  const rawTimeline = useMemo(() => createBookingTimeline(timeSlots), [timeSlots])
  const matchedFieldBySlug = useMemo(
    () => fields.find((field) => String(field.slug || "") === String(fieldSlug || "")) || null,
    [fieldSlug, fields]
  )

  useEffect(() => {
    setForm((prev) => {
      const nextFieldId = fieldSlug
        ? String(matchedFieldBySlug?.id || preselectedField || prev.fieldId || "")
        : preselectedField || ""

      if (String(prev.fieldId) === String(nextFieldId)) {
        return prev
      }

      return createBookingForm(nextFieldId, prev.date || minBookingDate)
    })
  }, [fieldSlug, matchedFieldBySlug, preselectedField, minBookingDate])

  useEffect(() => {
    const nextFeedback = getBookingRouteFeedback(location.state)
    if (!nextFeedback.text) {
      return
    }

    setFeedback(nextFeedback)
  }, [location.state])

  useEffect(() => {
    let mounted = true

    const loadCatalog = async () => {
      setLoadingFields(true)

      try {
        const [fieldsResult, timeSlotsResult] = await Promise.allSettled([
          getFields(authToken),
          getTimeSlots(),
        ])

        if (!mounted) {
          return
        }

        const fieldsData = fieldsResult.status === "fulfilled" ? fieldsResult.value : { fields: [] }
        const timeSlotsData = timeSlotsResult.status === "fulfilled" ? timeSlotsResult.value : { timeSlots: [] }
        const allFields = getFieldList(fieldsData)
        const ownedFields = filterFieldsForOwnerPortal(allFields, currentUser, isOwnerPortal)
        const nextFields = isOwnerPortal
          ? ownedFields.filter((field) => isFieldApprovedForBooking(field))
          : allFields.filter((field) => isFieldApprovedForBooking(field))

        setFields(nextFields)
        setTimeSlots(timeSlotsData.timeSlots || [])
        setCatalogMessage(
          nextFields.length === 0 && isOwnerPortal
            ? "ChÃ†Â°a cÃƒÂ³ sÃƒÂ¢n nÃƒÂ o gÃ¡ÂºÂ¯n vÃ¡Â»â€ºi tÃƒÂ i khoÃ¡ÂºÂ£n chÃ¡Â»Â§ sÃƒÂ¢n nÃƒÂ y."
            : String(fieldsData?.message || "").trim()
        )
        if (isOwnerPortal) {
          setCatalogMessage(
            ownedFields.length === 0
              ? "ChÃ†Â°a cÃƒÂ³ sÃƒÂ¢n nÃƒÂ o gÃ¡ÂºÂ¯n vÃ¡Â»â€ºi tÃƒÂ i khoÃ¡ÂºÂ£n chÃ¡Â»Â§ sÃƒÂ¢n nÃƒÂ y."
              : nextFields.length === 0
                ? "CÃƒÂ¡c sÃƒÂ¢n cÃ¡Â»Â§a bÃ¡ÂºÂ¡n Ã„â€˜ang chÃ¡Â»Â admin duyÃ¡Â»â€¡t hoÃ¡ÂºÂ·c Ã„â€˜ang bÃ¡Â»â€¹ khÃƒÂ³a nÃƒÂªn chÃ†Â°a thÃ¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ·t."
                : ""
          )
        }
        if (timeSlotsResult.status === "rejected") {
          setCatalogMessage((currentMessage) =>
            [currentMessage, "ChÃ†Â°a tÃ¡ÂºÂ£i Ã„â€˜Ã†Â°Ã¡Â»Â£c khung giÃ¡Â»Â backend. HÃ¡Â»â€¡ thÃ¡Â»â€˜ng sÃ¡ÂºÂ½ dÃƒÂ¹ng khung giÃ¡Â»Â tÃ¡ÂºÂ¡m Ã„â€˜Ã¡Â»Æ’ xem lÃ¡Â»â€¹ch trong lÃƒÂºc chÃ¡Â»Â backend Ã„â€˜Ã¡Â»â€œng bÃ¡Â»â„¢ tÃ¡Â»Â« giÃ¡Â»Â mÃ¡Â»Å¸ cÃ¡Â»Â­a."]
              .filter(Boolean)
              .join(" ")
          )
        }
        if (fieldsResult.status === "rejected" && nextFields.length === 0) {
          setFeedback({
            type: "error",
            text: fieldsResult.reason?.message || "KhÃƒÂ´ng thÃ¡Â»Æ’ tÃ¡ÂºÂ£i danh sÃƒÂ¡ch sÃƒÂ¢n.",
          })
        } else if (timeSlotsResult.status === "rejected" && fieldsResult.status !== "rejected") {
          setFeedback((currentFeedback) =>
            currentFeedback?.text
              ? currentFeedback
              : {
                  type: "warning",
                  text: "Khung giÃ¡Â»Â backend Ã„â€˜ang tÃ¡ÂºÂ£i chÃ¡ÂºÂ­m. BÃ¡ÂºÂ¡n vÃ¡ÂºÂ«n cÃƒÂ³ thÃ¡Â»Æ’ xem lÃ¡Â»â€¹ch, nhÃ†Â°ng cÃ¡ÂºÂ§n Ã„â€˜Ã¡Â»Â£i backend Ã„â€˜Ã¡Â»â€œng bÃ¡Â»â„¢ slot thÃ¡ÂºÂ­t tÃ¡Â»Â« giÃ¡Â»Â mÃ¡Â»Å¸ cÃ¡Â»Â­a trÃ†Â°Ã¡Â»â€ºc khi gÃ¡Â»Â­i Ã„â€˜Ã†Â¡n.",
                }
          )
        }
      } catch (apiError) {
        if (mounted) {
          setFeedback({ type: "error", text: apiError.message })
          setCatalogMessage("")
        }
      } finally {
        if (mounted) {
          setLoadingFields(false)
        }
      }
    }

    loadCatalog()

    return () => {
      mounted = false
    }
  }, [authToken, bookingsRefreshKey, currentUser, isOwnerPortal, location.key])

  useEffect(() => {
    if (isOwnerPortal || !authToken || bookings.length === 0) {
      return undefined
    }

    const nowTimestamp = Date.now()
    const nextExpiryTimestamp = bookings
      .filter((booking) => isPendingUnpaidUserBooking(booking))
      .map((booking) => getUserBookingHoldExpiryTimestamp(booking))
      .filter((timestamp) => timestamp > nowTimestamp)
      .sort((left, right) => left - right)[0]

    if (!Number.isFinite(nextExpiryTimestamp)) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback((currentFeedback) =>
        currentFeedback?.text
          ? currentFeedback
          : {
              type: "warning",
              text: "Tráº¡ng thÃ¡i giá»¯ chá»— vá»«a Ä‘Æ°á»£c cáº­p nháº­t. Vui lÃ²ng kiá»ƒm tra láº¡i danh sÃ¡ch Ä‘áº·t sÃ¢n.",
            }
      )
      setBookingsRefreshKey((value) => value + 1)
    }, Math.max(nextExpiryTimestamp - nowTimestamp, 0) + 100)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [authToken, bookings, isOwnerPortal])

  useEffect(() => {
    const storedKnownBookings = getStoredKnownBookings()
    const activeSelectedField =
      fields.find((field) => String(field?.id || "") === String(form.fieldId || "")) || null
    const selectedFieldId = String(activeSelectedField?.id || form.fieldId || "").trim()

    if (!selectedFieldId || !form.date || !activeSelectedField) {
      setAvailabilityBookings(storedKnownBookings)
      setLoadingAvailability(false)
      return
    }

    let mounted = true

    const loadAvailability = async () => {
      setLoadingAvailability(true)

      try {
        const selectedSubFields = Array.isArray(activeSelectedField?.subFields)
          ? activeSelectedField.subFields
          : []
        const bookedSlotResults = await Promise.allSettled(
          selectedSubFields
            .filter((subField) => String(subField?.id || "").trim())
            .map(async (subField) => ({
              subField,
              data: await getBookedSlots(subField.id, form.date, authToken),
            }))
        )

        const nextAvailabilityBookings = bookedSlotResults
          .filter((result) => result.status === "fulfilled")
          .flatMap(({ value }) =>
            createBookedSlotRecords({
              field: activeSelectedField,
              subField: value.subField,
              date: form.date,
              timeSlots:
                Array.isArray(value.data?.slotRecords) && value.data.slotRecords.length > 0
                  ? value.data.slotRecords
                  : value.data?.timeSlotIds || [],
            })
          )

        if (!mounted) {
          return
        }

        setAvailabilityBookings(
          nextAvailabilityBookings.length > 0 ? nextAvailabilityBookings : storedKnownBookings
        )
      } catch (_apiError) {
        if (mounted) {
          setAvailabilityBookings(storedKnownBookings)
        }
      } finally {
        if (mounted) {
          setLoadingAvailability(false)
        }
      }
    }

    loadAvailability()

    return () => {
      mounted = false
    }
  }, [authToken, availabilityRefreshKey, fields, form.date, form.fieldId])

  useEffect(() => {
    const storedKnownBookings = getStoredKnownBookings()

    let mounted = true

    const loadBookings = async () => {
      setLoadingBookings(true)

      try {
        if (authToken) {
          const data = await getMyBookings(authToken)
          const remoteBookings = Array.isArray(data?.bookings) ? data.bookings : []
          if (mounted) {
            setBookings(remoteBookings)
          }
        } else {
          setBookings(isOwnerPortal ? [] : storedKnownBookings)
        }
      } catch (apiError) {
        if (mounted) {
          if (!isOwnerPortal && storedKnownBookings.length > 0) {
            setBookings(storedKnownBookings)
          }
          setFeedback({ type: "error", text: apiError.message })
        }
      } finally {
        if (mounted) {
          setLoadingBookings(false)
        }
      }
    }

    loadBookings()

    return () => {
      mounted = false
    }
  }, [authToken, currentUser, isOwnerPortal])

  const selectedField = useMemo(
    () =>
      fields.find((field) => String(field.id) === String(form.fieldId))
      || matchedFieldBySlug
      || null,
    [fields, form.fieldId, matchedFieldBySlug]
  )

  useEffect(() => {
    if (!preselectedField || loadingFields || selectedField) {
      return undefined
    }

    let mounted = true

    getFieldById(preselectedField, authToken)
      .then((data) => {
        if (!mounted || !data?.field || !isFieldApprovedForBooking(data.field)) {
          return
        }

        setFields((currentFields) => {
          const alreadyExists = currentFields.some(
            (field) => String(field?.id || "") === String(data.field?.id || "")
          )

          if (alreadyExists) {
            return currentFields
          }

          return [...currentFields, data.field]
        })
        setCatalogMessage("")
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [authToken, loadingFields, preselectedField, selectedField])

  const selectedSubField = useMemo(() => {
    if (!selectedField || !Array.isArray(selectedField.subFields)) {
      return null
    }

    const selectedId = String(form.subFieldId || "").trim()
    const selectedKey = normalizeSubFieldKey(form.subFieldKey)

    return (
      selectedField.subFields.find(
        (subField) =>
          String(subField?.id || "") === selectedId
          || normalizeSubFieldKey(subField?.key) === selectedKey
      ) || null
    )
  }, [selectedField, form.subFieldId, form.subFieldKey])

  const timeline = useMemo(() => {
    if (rawTimeline.length > 0) {
      return rawTimeline
    }

    return createFallbackBookingTimeline(selectedField?.openHours)
  }, [rawTimeline, selectedField?.openHours])

  const selectedTimeSlot = useMemo(
    () => timeline.find((slot) => String(slot?.id || "") === String(form.timeSlotId || "")) || null,
    [timeline, form.timeSlotId]
  )
  const selectedTimeSlotIds = useMemo(() => getSelectedTimeSlotIds(form), [form])

  const scheduleRows = useMemo(
    () =>
      buildBookingScheduleRows({
        bookings: availabilityBookings,
        field: selectedField,
        selectedDate: form.date,
        selectedSubFieldKey: form.subFieldKey,
        selectedTimeSlotId: form.timeSlotId,
        selectedTimeSlotIds,
        timeline,
      }),
    [availabilityBookings, selectedField, form.date, form.subFieldKey, form.timeSlotId, selectedTimeSlotIds, timeline]
  )

  useEffect(() => {
    if (!form.subFieldKey || !form.timeSlotId) {
      return
    }

    const selectedKey = normalizeSubFieldKey(form.subFieldKey)
    const selectedRow = scheduleRows.find(
      (row) => normalizeSubFieldKey(row.subField?.key) === selectedKey
    )

    if (!selectedRow || !isSelectedTimeSlotStillAvailable(selectedRow.slots, selectedTimeSlotIds)) {
      setForm((prev) => ({
        ...prev,
        subFieldId: "",
        subFieldKey: "",
        timeSlotId: "",
        timeSlotIds: [],
        timeSlot: "",
      }))
    }
  }, [form.subFieldKey, form.timeSlotId, scheduleRows, selectedTimeSlotIds])

  const hasSelectedSlot = Boolean(selectedField && selectedSubField && form.timeSlot && selectedTimeSlotIds.length > 0)
  const visibleBookings = useMemo(
    () => (isOwnerPortal ? bookings : groupUserBookings(bookings)),
    [bookings, isOwnerPortal]
  )

  useEffect(() => {
    if (!hasSelectedSlot && bookingStep === "confirm") {
      setBookingStep("schedule")
    }
  }, [bookingStep, hasSelectedSlot])

  useEffect(() => {
    if (!selectedField?.id || !isMongoObjectId(selectedField.id)) {
      return undefined
    }

    const subFields = Array.isArray(selectedField.subFields) ? selectedField.subFields : []
    if (subFields.length === 0 || subFields.every((subField) => isMongoObjectId(subField?.id))) {
      return undefined
    }

    let mounted = true

    getSubFieldsByField(selectedField.id, authToken)
      .then((data) => {
        if (!mounted || !Array.isArray(data?.subFields) || data.subFields.length === 0) {
          return
        }

        setFields((currentFields) =>
          currentFields.map((field) =>
            String(field?.id || "") === String(selectedField.id)
              ? {
                  ...field,
                  subFields: data.subFields,
                }
              : field
          )
        )
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [authToken, selectedField])

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      if (field === "fieldId" || field === "date") {
        return {
          ...createBookingForm(field === "fieldId" ? value : prev.fieldId, field === "date" ? value : prev.date),
          phone: prev.phone,
          confirmPhone: prev.confirmPhone,
          note: prev.note,
        }
      }

      return {
        ...prev,
        [field]: value,
      }
    })

    if (feedback.text) {
      setFeedback(createFeedbackState())
    }

    if (bookingStep !== "schedule" && (field === "fieldId" || field === "date")) {
      setBookingStep("schedule")
    }
  }

  const handleSlotSelect = (subField, slot, slots = []) => {

    setForm((prev) =>
      applyBookingSlotSelection(prev, subField, slot, slots, { allowRange: true })
    )
    setFeedback(createFeedbackState())
  }

  const handleContinueToConfirm = () => {
    if (selectedField && !isFieldApprovedForBooking(selectedField)) {
      setFeedback({
        type: "error",
        text: "SÃƒÂ¢n nÃƒÂ y Ã„â€˜ang chÃ¡Â»Â admin duyÃ¡Â»â€¡t hoÃ¡ÂºÂ·c Ã„â€˜ang bÃ¡Â»â€¹ khÃƒÂ³a, chÃ†Â°a thÃ¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ·t.",
      })
      return
    }

    if (!hasSelectedSlot) {
      setFeedback({ type: "error", text: "Vui lÃƒÂ²ng chÃ¡Â»Ân sÃƒÂ¢n con vÃƒÂ  khung giÃ¡Â»Â trÃ†Â°Ã¡Â»â€ºc." })
      return
    }

    setFeedback(createFeedbackState())
    setBookingStep("confirm")
  }

  const handleBackToSchedule = () => {
    setBookingStep("schedule")
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    let redirectedToPayment = false

    if (!authToken) {
      setFeedback({ type: "error", text: "BÃ¡ÂºÂ¡n cÃ¡ÂºÂ§n Ã„â€˜Ã„Æ’ng nhÃ¡ÂºÂ­p Ã„â€˜Ã¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ·t sÃƒÂ¢n." })
      return
    }

    if (selectedField && !isFieldApprovedForBooking(selectedField)) {
      setFeedback({
        type: "error",
        text: "SÃƒÂ¢n nÃƒÂ y Ã„â€˜ang chÃ¡Â»Â admin duyÃ¡Â»â€¡t hoÃ¡ÂºÂ·c Ã„â€˜ang bÃ¡Â»â€¹ khÃƒÂ³a, chÃ†Â°a thÃ¡Â»Æ’ Ã„â€˜Ã¡ÂºÂ·t.",
      })
      return
    }

    const validationError = validateBookingFormVi(form)
    if (validationError) {
      setFeedback({ type: "error", text: validationError })
      return
    }

    setSubmitting(true)
    setFeedback(createFeedbackState())

    try {
      const totalPrice = calculateBookingTotalPrice(
        selectedSubField?.pricePerHour || selectedField?.pricePerHour,
        form.timeSlot
      )
      const depositAmount = calculateBookingDepositAmount(totalPrice)
      const bookingPayloadTemplate = buildBookingPayload(form)
      const slotIdsToCreate =
        selectedTimeSlotIds.length > 0
          ? selectedTimeSlotIds
          : [bookingPayloadTemplate.timeSlotId].filter(Boolean)
      const createdBookings = []

      for (const timeSlotId of slotIdsToCreate) {
        const data = await createBooking(authToken, {
          ...bookingPayloadTemplate,
          timeSlotId,
        })
        const createdBooking = data.booking || null

        if (!createdBooking) {
          continue
        }

        createdBookings.push(createdBooking)
      }

      const normalizedCreatedBookings = createdBookings.map((booking) =>
        createLocalBookingRecord({
          booking,
          field: selectedField,
          subField: selectedSubField,
          slot: timeline.find((item) => String(item?.id || "").trim() === String(booking?.timeSlotId || "").trim()) || null,
          date: form.date,
          phone: form.phone,
          note: form.note,
          currentUser,
          status: booking?.status || (isOwnerPortal ? "CONFIRMED" : "PENDING"),
        })
      )
      const groupedCreatedBookings = !isOwnerPortal
        ? groupUserBookings(normalizedCreatedBookings)
        : []
      const createdBooking = normalizedCreatedBookings[0] || null
      if (!createdBooking) {
        throw new Error("Backend chÃ†Â°a trÃ¡ÂºÂ£ vÃ¡Â»Â Ã„â€˜Ã†Â¡n Ã„â€˜Ã¡ÂºÂ·t hÃ¡Â»Â£p lÃ¡Â»â€¡.")
      }

      let ownerSuccessMessage = ""
      const nextKnownBookings = mergeKnownBookingCollections(
        getStoredKnownBookings(),
        normalizedCreatedBookings
      )

      persistKnownBookings(nextKnownBookings)

      if (createdBooking?.id && !isOwnerPortal) {
        if (createdBookings.length === 1) {
          setBookings((currentBookings) => {
            return mergeBookingCollections(currentBookings, normalizedCreatedBookings)
          })
          setAvailabilityBookings((currentBookings) =>
            mergeBookingCollections(currentBookings, normalizedCreatedBookings)
          )
          setAvailabilityRefreshKey((value) => value + 1)
          redirectedToPayment = true
          navigate(createDepositPaymentRoute(createdBooking.id), {
            replace: true,
            state: {
              booking: createdBooking,
              field: selectedField,
              totalPrice,
              depositAmount,
            },
          })
          return
        }

        if (groupedCreatedBookings.length === 1) {
          const groupedBooking = groupedCreatedBookings[0]
          const paymentBookingIds = getUserBookingActionIds(groupedBooking)
          const paymentSearch =
            paymentBookingIds.length > 1
              ? `?${new URLSearchParams({ bookingIds: paymentBookingIds.join(",") }).toString()}`
              : ""

          setBookings((currentBookings) => {
            return mergeBookingCollections(currentBookings, normalizedCreatedBookings)
          })
          setAvailabilityBookings((currentBookings) =>
            mergeBookingCollections(currentBookings, normalizedCreatedBookings)
          )
          setAvailabilityRefreshKey((value) => value + 1)
          redirectedToPayment = true
          navigate(`${createDepositPaymentRoute(paymentBookingIds[0] || groupedBooking.id)}${paymentSearch}`, {
            replace: true,
            state: {
              booking: groupedBooking,
              bookingIds: paymentBookingIds,
              field: selectedField,
              totalPrice: Number(groupedBooking?.totalPrice || totalPrice || 0),
              depositAmount: Number(groupedBooking?.depositAmount || calculateBookingDepositAmount(groupedBooking?.totalPrice || totalPrice || 0)),
            },
          })
          return
        }
      }

      if (isOwnerPortal) {
        ownerSuccessMessage =
          createdBookings.length > 1
            ? `Da tao ${createdBookings.length} lich lien tiep thanh cong.`
            : "Da tao don dat thu cong."

        if (createdBookings.length > 0) {
          setBookings((currentBookings) => {
            return mergeBookingCollections(currentBookings, normalizedCreatedBookings)
          })
          setAvailabilityBookings((currentBookings) =>
            mergeBookingCollections(currentBookings, normalizedCreatedBookings)
          )
        }

        setFeedback({ type: "success", text: ownerSuccessMessage })
      } else {
        setBookings((currentBookings) => {
          return mergeBookingCollections(currentBookings, normalizedCreatedBookings)
        })
        setAvailabilityBookings((currentBookings) =>
          mergeBookingCollections(currentBookings, normalizedCreatedBookings)
        )
        setFeedback({ type: "success", text: "Ã„ÂÃ¡ÂºÂ·t sÃƒÂ¢n thÃƒÂ nh cÃƒÂ´ng." })
      }

      setAvailabilityRefreshKey((value) => value + 1)
      setForm((prev) => createBookingForm(prev.fieldId, prev.date))
      setBookingStep("schedule")

      try {
        const bookingData = await getMyBookings(authToken)
        const nextBookings =
          bookingData.bookings || []

        setBookings(nextBookings)
      } catch (_error) {}

      if (isOwnerPortal) {
        navigate(ROUTES.adminFields, {
          replace: true,
          state: {
            manualBookingMessage: ownerSuccessMessage,
            manualBookingMessageType: "success",
          },
        })
        return
      }

      if (createdBookings.length > 1) {
        navigate(ROUTES.booking, {
          replace: true,
          state: {
            bookingMessage: `Ã„ÂÃƒÂ£ tÃ¡ÂºÂ¡o ${createdBookings.length} Ã„â€˜Ã†Â¡n Ã„â€˜Ã¡ÂºÂ·t liÃƒÂªn tiÃ¡ÂºÂ¿p. VÃƒÂ o tÃ¡Â»Â«ng Ã„â€˜Ã†Â¡n trong danh sÃƒÂ¡ch Ã„â€˜Ã¡Â»Æ’ thanh toÃƒÂ¡n.`,
            bookingMessageType: "success",
          },
        })
        return
      }
    } catch (apiError) {
      setAvailabilityRefreshKey((value) => value + 1)
      setFeedback({ type: "error", text: apiError.message })
    } finally {
      if (!redirectedToPayment) {
        setSubmitting(false)
      }
    }
  }
  const handleCancelBooking = async (booking) => {
    if (!canCancelUserBooking(booking)) {
      setFeedback({
        type: "error",
        text: "ChÃ¡Â»â€° cÃƒÂ³ thÃ¡Â»Æ’ hÃ¡Â»Â§y sÃƒÂ¢n khi Ã„â€˜Ã†Â¡n nÃƒÂ y chÃ†Â°a thanh toÃƒÂ¡n.",
      })
      return
    }

    const bookingIds = getUserBookingActionIds(booking)
    const actionKey = String(booking?.id || bookingIds[0] || "").trim()

    if (authToken && bookingIds.length > 1) {
      const shouldCancelGroup = window.confirm(
        `HÃ¡Â»Â§y ${bookingIds.length} khung giÃ¡Â»Â liÃƒÂªn tiÃ¡ÂºÂ¿p tÃ¡ÂºÂ¡i ${booking.fieldName || "sÃƒÂ¢n nÃƒÂ y"}?`
      )

      if (!shouldCancelGroup) {
        return
      }

      setCancellingBookingId(actionKey)
      setFeedback(createFeedbackState())

      try {
        const cancelResults = await Promise.allSettled(
          bookingIds.map((bookingItemId) => cancelMyBooking(authToken, bookingItemId))
        )
        const successfulUpdates = cancelResults
          .filter((result) => result.status === "fulfilled")
          .map((result) => result.value?.booking)
          .filter(Boolean)
        const updatedBookingMap = new Map(
          successfulUpdates.map((item) => [String(item?.id || item?._id || "").trim(), item])
        )

        if (updatedBookingMap.size === 0) {
          const rejectedResult = cancelResults.find((result) => result.status === "rejected")
          throw rejectedResult?.reason || new Error("KhÃƒÂ´ng thÃ¡Â»Æ’ hÃ¡Â»Â§y Ã„â€˜Ã†Â¡n Ã„â€˜Ã¡ÂºÂ·t.")
        }

        setBookings((currentBookings) => {
          const nextBookings = currentBookings.map((item) =>
            updatedBookingMap.get(String(item?.id || item?._id || "").trim()) || item
          )

          return nextBookings
        })
        setAvailabilityBookings((currentBookings) =>
          currentBookings.map((item) =>
            updatedBookingMap.get(String(item?.id || item?._id || "").trim()) || item
          )
        )
        setAvailabilityRefreshKey((value) => value + 1)
        setFeedback({
          type: updatedBookingMap.size === bookingIds.length ? "success" : "error",
          text:
            updatedBookingMap.size === bookingIds.length
              ? `Ã„ÂÃƒÂ£ hÃ¡Â»Â§y ${updatedBookingMap.size} khung giÃ¡Â»Â liÃƒÂªn tiÃ¡ÂºÂ¿p.`
              : `Ã„ÂÃƒÂ£ hÃ¡Â»Â§y ${updatedBookingMap.size}/${bookingIds.length} khung giÃ¡Â»Â. Vui lÃƒÂ²ng thÃ¡Â»Â­ lÃ¡ÂºÂ¡i vÃ¡Â»â€ºi phÃ¡ÂºÂ§n cÃƒÂ²n lÃ¡ÂºÂ¡i.`,
        })
      } catch (apiError) {
        setFeedback({ type: "error", text: apiError.message })
      } finally {
        setCancellingBookingId("")
      }

      return
    }

    if (!authToken || !booking?.id) {
      return
    }

    const shouldCancel = window.confirm(`HÃ¡Â»Â§y Ã„â€˜Ã†Â¡n Ã„â€˜Ã¡ÂºÂ·t sÃƒÂ¢n ${booking.fieldName || booking.id}?`)
    if (!shouldCancel) {
      return
    }

    setCancellingBookingId(String(booking.id))
    setFeedback(createFeedbackState())

    try {
      const data = await cancelMyBooking(authToken, booking.id)
      const updatedBooking = data.booking || null

      setBookings((currentBookings) => {
        const nextBookings = currentBookings.map((item) =>
          item.id === booking.id ? updatedBooking || item : item
        )

        return nextBookings
      })
      setAvailabilityBookings((currentBookings) =>
        currentBookings.map((item) =>
          item.id === booking.id ? updatedBooking || item : item
        )
      )
      setAvailabilityRefreshKey((value) => value + 1)
      setFeedback({
        type: "success",
        text: data.message || "Ã„ÂÃƒÂ£ hÃ¡Â»Â§y Ã„â€˜Ã†Â¡n Ã„â€˜Ã¡ÂºÂ·t cÃ¡Â»Â§a bÃ¡ÂºÂ¡n.",
      })
    } catch (apiError) {
      setFeedback({ type: "error", text: apiError.message })
    } finally {
      setCancellingBookingId("")
    }
  }

  return {
    fields,
    bookings: visibleBookings,
    catalogMessage,
    fieldSlug,
    scheduleRows,
    timeline,
    selectedField,
    selectedSubField,
    selectedTimeSlot,
    selectedTimeSlotIds,
    hasSelectedSlot,
    loadingFields,
    loadingAvailability,
    loadingBookings,
    form,
    submitting,
    cancellingBookingId,
    feedback,
    bookingStep,
    loginPath: ROUTES.login,
    fieldsPath: ROUTES.fields,
    adminFieldsPath: ROUTES.adminFields,
    adminUsersPath: ROUTES.adminUsers,
    adminOwnerFieldsPath: ROUTES.adminOwnerFields,
    minBookingDate,
    formatDateTime: formatBookingDateTime,
    formatStatus: formatBookingStatusVi,
    handleFieldChange,
    handleSlotSelect,
    handleContinueToConfirm,
    handleBackToSchedule,
    handleCancelBooking,
    handleSubmit,
  }
}





