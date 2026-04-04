import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  approveAdminField,
  bootstrapAdminTimeSlots,
  cancelAdminBooking,
  confirmAdminBooking,
  confirmAdminBookingDeposit,
  confirmAdminBookingPayment,
  createAdminField,
  deleteAdminField,
  getAdminDashboard,
  getAdminFields,
  getBookedSlots,
  getMyBookings,
  lockAdminField,
  rejectAdminField,
  unlockAdminField,
  updateAdminField,
  uploadAdminImage,
} from "../../models/api"
import { EMPTY_ADMIN_STATS, getAdminDashboardState } from "../../models/adminDashboardModel"
import {
  buildAdminFieldPayload,
  createAdminFieldForm,
  createAdminFieldFormErrors,
  createAdminFieldFormFromField,
  createAdminSubFieldDraft,
  getAdminFieldApiErrorState,
  getAdminFieldList,
  validateAdminFieldForm,
} from "../../models/adminFieldModel"
import { canManageFields, isAdminUser, isOwnerUser } from "../../models/authModel"
import { getStoredKnownBookings } from "../../models/bookingCacheModel"
import { getTodayBookingDate, normalizeBookingDateValue } from "../../models/bookingModel"
import { normalizeFieldType } from "../../models/fieldTypeModel"
import {
  createAdminFieldsSectionRoute,
  createPublicBookingUrl,
  ROUTES,
  STAFF_DASHBOARD_SECTIONS,
} from "../../models/routeModel"

const buildNoticeMessage = (...messages) =>
  messages
    .map((message) => String(message || "").trim())
    .filter(Boolean)
    .join(" ")

const normalizeMessageKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const isGenericSuccessMessage = (value = "") => {
  const normalizedValue = normalizeMessageKey(value)
  return normalizedValue === "success" || normalizedValue === "ok" || normalizedValue === "done"
}

const resolveDisplayMessage = (value = "", fallback = "") => {
  const message = String(value || "").trim()
  return !message || isGenericSuccessMessage(message) ? String(fallback || "").trim() : message
}

const getFieldModerationState = (field) => {
  const rawStatus = String(field?.approvalStatus || field?.status || field?.fieldStatus || "")
    .trim()
    .toUpperCase()
  const isLocked = Boolean(field?.isLocked || field?.locked)

  if (rawStatus === "REJECTED") {
    return "REJECTED"
  }

  if (isLocked || rawStatus === "LOCKED") {
    return "LOCKED"
  }

  if (rawStatus === "PENDING") {
    return "PENDING"
  }

  if (rawStatus === "APPROVED" || rawStatus === "ACTIVE") {
    return "APPROVED"
  }

  return "APPROVED"
}

const normalizeManagedFieldId = (field) =>
  String(field?.id || field?._id || field?.fieldId || "")
    .trim()

const filterFieldsForPortal = (fields, currentUser, isOwnerPortal) => {
  const nextFields = Array.isArray(fields) ? fields : []

  if (!isOwnerPortal) {
    return nextFields
  }

  const ownerIds = [
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.email,
    currentUser?.name,
    currentUser?.fullName,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

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

    return fieldKeys.some((value) => ownerIds.includes(value))
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

const OWNER_MANUAL_BOOKINGS_STORAGE_PREFIX = "sanbong_owner_manual_bookings"

const getPortalOwnerKeys = (currentUser) =>
  [
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.email,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

const getManualBookingStorageKey = (currentUser) => {
  const ownerKey = getPortalOwnerKeys(currentUser)[0]
  return ownerKey ? `${OWNER_MANUAL_BOOKINGS_STORAGE_PREFIX}:${ownerKey}` : ""
}

const getStoredOwnerManualBookings = (currentUser) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return []
  }

  const storageKey = getManualBookingStorageKey(currentUser)
  if (!storageKey) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue)
    return Array.isArray(parsedValue)
      ? parsedValue
        .filter(Boolean)
        .map((booking) => ({
          ...booking,
          date: normalizeBookingDateValue(booking?.date),
        }))
      : []
  } catch (_error) {
    return []
  }
}

const hasActiveBookingStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase()
  return normalizedStatus !== "cancelled" && normalizedStatus !== "canceled"
}

const filterActiveManagedBookings = (bookings = [], date = "") =>
  (Array.isArray(bookings) ? bookings : []).filter(
    (booking) =>
      hasActiveBookingStatus(booking?.status)
      && normalizeBookingDateValue(booking?.date) === normalizeBookingDateValue(date)
  )

const getManagedBookingIdentity = (booking, index = 0) => {
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

const mergeManagedBookingCollections = (...collections) => {
  const bookingMap = new Map()

  collections.flat().forEach((collection) => {
    ;(Array.isArray(collection) ? collection : []).forEach((booking, index) => {
      if (!booking || typeof booking !== "object") {
        return
      }

      const identity = getManagedBookingIdentity(booking, index)
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

const doesManagedBookingMatchField = (booking, field) => {
  const bookingTokens = [
    booking?.fieldId,
    booking?.field?._id,
    booking?.field?.id,
    booking?.fieldName,
    booking?.fieldSlug,
    booking?.field?.slug,
    booking?.fieldAddress,
    booking?.field?.address,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
  const fieldTokens = [
    field?.id,
    field?._id,
    field?.name,
    field?.slug,
    field?.address,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

  if (bookingTokens.length === 0 || fieldTokens.length === 0) {
    return false
  }

  return fieldTokens.some((token) => bookingTokens.includes(token))
}

const normalizeManagedBookingsDate = (value) => {
  const normalizedValue = String(value || "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
    ? normalizedValue
    : getTodayBookingDate()
}

const createManagedBookingPreview = (field, subField, date, booking, index = 0) => {
  const baseBooking = booking && typeof booking === "object" ? booking : null
  const normalizedTimeSlotId = String(baseBooking?.timeSlotId || booking || "").trim()
  const normalizedTimeSlot = String(
    baseBooking?.timeSlot
    || baseBooking?.timeSlotLabel
    || baseBooking?.timeSlotInfo?.timeSlot
    || baseBooking?.timeSlotInfo?.label
    || ""
  ).trim()

  if (!normalizedTimeSlotId && !normalizedTimeSlot) {
    return null
  }

  const fallbackId =
    `slot:${String(field?.id || "").trim()}:${String(subField?.id || "").trim()}:${String(date || "").trim()}:${normalizedTimeSlotId || normalizedTimeSlot || index + 1}`

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
    timeSlotId: normalizedTimeSlotId,
    timeSlot: normalizedTimeSlot,
    phone: String(baseBooking?.phone || baseBooking?.customer?.phone || "").trim(),
    customer: baseBooking?.customer || null,
    status: String(baseBooking?.status || "PENDING").trim(),
  }
}

const createManagedBookingsFromDailyAvailability = (
  dailyAvailability = [],
  date = getTodayBookingDate()
) =>
  (Array.isArray(dailyAvailability) ? dailyAvailability : []).flatMap((field) =>
    (Array.isArray(field?.subFields) ? field.subFields : []).flatMap((subField) =>
      (Array.isArray(subField?.bookings) ? subField.bookings : [])
        .map((booking, index) =>
          createManagedBookingPreview(
            {
              id: field?.id,
              name: field?.name,
              slug: field?.slug,
              address: field?.address,
              district: field?.district,
              type: subField?.type,
            },
            {
              id: `${String(field?.id || "").trim()}:${String(subField?.key || "").trim()}`,
              key: subField?.key,
              name: subField?.name,
              type: subField?.type,
            },
            date,
            {
              ...booking,
              customer: {
                fullName: booking?.customerName,
                phone: booking?.phone,
              },
            },
            index
          )
        )
        .filter(Boolean)
    )
  )

const filterManagedBookingsByFields = (bookings = [], fields = []) => {
  const nextBookings = Array.isArray(bookings) ? bookings : []
  const nextFields = Array.isArray(fields) ? fields : []

  if (nextBookings.length === 0 || nextFields.length === 0) {
    return nextBookings
  }

  const matchedBookings = nextBookings.filter((booking) =>
    nextFields.some((field) => doesManagedBookingMatchField(booking, field))
  )

  return matchedBookings.length > 0 ? matchedBookings : nextBookings
}

const getManagedBookingStartMinutes = (booking) => {
  const match = String(booking?.timeSlot || "").trim().match(/^(\d{1,2}):(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER
}

const sortManagedBookings = (bookings = []) =>
  [...(Array.isArray(bookings) ? bookings : [])].sort((left, right) => {
    const leftDate = String(left?.date || "").trim()
    const rightDate = String(right?.date || "").trim()

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }

    const startMinutesDiff =
      getManagedBookingStartMinutes(left) - getManagedBookingStartMinutes(right)
    if (startMinutesDiff !== 0) {
      return startMinutesDiff
    }

    const fieldDiff = String(left?.fieldName || "").localeCompare(
      String(right?.fieldName || ""),
      "vi"
    )
    if (fieldDiff !== 0) {
      return fieldDiff
    }

    return String(left?.subFieldName || "").localeCompare(
      String(right?.subFieldName || ""),
      "vi"
    )
  })

const loadManagedBookingsFromBookedSlots = async (token, fields = [], date = getTodayBookingDate()) => {
  const bookingTasks = (Array.isArray(fields) ? fields : []).flatMap((field) =>
    (Array.isArray(field?.subFields) ? field.subFields : [])
      .filter((subField) => String(subField?.id || "").trim())
      .map((subField) => ({ field, subField }))
  )

  if (bookingTasks.length === 0) {
    return []
  }

  const results = await Promise.allSettled(
    bookingTasks.map(async ({ field, subField }) => {
      const data = await getBookedSlots(subField.id, date, token)
      const rawRecords =
        Array.isArray(data?.slotRecords) && data.slotRecords.length > 0
          ? data.slotRecords
          : Array.isArray(data?.timeSlotIds)
            ? data.timeSlotIds
            : []

      return rawRecords
        .map((booking, index) =>
          createManagedBookingPreview(field, subField, date, booking, index)
        )
        .filter(Boolean)
    })
  )

  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
}

export const useAdminFieldsController = ({ authToken, currentUser }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [fields, setFields] = useState([])
  const [stats, setStats] = useState(EMPTY_ADMIN_STATS)
  const [managedBookings, setManagedBookings] = useState([])
  const [managedBookingsDate, setManagedBookingsDate] = useState(() => getTodayBookingDate())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [processingBookingId, setProcessingBookingId] = useState("")
  const [processingBookingAction, setProcessingBookingAction] = useState("")
  const [deletingFieldId, setDeletingFieldId] = useState("")
  const [fieldStatusActionId, setFieldStatusActionId] = useState("")
  const [fieldStatusActionMode, setFieldStatusActionMode] = useState("")
  const [bootstrappingTimeSlots, setBootstrappingTimeSlots] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState(null)
  const [error, setError] = useState("")
  const [noticeMessage, setNoticeMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(createAdminFieldForm)
  const [formErrors, setFormErrors] = useState(() =>
    createAdminFieldFormErrors(createAdminFieldForm())
  )
  const [refreshKey, setRefreshKey] = useState(0)

  const isAdminPortal = isAdminUser(currentUser)
  const isOwnerPortal = isOwnerUser(currentUser)
  const canAccessFieldDashboard = Boolean(authToken) && canManageFields(currentUser)
  const canLoadManagedBookings = canAccessFieldDashboard
  const publicOrigin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  )

  useEffect(() => {
    const manualBookingMessage = String(location.state?.manualBookingMessage || "").trim()
    const manualBookingMessageType = String(location.state?.manualBookingMessageType || "success")
      .trim()
      .toLowerCase()

    if (!manualBookingMessage || isGenericSuccessMessage(manualBookingMessage)) {
      if (location.state) {
        navigate(`${location.pathname}${location.search}${location.hash}`, {
          replace: true,
          state: null,
        })
      }
      return
    }

    setError("")

    if (manualBookingMessageType === "warning") {
      setSuccessMessage("")
      setNoticeMessage(manualBookingMessage)
    } else {
      setNoticeMessage("")
      setSuccessMessage(manualBookingMessage)
    }

    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: null,
    })
  }, [location, navigate])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const legacyManageFieldsHash = `#${STAFF_DASHBOARD_SECTIONS.manageFields}`
    if (
      window.location.pathname === ROUTES.adminFields
      && window.location.hash === legacyManageFieldsHash
    ) {
      window.history.replaceState(
        null,
        document.title,
        `${window.location.pathname}${window.location.search}`
      )
    }
  }, [])

  const resetForm = () => {
    const nextForm = createAdminFieldForm()
    setForm(nextForm)
    setFormErrors(createAdminFieldFormErrors(nextForm))
    setEditingFieldId(null)
  }

  const clearTopMessages = () => {
    setError("")
    setSuccessMessage("")
  }

  const clearFieldError = (fieldName) => {
    setFormErrors((prev) => ({
      ...prev,
      [fieldName]: "",
    }))
  }

  const clearSubFieldError = (subFieldIndex, fieldName) => {
    setFormErrors((prev) => ({
      ...prev,
      subFieldsMessage: "",
      subFields: (Array.isArray(prev.subFields) ? prev.subFields : []).map((item, index) =>
        index === subFieldIndex
          ? {
              ...item,
              [fieldName]: "",
            }
          : item
      ),
    }))
  }

  const getFieldDeletionState = (field) => {
    const fieldIds = [
      field?.id,
      field?._id,
      field?.fieldId,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
    const fieldName = String(field?.name || "").trim().toLowerCase()
    const localManualBookings = isOwnerPortal ? getStoredOwnerManualBookings(currentUser) : []
    const relatedBookings = [...managedBookings, ...localManualBookings]
    const hasActiveBookings =
      Number(field?.bookingCount || field?.totalBookings || 0) > 0
      || relatedBookings.some((booking) => {
        if (!hasActiveBookingStatus(booking?.status)) {
          return false
        }

        const bookingFieldId = String(booking?.fieldId || "").trim()
        const bookingFieldName = String(booking?.fieldName || "").trim().toLowerCase()

        return (
          (bookingFieldId && fieldIds.includes(bookingFieldId))
          || (bookingFieldName && fieldName && bookingFieldName === fieldName)
        )
      })

    if (hasActiveBookings) {
      return {
        canDelete: false,
        reason: "Sân này đã có khách đặt, không thể xóa.",
      }
    }

    const moderationState = getFieldModerationState(field)
    if (isAdminPortal && (moderationState === "PENDING" || moderationState === "REJECTED")) {
      return {
        canDelete: false,
        reason:
          moderationState === "PENDING"
            ? "Yêu cầu này cần được duyệt hoặc từ chối, không xóa trực tiếp."
            : "Sân đang ở trạng thái bị từ chối, không xóa ở bước xét duyệt.",
      }
    }

    return {
      canDelete: true,
      reason: moderationState === "PENDING" ? "Sân đang chờ admin duyệt." : "",
    }
  }

  useEffect(() => {
    if (!canAccessFieldDashboard) {
      setFields([])
      setStats(EMPTY_ADMIN_STATS)
      setManagedBookings([])
      setLoading(false)
      setProcessingBookingId("")
      setProcessingBookingAction("")
      setDeletingFieldId("")
      setFieldStatusActionId("")
      setFieldStatusActionMode("")
      setBootstrappingTimeSlots(false)
      setNoticeMessage("")
      setError("")
      resetForm()
      return
    }

    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)

      try {
        const selectedManagedBookingsDate = normalizeManagedBookingsDate(managedBookingsDate)
        const [fieldsResult, dashboardResult, myBookingsResult] = await Promise.allSettled([
          getAdminFields(authToken),
          canLoadManagedBookings
            ? getAdminDashboard(authToken, {
                months: 6,
                date: selectedManagedBookingsDate,
              })
            : Promise.resolve({}),
          canLoadManagedBookings ? getMyBookings(authToken) : Promise.resolve({ bookings: [] }),
        ])

        if (!mounted) {
          return
        }

        const fieldsData = fieldsResult.status === "fulfilled" ? fieldsResult.value : { fields: [] }
        const dashboardData = dashboardResult.status === "fulfilled" ? dashboardResult.value : {}
        const myBookingsData = myBookingsResult.status === "fulfilled" ? myBookingsResult.value : { bookings: [] }
        const dashboardState = canLoadManagedBookings
          ? getAdminDashboardState(dashboardData)
          : getAdminDashboardState({})
        const nextFields = filterFieldsForPortal(
          getAdminFieldList(fieldsData),
          currentUser,
          isOwnerPortal
        )
        const bookedSlotManagedBookings = canLoadManagedBookings
          ? await loadManagedBookingsFromBookedSlots(
              authToken,
              nextFields,
              selectedManagedBookingsDate
            )
          : []

        const localManualBookings = canLoadManagedBookings ? getStoredOwnerManualBookings(currentUser) : []
        const knownBookings = canLoadManagedBookings
          ? (() => {
              const cachedBookings = getStoredKnownBookings()
              if (nextFields.length === 0) {
                return cachedBookings
              }

              const matchedBookings = cachedBookings.filter((booking) =>
                nextFields.some((field) => doesManagedBookingMatchField(booking, field))
              )

              return matchedBookings.length > 0 ? matchedBookings : cachedBookings
            })()
          : []
        const dashboardAvailabilityManagedBookings = canLoadManagedBookings
          ? createManagedBookingsFromDailyAvailability(
              dashboardState.dailyAvailability,
              selectedManagedBookingsDate
            )
          : []
        const dashboardManagedBookings = canLoadManagedBookings
          ? filterManagedBookingsByFields(
              mergeManagedBookingCollections(
                dashboardAvailabilityManagedBookings,
                dashboardState.managedBookings || []
              ),
              nextFields
            )
          : []
        const liveManagedBookings = canLoadManagedBookings
          ? mergeManagedBookingCollections(
              dashboardManagedBookings,
              bookedSlotManagedBookings,
              myBookingsData?.bookings || []
            )
          : []
        const fallbackManagedBookings = canLoadManagedBookings
          ? mergeManagedBookingCollections(localManualBookings, knownBookings)
          : []
        const ownerManagedBookings = canLoadManagedBookings
          ? sortManagedBookings(
              filterActiveManagedBookings(
                liveManagedBookings.length > 0 ? liveManagedBookings : fallbackManagedBookings,
                selectedManagedBookingsDate
              )
            )
          : []
        const hasDashboardPayload =
          Number(dashboardState.managedBookings?.length || 0) > 0
          || Number(dashboardState.dailyAvailability?.length || 0) > 0
          || Number(dashboardState.customerMonthlyStats?.length || 0) > 0
          || Number(dashboardState.customerSummaries?.length || 0) > 0
        const managedBookingErrors = [
          dashboardResult.status === "rejected" ? dashboardResult.reason?.message : "",
          myBookingsResult.status === "rejected" ? myBookingsResult.reason?.message : "",
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
        const dashboardNoticeMessage = canLoadManagedBookings && hasDashboardPayload
          ? dashboardData?.message
          : ""

        setFields(nextFields)
        setStats({
          ...EMPTY_ADMIN_STATS,
          ...(dashboardState.stats || {}),
          totalFields: Number(dashboardState.stats?.totalFields || 0) || nextFields.length,
          totalBookings:
            Number(dashboardState.stats?.totalBookings || 0)
            || ownerManagedBookings.length,
          pendingBookings:
            Number(dashboardState.stats?.pendingBookings || 0)
            || ownerManagedBookings.filter(
              (booking) => String(booking?.status || "").trim().toUpperCase() === "PENDING"
            ).length,
          confirmedBookings:
            Number(dashboardState.stats?.confirmedBookings || 0)
            || ownerManagedBookings.filter(
              (booking) => String(booking?.status || "").trim().toUpperCase() === "CONFIRMED"
            ).length,
        })
        setManagedBookings(
          canLoadManagedBookings ? ownerManagedBookings : []
        )
        setNoticeMessage(
          buildNoticeMessage(fieldsData?.message, dashboardNoticeMessage)
        )
        setError(
          fieldsResult.status === "rejected" && nextFields.length === 0
            ? fieldsResult.reason?.message || "Không thể tải danh sách sân."
            : canLoadManagedBookings && ownerManagedBookings.length === 0 && managedBookingErrors.length > 0
              ? managedBookingErrors[0]
              : ""
        )
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

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [
    authToken,
    canAccessFieldDashboard,
    canLoadManagedBookings,
    currentUser,
    isOwnerPortal,
    managedBookingsDate,
    refreshKey,
  ])

  const handleFieldChange = (field, value) => {
    clearTopMessages()
    clearFieldError(field)

    setForm((prev) => {
      if (field !== "type") {
        return {
          ...prev,
          [field]: value,
        }
      }

      const previousType = normalizeFieldType(prev.type)
      const nextType = normalizeFieldType(value, previousType)

      return {
        ...prev,
        type: nextType,
        subFields: prev.subFields.map((subField) => {
          const currentSubFieldType = normalizeFieldType(subField.type)

          if (!currentSubFieldType || currentSubFieldType === previousType) {
            return {
              ...subField,
              type: nextType,
            }
          }

          return subField
        }),
      }
    })

    if (field === "type") {
      setFormErrors((prev) => ({
        ...prev,
        type: "",
        subFields: (Array.isArray(prev.subFields) ? prev.subFields : []).map((item) => ({
          ...item,
          type: "",
        })),
      }))
    }
  }

  const handleSubFieldChange = (subFieldId, field, value) => {
    clearTopMessages()
    setForm((prev) => ({
      ...prev,
      subFields: prev.subFields.map((subField) =>
        subField.id === subFieldId
          ? {
              ...subField,
              [field]: value,
            }
          : subField
      ),
    }))

    const subFieldIndex = (Array.isArray(form.subFields) ? form.subFields : []).findIndex(
      (subField) => subField.id === subFieldId
    )
    if (subFieldIndex >= 0) {
      clearSubFieldError(subFieldIndex, field)
    }
  }

  const handleAddSubField = () => {
    clearTopMessages()
    setForm((prev) => ({
      ...prev,
      subFields: [
        ...prev.subFields,
        createAdminSubFieldDraft(prev.subFields.length + 1, {
          type: prev.type,
          pricePerHour: prev.pricePerHour,
        }),
      ],
    }))
    setFormErrors((prev) => ({
      ...prev,
      subFieldsMessage: "",
      subFields: [
        ...(Array.isArray(prev.subFields) ? prev.subFields : []),
        {
          name: "",
          type: "",
          pricePerHour: "",
        },
      ],
    }))
  }

  const handleRemoveSubField = (subFieldId) => {
    clearTopMessages()
    setForm((prev) => {
      const nextSubFields = prev.subFields.filter((subField) => subField.id !== subFieldId)
      return {
        ...prev,
        subFields:
          nextSubFields.length > 0
            ? nextSubFields
            : [
                createAdminSubFieldDraft(1, {
                  type: prev.type,
                  pricePerHour: prev.pricePerHour,
                }),
              ],
      }
    })
    setFormErrors((prev) => {
      const nextSubFieldErrors = (Array.isArray(prev.subFields) ? prev.subFields : []).filter(
        (_item, index) => (form.subFields || [])[index]?.id !== subFieldId
      )
      return {
        ...prev,
        subFieldsMessage: "",
        subFields:
          nextSubFieldErrors.length > 0
            ? nextSubFieldErrors
            : [
                {
                  name: "",
                  type: "",
                  pricePerHour: "",
                },
              ],
      }
    })
  }

  const handleCoverImageUpload = async (file) => {
    if (!file) {
      return
    }

    if (!canAccessFieldDashboard) {
      setError("Bạn cần đăng nhập bằng tài khoản quản lý sân.")
      return
    }

    setUploadingCover(true)
    setError("")

    try {
      const response = await uploadAdminImage(authToken, file)
      const imageUrl = String(response?.file?.url || response?.file?.path || "").trim()

      if (!imageUrl) {
        throw new Error("Không nhận được đường dẫn ảnh sau khi tải lên.")
      }

      setForm((prev) => ({
        ...prev,
        coverImage: imageUrl,
      }))
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setUploadingCover(false)
    }
  }

  const handleGalleryImagesUpload = async (files) => {
    const selectedFiles = Array.from(files || []).filter(Boolean)
    if (selectedFiles.length === 0) {
      return
    }

    if (!canAccessFieldDashboard) {
      setError("Bạn cần đăng nhập bằng tài khoản quản lý sân.")
      return
    }

    setUploadingGallery(true)
    setError("")

    try {
      for (const file of selectedFiles) {
        const response = await uploadAdminImage(authToken, file)
        const imageUrl = String(response?.file?.url || response?.file?.path || "").trim()

        if (!imageUrl) {
          throw new Error(`Không nhận được đường dẫn ảnh cho tệp ${file.name}.`)
        }

        setForm((prev) => ({
          ...prev,
          coverImage: prev.coverImage || imageUrl,
          galleryImages: [...prev.galleryImages, imageUrl],
        }))
      }
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setUploadingGallery(false)
    }
  }

  const handleRemoveCoverImage = () => {
    clearTopMessages()
    setForm((prev) => ({
      ...prev,
      coverImage: "",
    }))
  }

  const handleRemoveGalleryImage = (imageUrl) => {
    clearTopMessages()
    setForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((item) => item !== imageUrl),
    }))
  }

  const handleEditField = (field) => {
    setEditingFieldId(normalizeManagedFieldId(field) || null)
    const nextForm = createAdminFieldFormFromField(field)
    setForm(nextForm)
    setFormErrors(createAdminFieldFormErrors(nextForm))
    clearTopMessages()

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleCancelFieldEdit = () => {
    resetForm()
    clearTopMessages()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    const validationState = validateAdminFieldForm(form)
    setFormErrors(validationState.fieldErrors)
    if (!validationState.isValid) {
      setError(validationState.message)
      return
    }

    if (!canAccessFieldDashboard) {
      setError("Bạn cần đăng nhập bằng tài khoản quản lý sân.")
      return
    }

    if (uploadingCover || uploadingGallery) {
      setError("Ảnh đang được tải lên. Vui lòng đợi xong rồi tiếp tục.")
      return
    }

    setSubmitting(true)
    try {
      const payload = buildAdminFieldPayload(form)
      const isEditingMode = Boolean(editingFieldId)
      const response = editingFieldId
        ? await updateAdminField(authToken, editingFieldId, payload)
        : await createAdminField(authToken, payload)

      resetForm()
      const fallbackMessage = isEditingMode
        ? isOwnerPortal
          ? "Đã gửi yêu cầu sửa sân tới admin."
          : "Đã cập nhật sân."
        : isOwnerPortal
          ? "Đã gửi yêu cầu tạo sân tới admin."
          : "Đã tạo sân mới."
      const responseMessage = String(response?.message || "").trim()
      const resolvedSuccessMessage =
        isOwnerPortal && (!responseMessage || isGenericSuccessMessage(responseMessage))
          ? fallbackMessage
          : resolveDisplayMessage(responseMessage, fallbackMessage)

      setSuccessMessage(resolvedSuccessMessage)
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      const apiErrorState = getAdminFieldApiErrorState(apiError.message, form)
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        ...apiErrorState.fieldErrors,
      }))
      setError(apiErrorState.message || apiError.message)

      const normalizedApiMessage = String(apiError.message || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

      if (
        normalizedApiMessage.includes("field already exists")
        || normalizedApiMessage.includes("ton tai")
      ) {
        setNoticeMessage("Sân này có thể đã được tạo trước đó. Đang tải lại danh sách để kiểm tra.")
        setRefreshKey((currentValue) => currentValue + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteField = async (field) => {
    if (!canAccessFieldDashboard || !field?.id) {
      return
    }

    const deletionState = getFieldDeletionState(field)
    if (!deletionState.canDelete) {
      setError(deletionState.reason)
      setSuccessMessage("")
      return
    }

    const shouldDeleteField = window.confirm(
      `Bạn có chắc chắn muốn xóa sân "${field.name}" không?`
    )

    if (!shouldDeleteField) {
      return
    }

    setDeletingFieldId(String(field.id))
    setError("")
    setSuccessMessage("")

    try {
      const response = await deleteAdminField(authToken, field.id)

      setFields((currentFields) => currentFields.filter((item) => item.id !== field.id))

      if (String(editingFieldId || "").trim() === String(field.id || "").trim()) {
        resetForm()
      }

      setSuccessMessage(resolveDisplayMessage(response?.message, "Đã xóa sân thành công."))
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingFieldId("")
    }
  }

  const handleRejectField = async (field) => {
    if (!authToken || !isAdminPortal || !field?.id) {
      return
    }

    const moderationState = getFieldModerationState(field)
    if (moderationState !== "PENDING") {
      return
    }

    const rejectReason = window.prompt(
      `Lý do từ chối duyệt sân "${field.name}" (có thể bỏ trống):`,
      ""
    )

    if (rejectReason === null) {
      return
    }

    setFieldStatusActionId(String(field.id))
    setFieldStatusActionMode("reject")
    setError("")
    setSuccessMessage("")

    try {
      const response = await rejectAdminField(authToken, field.id, rejectReason)
      setSuccessMessage(resolveDisplayMessage(response?.message, "Đã từ chối duyệt sân."))
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setFieldStatusActionId("")
      setFieldStatusActionMode("")
    }
  }

  const handleFieldModeration = async (field) => {
    if (!authToken || !isAdminPortal || !field?.id) {
      return
    }

    const moderationState = getFieldModerationState(field)
    const action =
      moderationState === "APPROVED"
        ? "lock"
        : moderationState === "LOCKED"
          ? "unlock"
          : "approve"
    const confirmMessage =
      action === "lock"
        ? `Khóa sân "${field.name}"?`
        : action === "unlock"
          ? `Mở khóa sân "${field.name}"?`
          : moderationState === "REJECTED"
            ? `Duyệt lại sân "${field.name}"?`
            : `Duyệt sân "${field.name}"?`

    const shouldContinue = window.confirm(confirmMessage)
    if (!shouldContinue) {
      return
    }

    setFieldStatusActionId(String(field.id))
    setFieldStatusActionMode(action)
    setError("")
    setSuccessMessage("")

    try {
      const response =
        action === "lock"
          ? await lockAdminField(authToken, field.id)
          : action === "unlock"
            ? await unlockAdminField(authToken, field.id)
            : await approveAdminField(authToken, field.id)

      setSuccessMessage(
        resolveDisplayMessage(
          response?.message,
          action === "lock"
            ? "Đã khóa sân."
            : action === "unlock"
              ? "Đã mở khóa sân."
              : "Đã duyệt sân."
        )
      )
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setFieldStatusActionId("")
      setFieldStatusActionMode("")
    }
  }

  const handleBootstrapTimeSlots = async () => {
    if (!authToken || !isAdminPortal) {
      return
    }

    setBootstrappingTimeSlots(true)
    setError("")
    setSuccessMessage("")
    setNoticeMessage("")

    try {
      const response = await bootstrapAdminTimeSlots(authToken)

      if (Number(response?.createdCount || 0) > 0) {
        setSuccessMessage(
          resolveDisplayMessage(response?.message, "Đã khởi tạo khung giờ mẫu cho backend.")
        )
      } else {
        setNoticeMessage(
          resolveDisplayMessage(response?.message, "Backend đã có sẵn khung giờ mẫu.")
        )
      }
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setBootstrappingTimeSlots(false)
    }
  }

  const handleBookingAction = async (bookingId, action) => {
    if (!authToken || !canAccessFieldDashboard || !bookingId) {
      return
    }

    setProcessingBookingId(String(bookingId))
    setProcessingBookingAction(String(action || ""))
    setError("")
    setSuccessMessage("")

    try {
      let response
      if (action === "confirm") {
        response = await confirmAdminBooking(authToken, bookingId)
      } else if (action === "deposit") {
        response = await confirmAdminBookingDeposit(authToken, bookingId)
      } else if (action === "payment") {
        response = await confirmAdminBookingPayment(authToken, bookingId)
      } else {
        response = await cancelAdminBooking(authToken, bookingId)
      }

      setSuccessMessage(
        resolveDisplayMessage(
          response?.message,
          action === "confirm"
            ? "Đã xác nhận đơn đặt."
            : action === "deposit"
              ? "Đã xác nhận đặt cọc."
              : action === "payment"
                ? "Đã xác nhận thanh toán."
                : "Đã hủy đơn đặt."
        )
      )
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setProcessingBookingId("")
      setProcessingBookingAction("")
    }
  }

  return {
    authToken,
    currentUser,
    canAccessFieldDashboard,
    isAdminPortal,
    isOwnerPortal,
    fields,
    stats,
    managedBookings,
    managedBookingsDate,
    loading,
    submitting,
    uploadingCover,
    uploadingGallery,
    processingBookingId,
    processingBookingAction,
    deletingFieldId,
    fieldStatusActionId,
    fieldStatusActionMode,
    bootstrappingTimeSlots,
    error,
    noticeMessage,
    successMessage,
    form,
    formErrors,
    isEditingField: Boolean(editingFieldId),
    loginPath: ROUTES.login,
    fieldsPath: ROUTES.fields,
    manualBookingPath: ROUTES.booking,
    adminUsersPath: ROUTES.adminUsers,
    manageFieldsSectionId: STAFF_DASHBOARD_SECTIONS.manageFields,
    fieldListSectionId: STAFF_DASHBOARD_SECTIONS.fieldList,
    ownerBookingsSectionId: STAFF_DASHBOARD_SECTIONS.ownerBookings,
    manageFieldsSectionPath: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.manageFields),
    fieldListSectionPath: createAdminFieldsSectionRoute(STAFF_DASHBOARD_SECTIONS.fieldList),
    ownerBookingsSectionPath: createAdminFieldsSectionRoute(
      STAFF_DASHBOARD_SECTIONS.ownerBookings
    ),
    publicOrigin,
    createPublicBookingUrl,
    getFieldDeletionState,
    handleManagedBookingsDateChange: (value) =>
      setManagedBookingsDate(normalizeManagedBookingsDate(value)),
    handleFieldChange,
    handleSubFieldChange,
    handleAddSubField,
    handleRemoveSubField,
    handleCoverImageUpload,
    handleGalleryImagesUpload,
    handleRemoveCoverImage,
    handleRemoveGalleryImage,
    handleEditField,
    handleCancelFieldEdit,
    handleDeleteField,
    handleRejectField,
    handleFieldModeration,
    handleBootstrapTimeSlots,
    handleSubmit,
    handleConfirmBooking: (bookingId) => handleBookingAction(bookingId, "confirm"),
    handleConfirmDeposit: (bookingId) => handleBookingAction(bookingId, "deposit"),
    handleConfirmPayment: (bookingId) => handleBookingAction(bookingId, "payment"),
    handleCancelBooking: (bookingId) => handleBookingAction(bookingId, "cancel"),
  }
}
