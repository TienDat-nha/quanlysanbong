import { useEffect, useMemo, useState } from "react"
import {
  cancelAdminBooking,
  confirmAdminBooking,
  confirmAdminBookingDeposit,
  confirmAdminBookingPayment,
  createAdminField,
  deleteAdminField,
  getAdminDashboard,
  getAdminFields,
  updateAdminField,
  uploadAdminImage,
} from "../../models/api"
import { EMPTY_ADMIN_STATS, getAdminDashboardState } from "../../models/adminDashboardModel"
import {
  buildAdminFieldPayload,
  createAdminFieldForm,
  createAdminFieldFormFromField,
  createAdminSubFieldDraft,
  getAdminFieldList,
  validateAdminFieldForm,
} from "../../models/adminFieldModel"
import { canManageFields, isAdminUser, isOwnerUser } from "../../models/authModel"
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

export const useAdminFieldsController = ({ authToken, currentUser }) => {
  const [fields, setFields] = useState([])
  const [stats, setStats] = useState(EMPTY_ADMIN_STATS)
  const [managedBookings, setManagedBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [processingBookingId, setProcessingBookingId] = useState("")
  const [processingBookingAction, setProcessingBookingAction] = useState("")
  const [deletingFieldId, setDeletingFieldId] = useState("")
  const [editingFieldId, setEditingFieldId] = useState(null)
  const [error, setError] = useState("")
  const [noticeMessage, setNoticeMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState(createAdminFieldForm)
  const [refreshKey, setRefreshKey] = useState(0)

  const isAdminPortal = isAdminUser(currentUser)
  const isOwnerPortal = isOwnerUser(currentUser)
  const canAccessFieldDashboard = Boolean(authToken) && canManageFields(currentUser)
  const publicOrigin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  )

  const resetForm = () => {
    setForm(createAdminFieldForm())
    setEditingFieldId(null)
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
      setNoticeMessage("")
      setError("")
      resetForm()
      return
    }

    let mounted = true

    const loadDashboard = async () => {
      setLoading(true)

      try {
        const [fieldsData, dashboardData] = await Promise.all([
          getAdminFields(authToken),
          isOwnerPortal ? getAdminDashboard(authToken, { months: 6 }) : Promise.resolve({}),
        ])

        if (!mounted) {
          return
        }

        const dashboardState = isOwnerPortal
          ? getAdminDashboardState(dashboardData)
          : getAdminDashboardState({})
        const nextFields = getAdminFieldList(fieldsData)

        setFields(nextFields)
        setStats({
          ...EMPTY_ADMIN_STATS,
          ...(dashboardState.stats || {}),
          totalFields: Number(dashboardState.stats?.totalFields || 0) || nextFields.length,
        })
        setManagedBookings(
          isOwnerPortal && Array.isArray(dashboardState.managedBookings)
            ? dashboardState.managedBookings
            : []
        )
        setNoticeMessage(
          buildNoticeMessage(fieldsData?.message, isOwnerPortal ? dashboardData?.message : "")
        )
        setError("")
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
  }, [authToken, canAccessFieldDashboard, isOwnerPortal, refreshKey])

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
    if (!canAccessFieldDashboard || !field?.id) {
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

      setSuccessMessage(String(response?.message || "").trim() || "Đã xóa sân thành công.")
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingFieldId("")
    }
  }

  const handleBookingAction = async (bookingId, action) => {
    if (!authToken || !isOwnerPortal || !bookingId) {
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
    canAccessFieldDashboard,
    isAdminPortal,
    isOwnerPortal,
    fields,
    stats,
    managedBookings,
    loading,
    submitting,
    uploadingCover,
    uploadingGallery,
    processingBookingId,
    processingBookingAction,
    deletingFieldId,
    error,
    noticeMessage,
    successMessage,
    form,
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
    handleSubmit,
    handleConfirmBooking: (bookingId) => handleBookingAction(bookingId, "confirm"),
    handleConfirmDeposit: (bookingId) => handleBookingAction(bookingId, "deposit"),
    handleConfirmPayment: (bookingId) => handleBookingAction(bookingId, "payment"),
    handleCancelBooking: (bookingId) => handleBookingAction(bookingId, "cancel"),
  }
}
