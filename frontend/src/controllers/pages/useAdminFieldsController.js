import { useEffect, useMemo, useState } from "react"
import {
  approveAdminField,
  cancelAdminBooking,
  confirmAdminBooking,
  confirmAdminBookingDeposit,
  confirmAdminBookingPayment,
  createAdminField,
  deleteAdminField,
  getAdminDashboard,
  getAdminFields,
  rejectAdminField,
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

const getFieldModerationState = (field) => {
  const rawStatus = String(field?.approvalStatus || field?.status || field?.fieldStatus || "")
    .trim()
    .toUpperCase()
  const isLocked = Boolean(field?.isLocked || field?.locked)

  if (isLocked || rawStatus === "LOCKED" || rawStatus === "REJECTED") {
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
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)

  const ownedFields = nextFields.filter((field) =>
    ownerIds.includes(String(field?.ownerUserId || field?.userId || field?.ownerEmail || "").trim().toLowerCase())
  )

  return ownedFields.length > 0 ? ownedFields : nextFields
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
    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : []
  } catch (_error) {
    return []
  }
}

const hasActiveBookingStatus = (status) => {
  const normalizedStatus = String(status || "").trim().toLowerCase()
  return normalizedStatus !== "cancelled" && normalizedStatus !== "canceled"
}

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
  const [fieldStatusActionId, setFieldStatusActionId] = useState("")
  const [fieldStatusActionMode, setFieldStatusActionMode] = useState("")
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
  const publicOrigin = useMemo(
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    []
  )

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

    return {
      canDelete: true,
      reason:
        getFieldModerationState(field) === "PENDING"
          ? "Sân đang chờ admin duyệt."
          : "",
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
        const nextFields = filterFieldsForPortal(
          getAdminFieldList(fieldsData),
          currentUser,
          isOwnerPortal
        )

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
  }, [authToken, canAccessFieldDashboard, currentUser, isOwnerPortal, refreshKey])

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
        isOwnerPortal && (!responseMessage || responseMessage.toLowerCase() === "success")
          ? fallbackMessage
          : responseMessage || fallbackMessage

      setSuccessMessage(resolvedSuccessMessage)
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      const apiErrorState = getAdminFieldApiErrorState(apiError.message, form)
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        ...apiErrorState.fieldErrors,
      }))
      setError(apiErrorState.message || apiError.message)
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

      setSuccessMessage(String(response?.message || "").trim() || "Đã xóa sân thành công.")
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingFieldId("")
    }

    return

    // eslint-disable-next-line no-unreachable
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

      if (String(editingFieldId || "").trim() === String(field.id || "").trim()) {
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

  const handleFieldModeration = async (field) => {
    if (!authToken || !isAdminPortal || !field?.id) {
      return
    }

    const moderationState = getFieldModerationState(field)
    const isApproveAction = moderationState !== "APPROVED"
    const confirmMessage = isApproveAction
      ? moderationState === "LOCKED"
        ? `Mở khóa và duyệt sân "${field.name}"?`
        : `Duyệt sân "${field.name}"?`
      : `Khóa sân "${field.name}"?`

    const shouldContinue = window.confirm(confirmMessage)
    if (!shouldContinue) {
      return
    }

    let reason = ""
    if (!isApproveAction) {
      const promptedReason = window.prompt(
        "Nhập lý do khóa/từ chối sân",
        "Khóa sân bởi admin."
      )

      if (promptedReason === null) {
        return
      }

      reason = String(promptedReason || "").trim() || "Khóa sân bởi admin."
    }

    setFieldStatusActionId(String(field.id))
    setFieldStatusActionMode(isApproveAction ? "approve" : "lock")
    setError("")
    setSuccessMessage("")

    try {
      const response = isApproveAction
        ? await approveAdminField(authToken, field.id)
        : await rejectAdminField(authToken, field.id, reason)

      setSuccessMessage(
        String(response?.message || "").trim()
        || (isApproveAction ? "Đã duyệt sân." : "Đã khóa sân.")
      )
      setRefreshKey((currentValue) => currentValue + 1)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setFieldStatusActionId("")
      setFieldStatusActionMode("")
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
    fieldStatusActionId,
    fieldStatusActionMode,
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
    handleFieldModeration,
    handleSubmit,
    handleConfirmBooking: (bookingId) => handleBookingAction(bookingId, "confirm"),
    handleConfirmDeposit: (bookingId) => handleBookingAction(bookingId, "deposit"),
    handleConfirmPayment: (bookingId) => handleBookingAction(bookingId, "payment"),
    handleCancelBooking: (bookingId) => handleBookingAction(bookingId, "cancel"),
  }
}
