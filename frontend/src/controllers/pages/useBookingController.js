import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  cancelMyBooking,
  confirmAdminBooking,
  createBooking,
  getFields,
  getMyBookings,
  getTimeSlots,
} from "../../models/api"
import { isOwnerUser } from "../../models/authModel"
import {
  applyBookingSlotSelection,
  buildBookingPayload,
  buildBookingScheduleRows,
  calculateBookingDepositAmount,
  calculateBookingTotalPrice,
  createBookingForm,
  createBookingTimeline,
  createFeedbackState,
  formatBookingDateTime,
  getTodayBookingDate,
  isSelectedTimeSlotStillAvailable,
  normalizeSubFieldKey,
} from "../../models/bookingModel"
import { formatBookingStatusVi, validateBookingFormVi } from "../../models/bookingTextModel"
import { getFieldList } from "../../models/fieldModel"
import { createDepositPaymentRoute, ROUTES } from "../../models/routeModel"

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

const filterFieldsForOwnerPortal = (fields, currentUser, isOwnerPortal) => {
  const nextFields = Array.isArray(fields) ? fields : []

  if (!isOwnerPortal) {
    return nextFields
  }

  const ownerKeys = getPortalOwnerKeys(currentUser)
  if (ownerKeys.length === 0) {
    return []
  }

  return nextFields.filter((field) =>
    ownerKeys.includes(
      String(field?.ownerUserId || field?.userId || field?.ownerEmail || "")
        .trim()
        .toLowerCase()
    )
  )
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

  return "APPROVED"
}

const isFieldApprovedForBooking = (field) => getFieldModerationState(field) === "APPROVED"

const getManualBookingStorageKey = (currentUser) => {
  const ownerKey = getPortalOwnerKeys(currentUser)[0]
  return ownerKey ? `${OWNER_MANUAL_BOOKINGS_STORAGE_PREFIX}:${ownerKey}` : ""
}

const getBookingIdentity = (booking, index = 0) => {
  const bookingId = String(booking?.id || booking?._id || "").trim()
  if (bookingId) {
    return `id:${bookingId}`
  }

  const compositeParts = [
    booking?.fieldId,
    booking?.subFieldId,
    booking?.date,
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

const persistOwnerManualBookings = (currentUser, bookings = []) => {
  if (typeof window === "undefined" || !window.localStorage) {
    return []
  }

  const storageKey = getManualBookingStorageKey(currentUser)
  if (!storageKey) {
    return []
  }

  const nextBookings = mergeBookingCollections(
    (Array.isArray(bookings) ? bookings : []).filter((booking) => {
      const status = String(booking?.status || "").trim().toLowerCase()
      return status !== "cancelled" && status !== "canceled"
    })
  )

  try {
    if (nextBookings.length === 0) {
      window.localStorage.removeItem(storageKey)
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(nextBookings))
    }
  } catch (_error) {
    return nextBookings
  }

  return nextBookings
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
    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : []
  } catch (_error) {
    return []
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
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [catalogMessage, setCatalogMessage] = useState("")
  const [form, setForm] = useState(() => createBookingForm(preselectedField, minBookingDate))
  const [submitting, setSubmitting] = useState(false)
  const [cancellingBookingId, setCancellingBookingId] = useState("")
  const [feedback, setFeedback] = useState(createFeedbackState)
  const [bookingStep, setBookingStep] = useState("schedule")

  const timeline = useMemo(() => createBookingTimeline(timeSlots), [timeSlots])
  const matchedFieldBySlug = useMemo(
    () => fields.find((field) => String(field.slug || "") === String(fieldSlug || "")) || null,
    [fieldSlug, fields]
  )

  useEffect(() => {
    setForm((prev) => {
      const nextFieldId = fieldSlug
        ? matchedFieldBySlug
          ? String(matchedFieldBySlug.id)
          : ""
        : preselectedField || ""

      if (String(prev.fieldId) === String(nextFieldId)) {
        return prev
      }

      return createBookingForm(nextFieldId, prev.date || minBookingDate)
    })
  }, [fieldSlug, matchedFieldBySlug, preselectedField, minBookingDate])

  useEffect(() => {
    let mounted = true

    const loadCatalog = async () => {
      setLoadingFields(true)
      setLoadingAvailability(true)

      try {
        const [fieldsData, timeSlotsData] = await Promise.all([
          getFields(authToken),
          getTimeSlots(),
        ])

        if (!mounted) {
          return
        }

        const allFields = getFieldList(fieldsData)
        const ownedFields = filterFieldsForOwnerPortal(allFields, currentUser, isOwnerPortal)
        const nextFields = isOwnerPortal
          ? ownedFields.filter((field) => isFieldApprovedForBooking(field))
          : allFields

        setFields(nextFields)
        setTimeSlots(timeSlotsData.timeSlots || [])
        setCatalogMessage(
          nextFields.length === 0 && isOwnerPortal
            ? "Chưa có sân nào gắn với tài khoản chủ sân này."
            : String(fieldsData?.message || "").trim()
        )
        if (isOwnerPortal) {
          setCatalogMessage(
            ownedFields.length === 0
              ? "Chưa có sân nào gắn với tài khoản chủ sân này."
              : nextFields.length === 0
                ? "Các sân của bạn đang chờ admin duyệt hoặc đang bị khóa nên chưa thể đặt."
                : ""
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
          setLoadingAvailability(false)
        }
      }
    }

    loadCatalog()

    return () => {
      mounted = false
    }
  }, [authToken, currentUser, isOwnerPortal])

  useEffect(() => {
    const storedOwnerManualBookings = isOwnerPortal ? getStoredOwnerManualBookings(currentUser) : []

    if (!authToken) {
      setBookings(storedOwnerManualBookings)
      setLoadingBookings(false)
      return
    }

    let mounted = true

    const loadBookings = async () => {
      setLoadingBookings(true)

      try {
        const data = await getMyBookings(authToken)
        if (mounted) {
          setBookings(
            isOwnerPortal
              ? mergeBookingCollections(data.bookings || [], storedOwnerManualBookings)
              : data.bookings || []
          )
        }
      } catch (apiError) {
        if (mounted) {
          if (isOwnerPortal && storedOwnerManualBookings.length > 0) {
            setBookings(storedOwnerManualBookings)
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
    () => fields.find((field) => String(field.id) === String(form.fieldId)) || null,
    [fields, form.fieldId]
  )

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

  const scheduleRows = useMemo(
    () =>
      buildBookingScheduleRows({
        bookings,
        field: selectedField,
        selectedDate: form.date,
        selectedSubFieldKey: form.subFieldKey,
        selectedTimeSlotId: form.timeSlotId,
        timeline,
      }),
    [bookings, selectedField, form.date, form.subFieldKey, form.timeSlotId, timeline]
  )

  useEffect(() => {
    if (!form.subFieldKey || !form.timeSlotId) {
      return
    }

    const selectedKey = normalizeSubFieldKey(form.subFieldKey)
    const selectedRow = scheduleRows.find(
      (row) => normalizeSubFieldKey(row.subField?.key) === selectedKey
    )

    if (!selectedRow || !isSelectedTimeSlotStillAvailable(selectedRow.slots, form.timeSlotId)) {
      setForm((prev) => ({
        ...prev,
        subFieldId: "",
        subFieldKey: "",
        timeSlotId: "",
        timeSlot: "",
      }))
    }
  }, [form.subFieldKey, form.timeSlotId, scheduleRows])

  const hasSelectedSlot = Boolean(selectedField && selectedSubField && form.timeSlot && form.timeSlotId)

  useEffect(() => {
    if (!hasSelectedSlot && bookingStep === "confirm") {
      setBookingStep("schedule")
    }
  }, [bookingStep, hasSelectedSlot])

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

  const handleSlotSelect = (subField, slot) => {
    setForm((prev) => applyBookingSlotSelection(prev, subField, slot))
    setFeedback(createFeedbackState())
  }

  const handleContinueToConfirm = () => {
    if (selectedField && !isFieldApprovedForBooking(selectedField)) {
      setFeedback({
        type: "error",
        text: "Sân này đang chờ admin duyệt hoặc đang bị khóa, chưa thể đặt.",
      })
      return
    }

    if (!hasSelectedSlot) {
      setFeedback({ type: "error", text: "Vui lòng chọn sân con và khung giờ trước." })
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
      setFeedback({ type: "error", text: "Bạn cần đăng nhập để đặt sân." })
      return
    }

    if (selectedField && !isFieldApprovedForBooking(selectedField)) {
      setFeedback({
        type: "error",
        text: "Sân này đang chờ admin duyệt hoặc đang bị khóa, chưa thể đặt.",
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
      const data = await createBooking(authToken, buildBookingPayload(form))
      const createdBooking = data.booking || null
      const totalPrice = calculateBookingTotalPrice(
        selectedSubField?.pricePerHour || selectedField?.pricePerHour,
        form.timeSlot
      )
      const depositAmount = calculateBookingDepositAmount(totalPrice)

      if (createdBooking?.id && !isOwnerPortal) {
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

      if (isOwnerPortal) {
        let manualBookingRecord = createdBooking
          ? {
              ...createdBooking,
              status: createdBooking.status || "PENDING",
            }
          : null
        let ownerSuccessMessage = "Đã tạo đơn đặt thủ công và đánh dấu lịch sân."

        if (createdBooking?.id) {
          try {
            await confirmAdminBooking(authToken, createdBooking.id)
            manualBookingRecord = {
              ...manualBookingRecord,
              status: "CONFIRMED",
            }
          } catch (confirmError) {
            ownerSuccessMessage = `Đã tạo đơn đặt thủ công. Đơn chưa được backend xác nhận tự động: ${confirmError.message}`
          }
        }

        if (manualBookingRecord) {
          setBookings((currentBookings) => {
            const nextBookings = mergeBookingCollections(currentBookings, [manualBookingRecord])
            persistOwnerManualBookings(currentUser, nextBookings)
            return nextBookings
          })
        }

        setFeedback({ type: "success", text: ownerSuccessMessage })
      } else {
        setFeedback({ type: "success", text: "Đặt sân thành công." })
      }

      setForm((prev) => createBookingForm(prev.fieldId, prev.date))
      setBookingStep("schedule")

      try {
        const bookingData = await getMyBookings(authToken)
        const nextBookings =
          isOwnerPortal
            ? mergeBookingCollections(
                bookingData.bookings || [],
                getStoredOwnerManualBookings(currentUser)
              )
            : bookingData.bookings || []

        setBookings(nextBookings)

        if (isOwnerPortal) {
          persistOwnerManualBookings(currentUser, nextBookings)
        }
      } catch (_error) {
        // Keep local manual bookings when backend does not expose owner-managed bookings.
      }
    } catch (apiError) {
      setFeedback({ type: "error", text: apiError.message })
    } finally {
      if (!redirectedToPayment) {
        setSubmitting(false)
      }
    }
  }

  const handleCancelBooking = async (booking) => {
    if (!authToken || !booking?.id) {
      return
    }

    const shouldCancel = window.confirm(`Hủy đơn đặt sân ${booking.fieldName || booking.id}?`)
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

        if (isOwnerPortal) {
          persistOwnerManualBookings(currentUser, nextBookings)
        }

        return nextBookings
      })
      setFeedback({
        type: "success",
        text: data.message || "Đã hủy đơn đặt của bạn.",
      })
    } catch (apiError) {
      setFeedback({ type: "error", text: apiError.message })
    } finally {
      setCancellingBookingId("")
    }
  }

  return {
    fields,
    bookings,
    catalogMessage,
    fieldSlug,
    scheduleRows,
    timeline,
    selectedField,
    selectedSubField,
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
