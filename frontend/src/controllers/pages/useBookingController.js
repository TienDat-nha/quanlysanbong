import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import {
  cancelMyBooking,
  createBooking,
  getBookingAvailability,
  getFields,
  getMyBookings,
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
  const [availabilityBookings, setAvailabilityBookings] = useState([])
  const [bookings, setBookings] = useState([])
  const [loadingFields, setLoadingFields] = useState(true)
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [form, setForm] = useState(() => createBookingForm(preselectedField, minBookingDate))
  const [submitting, setSubmitting] = useState(false)
  const [cancellingBookingId, setCancellingBookingId] = useState("")
  const [feedback, setFeedback] = useState(createFeedbackState)
  const [bookingStep, setBookingStep] = useState("schedule")
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0)

  const timeline = useMemo(() => createBookingTimeline(), [])
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

      return {
        ...prev,
        fieldId: nextFieldId,
        subFieldKey: "",
        timeSlot: "",
      }
    })
  }, [fieldSlug, matchedFieldBySlug, preselectedField])

  useEffect(() => {
    let mounted = true

    const loadFields = async () => {
      try {
        const data = await getFields()
        if (mounted) {
          setFields(getFieldList(data))
        }
      } catch (apiError) {
        if (mounted) {
          setFeedback({ type: "error", text: apiError.message })
        }
      } finally {
        if (mounted) {
          setLoadingFields(false)
        }
      }
    }

    loadFields()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadAvailability = async () => {
      if (!form.date || !form.fieldId) {
        setAvailabilityBookings([])
        setLoadingAvailability(false)
        return
      }

      setLoadingAvailability(true)
      setAvailabilityBookings([])

      try {
        const data = await getBookingAvailability(form.date, form.fieldId)
        if (mounted) {
          setAvailabilityBookings(data.bookings || [])
        }
      } catch (apiError) {
        if (mounted) {
          setAvailabilityBookings([])
          setFeedback({ type: "error", text: apiError.message })
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
  }, [availabilityRefreshKey, form.date, form.fieldId])

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
    () => fields.find((field) => Number(field.id) === Number(form.fieldId)) || null,
    [fields, form.fieldId]
  )

  const selectedSubField = useMemo(() => {
    if (!selectedField || !Array.isArray(selectedField.subFields)) {
      return null
    }

    const selectedKey = normalizeSubFieldKey(form.subFieldKey)
    return (
      selectedField.subFields.find(
        (subField) => normalizeSubFieldKey(subField?.key) === selectedKey
      ) || null
    )
  }, [selectedField, form.subFieldKey])

  const scheduleRows = useMemo(
    () =>
      buildBookingScheduleRows({
        field: selectedField,
        availabilityBookings,
        selectedDate: form.date,
        selectedSubFieldKey: form.subFieldKey,
        selectedTimeSlot: form.timeSlot,
        timeline,
      }),
    [availabilityBookings, selectedField, form.date, form.subFieldKey, form.timeSlot, timeline]
  )

  useEffect(() => {
    if (!form.subFieldKey || !form.timeSlot) {
      return
    }

    const selectedKey = normalizeSubFieldKey(form.subFieldKey)
    const selectedRow = scheduleRows.find(
      (row) => normalizeSubFieldKey(row.subField?.key) === selectedKey
    )

    if (!selectedRow || !isSelectedTimeSlotStillAvailable(selectedRow.slots, form.timeSlot)) {
      setForm((prev) => ({
        ...prev,
        subFieldKey: "",
        timeSlot: "",
      }))
    }
  }, [form.subFieldKey, form.timeSlot, scheduleRows])

  const hasSelectedSlot = Boolean(selectedField && selectedSubField && form.timeSlot)

  useEffect(() => {
    if (!hasSelectedSlot && bookingStep === "confirm") {
      setBookingStep("schedule")
    }
  }, [bookingStep, hasSelectedSlot])

  const handleFieldChange = (field, value) => {
    setForm((prev) => {
      if (field === "fieldId") {
        return {
          ...prev,
          fieldId: value,
          subFieldKey: "",
          timeSlot: "",
        }
      }

      if (field === "date") {
        return {
          ...prev,
          date: value,
          subFieldKey: "",
          timeSlot: "",
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

  const handleSlotSelect = (subFieldKey, slot) => {
    setForm((prev) => applyBookingSlotSelection(prev, subFieldKey, slot))
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
    let redirectedToDeposit = false

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
        redirectedToDeposit = true
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
      setAvailabilityRefreshKey((value) => value + 1)

      const bookingData = await getMyBookings(authToken)
      setBookings(bookingData.bookings || [])
    } catch (apiError) {
      setFeedback({ type: "error", text: apiError.message })
    } finally {
      if (!redirectedToDeposit) {
        setSubmitting(false)
      }
    }
  }

  const handleCancelBooking = async (booking) => {
    if (!authToken || !booking?.id) {
      return
    }

    const shouldCancel = window.confirm(`Hủy đơn đặt sân ${booking.fieldName}?`)
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
      setAvailabilityRefreshKey((value) => value + 1)
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
