import { useEffect, useMemo, useState } from "react"
import {
  cancelAdminBooking,
  confirmAdminBooking,
  confirmAdminBookingDeposit,
  confirmAdminBookingPayment,
  createAdminField,
  deleteAdminContact,
  deleteAdminField,
  getAdminContacts,
  getAdminDashboard,
  getAdminFields,
  updateAdminField,
  uploadAdminImage,
} from "../../models/api"
import {
  createAdminDashboardDate,
  EMPTY_ADMIN_STATS,
  getAdminDashboardState,
} from "../../models/adminDashboardModel"
import {
  buildAdminFieldPayload,
  createAdminFieldForm,
  createAdminFieldFormFromField,
  createAdminSubFieldDraft,
  getAdminFieldList,
  validateAdminFieldForm,
} from "../../models/adminFieldModel"
import { isAdminUser } from "../../models/authModel"
import { getAdminContactList } from "../../models/contactModel"
import { normalizeFieldType } from "../../models/fieldTypeModel"
import { createPublicBookingUrl, ROUTES } from "../../models/routeModel"

const EMPTY_DASHBOARD_STATE = Object.freeze({
  recentBookings: [],
  managedBookings: [],
  dailyAvailability: [],
  customerMonthlyStats: [],
  customerSummaries: [],
})

export const useAdminFieldsController = ({ authToken, currentUser }) => {
  const [fields, setFields] = useState([])
  const [contacts, setContacts] = useState([])
  const [stats, setStats] = useState(EMPTY_ADMIN_STATS)
  const [recentBookings, setRecentBookings] = useState(EMPTY_DASHBOARD_STATE.recentBookings)
  const [managedBookings, setManagedBookings] = useState(EMPTY_DASHBOARD_STATE.managedBookings)
  const [dailyAvailability, setDailyAvailability] = useState(EMPTY_DASHBOARD_STATE.dailyAvailability)
  const [customerMonthlyStats, setCustomerMonthlyStats] = useState(
    EMPTY_DASHBOARD_STATE.customerMonthlyStats
  )
  const [customerSummaries, setCustomerSummaries] = useState(EMPTY_DASHBOARD_STATE.customerSummaries)
  const [selectedDate, setSelectedDate] = useState(createAdminDashboardDate)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [processingBookingId, setProcessingBookingId] = useState("")
  const [processingBookingAction, setProcessingBookingAction] = useState("")
  const [deletingFieldId, setDeletingFieldId] = useState("")
  const [deletingContactId, setDeletingContactId] = useState("")
  const [editingFieldId, setEditingFieldId] = useState(null)
  const [error, setError] = useState("")
  const [noticeMessage, setNoticeMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(createAdminFieldForm)
  const [refreshKey, setRefreshKey] = useState(0)

  const isAdmin = isAdminUser(currentUser)
  const publicOrigin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  )

  const resetForm = () => {
    setForm(createAdminFieldForm())
    setEditingFieldId(null)
  }

  useEffect(() => {
    if (!authToken || !isAdmin) {
      setFields([])
      setContacts([])
      setStats(EMPTY_ADMIN_STATS)
      setRecentBookings([])
      setManagedBookings([])
      setDailyAvailability([])
      setCustomerMonthlyStats([])
      setCustomerSummaries([])
      setLoading(false)
      setProcessingBookingId("")
      setProcessingBookingAction("")
      setDeletingFieldId("")
      setDeletingContactId("")
      setNoticeMessage("")
      resetForm()
      return
    }

    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)

      try {
        const [fieldsData, dashboardData, contactsData] = await Promise.all([
          getAdminFields(authToken),
          getAdminDashboard(authToken, { date: selectedDate, months: 6 }),
          getAdminContacts(authToken),
        ])

        if (!mounted) {
          return
        }

        const dashboardState = getAdminDashboardState(dashboardData)
        const nextFields = getAdminFieldList(fieldsData)

        setFields(nextFields)
        setContacts(getAdminContactList(contactsData))
        setStats({
          ...EMPTY_ADMIN_STATS,
          ...(dashboardState.stats || {}),
          totalFields: Number(dashboardState.stats?.totalFields || 0) || nextFields.length,
        })
        setRecentBookings(dashboardState.recentBookings)
        setManagedBookings(dashboardState.managedBookings)
        setDailyAvailability(dashboardState.dailyAvailability)
        setCustomerMonthlyStats(dashboardState.customerMonthlyStats)
        setCustomerSummaries(dashboardState.customerSummaries)
        setNoticeMessage(String(fieldsData?.message || "").trim())
        setError("")

        if (
          dashboardState.availabilityDate
          && dashboardState.availabilityDate !== selectedDate
        ) {
          setSelectedDate(dashboardState.availabilityDate)
        }
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
  }, [authToken, isAdmin, refreshKey, selectedDate])

  const handleFieldChange = (field, value) => {
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
  }

  const handleSubFieldChange = (subFieldId, field, value) => {
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
  }

  const handleAddSubField = () => {
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
  }

  const handleRemoveSubField = (subFieldId) => {
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
  }

  const handleDashboardDateChange = (value) => {
    setSelectedDate(value || createAdminDashboardDate())
  }

  const handleCoverImageUpload = async (file) => {
    if (!file) {
      return
    }

    if (!authToken || !isAdmin) {
      setError("Bạn cần đăng nhập bằng tài khoản admin.")
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

    if (!authToken || !isAdmin) {
      setError("Bạn cần đăng nhập bằng tài khoản admin.")
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
    setForm((prev) => ({
      ...prev,
      coverImage: "",
    }))
  }

  const handleRemoveGalleryImage = (imageUrl) => {
    setForm((prev) => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((item) => item !== imageUrl),
    }))
  }

  const handleEditField = (field) => {
    setEditingFieldId(Number(field?.id || 0) || null)
    setForm(createAdminFieldFormFromField(field))
    setError("")
    setSuccessMessage("")

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleCancelFieldEdit = () => {
    resetForm()
    setError("")
    setSuccessMessage("")
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    const validationError = validateAdminFieldForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!authToken || !isAdmin) {
      setError("Bạn cần đăng nhập bằng tài khoản admin.")
      return
    }

    if (uploadingCover || uploadingGallery) {
      setError("Ảnh đang được tải lên. Vui lòng đợi xong rồi tiếp tục.")
      return
    }

    setSubmitting(true)
    try {
      const payload = buildAdminFieldPayload(form)
      const response = editingFieldId
        ? await updateAdminField(authToken, editingFieldId, payload)
        : await createAdminField(authToken, payload)

      resetForm()
      setSuccessMessage(
        String(response?.message || "").trim()
        || (editingFieldId ? "Đã cập nhật sân." : "Đã tạo sân mới.")
      )
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteField = async (field) => {
    if (!authToken || !isAdmin || !field?.id) {
      return
    }

    const shouldDelete = window.confirm(
      `Xóa sân "${field.name}"? Tất cả booking liên quan sẽ bị xóa.`
    )

    if (!shouldDelete) {
      return
    }

    setDeletingFieldId(String(field.id))
    setError("")
    setSuccessMessage("")

    try {
      const response = await deleteAdminField(authToken, field.id)

      setFields((currentFields) => currentFields.filter((item) => item.id !== field.id))

      if (Number(editingFieldId) === Number(field.id)) {
        resetForm()
      }

      setSuccessMessage(
        String(response?.message || "").trim()
        || "Đã xóa sân thành công."
      )
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingFieldId("")
    }
  }

  const handleDeleteContact = async (contact) => {
    if (!authToken || !isAdmin || !contact?.id) {
      return
    }

    const shouldDelete = window.confirm(`Xóa liên hệ của ${contact.name || contact.email}?`)
    if (!shouldDelete) {
      return
    }

    setDeletingContactId(String(contact.id))
    setError("")
    setSuccessMessage("")

    try {
      const response = await deleteAdminContact(authToken, contact.id)
      setContacts((currentContacts) => currentContacts.filter((item) => item.id !== contact.id))
      setSuccessMessage(String(response?.message || "").trim() || "Đã xóa liên hệ.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingContactId("")
    }
  }

  const handleBookingAction = async (bookingId, action) => {
    if (!authToken || !isAdmin || !bookingId) {
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
        String(response?.message || "").trim()
        || (action === "confirm" ? "Đã xác nhận đơn đặt." : "Đã hủy đơn đặt.")
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
    isAdmin,
    fields,
    contacts,
    stats,
    recentBookings,
    managedBookings,
    dailyAvailability,
    customerMonthlyStats,
    customerSummaries,
    selectedDate,
    loading,
    submitting,
    uploadingCover,
    uploadingGallery,
    processingBookingId,
    processingBookingAction,
    deletingFieldId,
    deletingContactId,
    error,
    noticeMessage,
    successMessage,
    form,
    isEditingField: Boolean(editingFieldId),
    loginPath: ROUTES.login,
    publicOrigin,
    createPublicBookingUrl,
    handleFieldChange,
    handleSubFieldChange,
    handleAddSubField,
    handleRemoveSubField,
    handleDashboardDateChange,
    handleCoverImageUpload,
    handleGalleryImagesUpload,
    handleRemoveCoverImage,
    handleRemoveGalleryImage,
    handleEditField,
    handleCancelFieldEdit,
    handleDeleteField,
    handleDeleteContact,
    handleSubmit,
    handleConfirmBooking: (bookingId) => handleBookingAction(bookingId, "confirm"),
    handleConfirmDeposit: (bookingId) => handleBookingAction(bookingId, "deposit"),
    handleConfirmPayment: (bookingId) => handleBookingAction(bookingId, "payment"),
    handleCancelBooking: (bookingId) => handleBookingAction(bookingId, "cancel"),
  }
}
