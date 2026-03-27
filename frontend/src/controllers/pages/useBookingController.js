import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  cancelMyBooking,
  createBooking,
  getFields,
  getMyBookings,
  getTimeSlots,
} from "../../models/api"
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

export const useBookingController = ({ authToken }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { fieldSlug = "" } = useParams()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const preselectedField = searchParams.get("fieldId") || ""
  const minBookingDate = getTodayBookingDate()

  const [fields, setFields] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(false)
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
        const [fieldsData, timeSlotsData] = await Promise.all([getFields(), getTimeSlots()])

        if (!mounted) {
          return
        }

        setFields(getFieldList(fieldsData))
        setTimeSlots(timeSlotsData.timeSlots || [])
      } catch (apiError) {
        if (mounted) {
          setFeedback({ type: "error", text: apiError.message })
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
  }, [])

  useEffect(() => {
    if (!authToken) {
      setBookings([])
      setLoadingBookings(false)
      return
    }

    let mounted = true

    const loadBookings = async () => {
      setLoadingBookings(true)

      try {
        const data = await getMyBookings(authToken)
        if (mounted) {
          setBookings(data.bookings || [])
        }
      } catch (apiError) {
        if (mounted) {
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
  }, [authToken])

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
        field: selectedField,
        selectedDate: form.date,
        selectedSubFieldKey: form.subFieldKey,
        selectedTimeSlotId: form.timeSlotId,
        timeline,
      }),
    [selectedField, form.date, form.subFieldKey, form.timeSlotId, timeline]
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

      if (createdBooking?.id) {
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

      setFeedback({ type: "success", text: "Đặt sân thành công." })
      setForm((prev) => createBookingForm(prev.fieldId, prev.date))
      setBookingStep("schedule")

      const bookingData = await getMyBookings(authToken)
      setBookings(bookingData.bookings || [])
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

      setBookings((currentBookings) =>
        currentBookings.map((item) => (item.id === booking.id ? updatedBooking || item : item))
      )
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
