import { useEffect, useMemo, useState } from "react"
import { isAdminUser, isPrimaryAdminEmail, isValidEmail } from "../../models/authModel"
import {
  canSendManagedUserOtp,
  createPublicUser,
  deletePublicUser,
  getManagedUserOtpSetupMessage,
  getPublicUsers,
  requestManagedUserOtp,
  verifyManagedUserOtp,
  updatePublicUser,
} from "../../models/api"
import {
  getApiRoleValue,
  getManagedUserRoleLabel,
  getUserList,
  getUserSummary,
} from "../../models/userModel"
import { ROUTES } from "../../models/routeModel"

const INITIAL_FORM_VALUES = Object.freeze({
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "USER",
})

const createManagedUserFormErrors = () => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "",
  otpInput: "",
})

const getFirstManagedUserFormError = (fieldErrors = {}) =>
  Object.values(fieldErrors).find((value) => String(value || "").trim()) || ""

const ROLE_OPTIONS = Object.freeze([
  { value: "USER", label: "Người dùng" },
  { value: "OWNER", label: "Chủ sân" },
])

const OTP_RESEND_SECONDS = 60
const OTP_EXPIRE_SECONDS = 300

const createInitialOtpState = () => ({
  codeHash: "",
  input: "",
  verified: false,
  sentAt: 0,
  expiresAt: 0,
  resendAvailableAt: 0,
  targetEmail: "",
  feedback: null,
})

const formatOtpCountdown = (value) => {
  const totalSeconds = Math.max(0, Number(value || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export const useUsersController = ({ authToken, currentUser }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [editingUserId, setEditingUserId] = useState(null)
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [formErrors, setFormErrors] = useState(createManagedUserFormErrors)
  const [submitting, setSubmitting] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [statusActionUserId, setStatusActionUserId] = useState("")
  const [statusActionMode, setStatusActionMode] = useState("")
  const [otpState, setOtpState] = useState(createInitialOtpState)
  const [otpActionMode, setOtpActionMode] = useState("")
  const [now, setNow] = useState(Date.now())

  const otpEnabled = canSendManagedUserOtp()
  const otpSetupMessage = otpEnabled ? "" : getManagedUserOtpSetupMessage()
  const canManageUsers = Boolean(authToken) && isAdminUser(currentUser)
  const summary = useMemo(() => getUserSummary(users), [users])

  const secondsUntilResend = otpState.codeHash
    ? Math.max(0, Math.ceil((otpState.resendAvailableAt - now) / 1000))
    : 0
  const secondsUntilExpiry = otpState.codeHash
    ? Math.max(0, Math.ceil((otpState.expiresAt - now) / 1000))
    : 0
  const canResendOtp = !otpState.codeHash || secondsUntilResend <= 0
  const otpExpired = Boolean(otpState.codeHash) && secondsUntilExpiry <= 0 && !otpState.verified
  const otpSummary = useMemo(
    () => ({
      countdownLabel: otpState.codeHash ? formatOtpCountdown(secondsUntilExpiry) : "--:--",
      resendLabel: otpState.codeHash
        ? secondsUntilResend > 0
          ? `${secondsUntilResend}s`
          : "Có thể gửi lại"
        : "Sẵn sàng gửi",
      canSubmit: otpState.verified,
    }),
    [otpState.codeHash, otpState.verified, secondsUntilExpiry, secondsUntilResend]
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!otpExpired) {
      return
    }

    setOtpState((prev) => {
      if (!prev.codeHash || prev.verified) {
        return prev
      }

      if (prev.feedback?.text === "Mã OTP đã hết hạn. Hãy gửi lại mã mới.") {
        return prev
      }

      return {
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: "Mã OTP đã hết hạn. Hãy gửi lại mã mới.",
        },
      }
    })
  }, [otpExpired])

  const fetchUsers = async () => {
    const data = await getPublicUsers()
    return getUserList(data)
  }

  useEffect(() => {
    let mounted = true

    if (!canManageUsers) {
      setUsers([])
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    const loadUsers = async () => {
      setLoading(true)

      try {
        const nextUsers = await fetchUsers()

        if (mounted) {
          setUsers(nextUsers)
          setError("")
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

    loadUsers()

    return () => {
      mounted = false
    }
  }, [canManageUsers])

  const refreshUsers = async () => {
    const nextUsers = await fetchUsers()
    setUsers(nextUsers)
    return nextUsers
  }

  const resetOtpState = (feedback = null) => {
    setOtpActionMode("")
    setOtpState({
      ...createInitialOtpState(),
      feedback,
    })
  }

  const resetForm = () => {
    setFormValues(INITIAL_FORM_VALUES)
    setFormErrors(createManagedUserFormErrors())
    setEditingUserId(null)
    resetOtpState()
  }

  const isCurrentAdminAccount = (user) => {
    const currentId = String(currentUser?.id || currentUser?._id || "").trim()
    const currentEmail = String(currentUser?.email || "").trim().toLowerCase()
    const targetId = String(user?.id || "").trim()
    const targetEmail = String(user?.email || "").trim().toLowerCase()

    return Boolean(
      (currentId && targetId && currentId === targetId)
      || (currentEmail && targetEmail && currentEmail === targetEmail)
    )
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const emailChanged =
      !editingUserId
      && name === "email"
      && String(formValues.email || "").trim().toLowerCase()
        !== String(value || "").trim().toLowerCase()

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))

    setError("")
    setSuccessMessage("")
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      ...(name === "email" ? { otpInput: "" } : {}),
    }))

    if (emailChanged && otpState.codeHash) {
      resetOtpState({
        type: "warning",
        text: "Email nhận OTP đã thay đổi. Hãy gửi lại mã mới để tiếp tục.",
      })
    }
  }

  const handleOtpInputChange = (value) => {
    setError("")
    setOtpState((prev) => ({
      ...prev,
      input: String(value || "").replace(/\D/g, "").slice(0, 6),
      feedback: prev.feedback?.type === "error" ? null : prev.feedback,
    }))
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      otpInput: "",
    }))
  }

  const validateAdminForm = () => {
    if (!canManageUsers) {
      return "Chỉ tài khoản admin mới được tạo, sửa hoặc xóa tài khoản."
    }

    if (!String(formValues.name || "").trim()) {
      return "Vui lòng nhập tên tài khoản."
    }

    if (!String(formValues.email || "").trim()) {
      return "Vui lòng nhập email."
    }

    if (!isValidEmail(formValues.email)) {
      return "Email không hợp lệ."
    }

    if (!String(formValues.phone || "").trim()) {
      return "Vui lòng nhập số điện thoại."
    }

    if (!editingUserId && !String(formValues.password || "").trim()) {
      return "Vui lòng nhập mật khẩu cho tài khoản mới."
    }

    if (!["USER", "OWNER"].includes(String(formValues.role || "").trim().toUpperCase())) {
      return "Vai trò tài khoản không hợp lệ."
    }

    return ""
  }

  // eslint-disable-next-line no-unused-vars
  const validateOtpRequest = () => {
    if (editingUserId) {
      return "OTP chỉ áp dụng khi tạo tài khoản mới."
    }

    if (!otpEnabled) {
      return otpSetupMessage
    }

    return validateAdminForm()
  }

  const validateAdminFormWithFields = () => {
    const nextFormErrors = createManagedUserFormErrors()
    const normalizedName = String(formValues.name || "").trim()
    const normalizedEmail = String(formValues.email || "").trim()
    const normalizedPhone = String(formValues.phone || "").replace(/\D/g, "")
    const normalizedPassword = String(formValues.password || "")
    const normalizedRole = String(formValues.role || "").trim().toUpperCase()

    if (!canManageUsers) {
      return {
        isValid: false,
        message: "Chỉ tài khoản admin mới được tạo, sửa hoặc xóa tài khoản.",
        fieldErrors: nextFormErrors,
      }
    }

    if (!normalizedName) {
      nextFormErrors.name = "Vui lòng nhập tên tài khoản."
    }

    if (!normalizedEmail) {
      nextFormErrors.email = "Vui lòng nhập email."
    } else if (!isValidEmail(formValues.email)) {
      nextFormErrors.email = "Email không hợp lệ."
    }

    if (!String(formValues.phone || "").trim()) {
      nextFormErrors.phone = "Vui lòng nhập số điện thoại."
    } else if (!/^0\d{9}$/.test(normalizedPhone)) {
      nextFormErrors.phone = "Số điện thoại phải gồm 10 số và bắt đầu bằng số 0."
    }

    if (!editingUserId && !normalizedPassword.trim()) {
      nextFormErrors.password = "Vui lòng nhập mật khẩu cho tài khoản mới."
    } else if (normalizedPassword.trim() && normalizedPassword.length < 6) {
      nextFormErrors.password = "Mật khẩu tối thiểu 6 ký tự."
    }

    if (!["USER", "OWNER"].includes(normalizedRole)) {
      nextFormErrors.role = "Vai trò tài khoản không hợp lệ."
    }

    const firstError = getFirstManagedUserFormError(nextFormErrors)

    return {
      isValid: !firstError,
      message: firstError,
      fieldErrors: nextFormErrors,
    }
  }

  const validateOtpRequestWithFields = () => {
    if (editingUserId) {
      return {
        isValid: false,
        message: "OTP chỉ áp dụng khi tạo tài khoản mới.",
        fieldErrors: createManagedUserFormErrors(),
      }
    }

    if (!otpEnabled) {
      return {
        isValid: false,
        message: otpSetupMessage,
        fieldErrors: createManagedUserFormErrors(),
      }
    }

    return validateAdminFormWithFields()
  }

  const handleRequestOtp = async () => {
    setError("")
    setSuccessMessage("")

    const validationResult = validateOtpRequestWithFields()
    setFormErrors(validationResult.fieldErrors)

    if (!validationResult.isValid) {
      setError(validationResult.message)
      return
    }

    setOtpActionMode("send")

    try {
      const otpResponse = await requestManagedUserOtp({
        email: formValues.email,
        purpose: "admin_create_user",
      })
      const sentAt = Date.now()
      const expiresAtFromApi = Number(otpResponse?.expiresAtMs || 0)
      const expiresInMinutes = Number(otpResponse?.expiresInMinutes || 0)
      const fallbackExpiresAt =
        sentAt + Math.max(expiresInMinutes > 0 ? expiresInMinutes * 60 * 1000 : OTP_EXPIRE_SECONDS * 1000, 1000)
      setOtpState({
        codeHash: "issued",
        input: "",
        verified: false,
        sentAt,
        expiresAt: expiresAtFromApi > sentAt ? expiresAtFromApi : fallbackExpiresAt,
        resendAvailableAt: sentAt + OTP_RESEND_SECONDS * 1000,
        targetEmail: String(otpResponse?.email || formValues.email || "").trim().toLowerCase(),
        feedback: {
          type: "success",
          text: "Mã OTP đã được gửi về email người nhận. Nhập đúng mã để tiếp tục tạo tài khoản.",
        },
      })
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "",
      }))
    } catch (apiError) {
      const message = String(apiError?.message || "Không thể gửi OTP lúc này.").trim()
      setOtpState((prev) => ({
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: message,
        },
      }))
      setError(message)
    } finally {
      setOtpActionMode("")
    }
  }

  const handleVerifyOtp = async () => {
    setError("")
    setSuccessMessage("")
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      otpInput: "",
    }))

    if (!otpState.codeHash) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "Hãy gửi mã OTP trước khi xác nhận.",
      }))
      setOtpState((prev) => ({
        ...prev,
        feedback: {
          type: "error",
          text: "Hãy gửi mã OTP trước khi xác nhận.",
        },
      }))
      return
    }

    if (otpExpired) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "Mã OTP đã hết hạn. Hãy gửi lại mã mới.",
      }))
      setOtpState((prev) => ({
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: "Mã OTP đã hết hạn. Hãy gửi lại mã mới.",
        },
      }))
      return
    }

    if (String(otpState.input || "").trim().length !== 6) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "Vui lòng nhập đủ 6 số OTP.",
      }))
      setOtpState((prev) => ({
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: "Vui lòng nhập đủ 6 số OTP.",
        },
      }))
      return
    }

    setOtpActionMode("verify")

    try {
      await verifyManagedUserOtp({
        email: otpState.targetEmail || formValues.email,
        otp: otpState.input,
        purpose: "admin_create_user",
      })
      const inputHash = String(otpState.input || "").trim()

      if (inputHash === "__local_only__") {
        setFormErrors((currentErrors) => ({
          ...currentErrors,
          otpInput: "Mã OTP không đúng. Vui lòng kiểm tra lại.",
        }))
        setOtpState((prev) => ({
          ...prev,
          verified: false,
          feedback: {
            type: "error",
            text: "Mã OTP không đúng. Vui lòng kiểm tra lại.",
          },
        }))
        return
      }

      setOtpState((prev) => ({
        ...prev,
        verified: true,
        feedback: {
          type: "success",
          text: "OTP đã được xác nhận. Admin có thể tạo tài khoản.",
        },
      }))
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "",
      }))
    } catch (apiError) {
      const message = String(apiError?.message || "Không thể xác nhận OTP lúc này. Vui lòng thử lại.").trim(); setError(message)
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "Không thể xác nhận OTP lúc này. Vui lòng thử lại.",
      }))
      setOtpState((prev) => ({
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: "Không thể xác nhận OTP lúc này. Vui lòng thử lại.",
        },
      }))
    } finally {
      setOtpActionMode("")
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccessMessage("")

    const validationResult = validateAdminFormWithFields()
    setFormErrors(validationResult.fieldErrors)

    if (!validationResult.isValid) {
      setError(validationResult.message)
      setSubmitting(false)
      return
    }

    if (!editingUserId && !otpState.verified) {
      const otpErrorMessage = "Vui lòng xác nhận OTP email trước khi tạo tài khoản."
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: otpErrorMessage,
      }))
      setError(otpErrorMessage)
      setSubmitting(false)
      return
    }

    if (!editingUserId && !otpState.verified) {
      setError("Vui lòng xác nhận OTP email trước khi tạo tài khoản.")
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        ...formValues,
        role: getApiRoleValue(formValues.role),
      }

      if (editingUserId) {
        await updatePublicUser(authToken, editingUserId, payload)
        setSuccessMessage("Cập nhật tài khoản thành công.")
      } else {
        await createPublicUser(authToken, payload)
        setSuccessMessage(`Đã tạo ${getManagedUserRoleLabel(payload.role).toLowerCase()} mới.`)
      }

      await refreshUsers()
      resetForm()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản admin mới được sửa tài khoản.")
      return
    }

    if (isPrimaryAdminEmail(user?.email) || getApiRoleValue(user?.role, user?.email) === "ADMIN") {
      setError("Tài khoản admin chính không chỉnh sửa ở màn này.")
      return
    }

    setEditingUserId(user.id)
    setFormValues({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: "",
      role: getApiRoleValue(user.role, user.email),
    })
    setFormErrors(createManagedUserFormErrors())
    resetOtpState()
    setError("")
    setSuccessMessage("")
  }

  const handleCancelEdit = () => {
    resetForm()
    setError("")
    setSuccessMessage("")
  }

  const handleDeleteUser = async (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản admin mới được xóa tài khoản.")
      return
    }

    if (isCurrentAdminAccount(user)) {
      setError("Không thể xóa tài khoản admin đang đăng nhập.")
      return
    }

    const shouldDelete = window.confirm(`Xóa tài khoản ${user.name}?`)
    if (!shouldDelete) {
      return
    }

    setDeletingUserId(user.id)
    setError("")
    setSuccessMessage("")

    try {
      await deletePublicUser(authToken, user.id)
      await refreshUsers()

      if (editingUserId === user.id) {
        resetForm()
      }

      setSuccessMessage("Xóa tài khoản thành công.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleToggleUserStatus = async (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản admin mới được khóa hoặc mở khóa tài khoản.")
      return
    }

    if (isCurrentAdminAccount(user)) {
      setError("Không thể khóa tài khoản admin đang đăng nhập.")
      return
    }

    const nextLocked = !user.isLocked
    const shouldContinue = window.confirm(
      nextLocked
        ? `Khóa tài khoản ${user.name}?`
        : `Mở khóa tài khoản ${user.name}?`
    )

    if (!shouldContinue) {
      return
    }

    setStatusActionUserId(user.id)
    setStatusActionMode(nextLocked ? "lock" : "unlock")
    setError("")
    setSuccessMessage("")

    try {
      await updatePublicUser(authToken, user.id, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: getApiRoleValue(user.role, user.email),
        isDeleted: nextLocked,
        isActive: !nextLocked,
        locked: nextLocked,
        isLocked: nextLocked,
        status: nextLocked ? "LOCKED" : "ACTIVE",
      })

      const nextUsers = await refreshUsers()
      const refreshedUser = nextUsers.find((item) => item.id === user.id)

      if (refreshedUser && refreshedUser.isLocked !== nextLocked) {
        setError("Backend chưa phản ánh trạng thái khóa/mở khóa mới của tài khoản này.")
        return
      }

      setSuccessMessage(nextLocked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setStatusActionUserId("")
      setStatusActionMode("")
    }
  }

  return {
    users,
    loading,
    error,
    successMessage,
    formValues,
    formErrors,
    submitting,
    deletingUserId,
    statusActionUserId,
    statusActionMode,
    otpEnabled,
    otpSetupMessage,
    otpState,
    otpSummary,
    canResendOtp,
    otpExpired,
    otpActionMode,
    isEditing: Boolean(editingUserId),
    canManageUsers,
    isAuthenticated: Boolean(authToken),
    currentUser,
    roleOptions: ROLE_OPTIONS,
    summary,
    loginPath: ROUTES.login,
    onInputChange: handleInputChange,
    onOtpInputChange: handleOtpInputChange,
    onRequestOtp: handleRequestOtp,
    onVerifyOtp: handleVerifyOtp,
    onSubmit: handleSubmit,
    onEditUser: handleEditUser,
    onCancelEdit: handleCancelEdit,
    onDeleteUser: handleDeleteUser,
    onToggleUserStatus: handleToggleUserStatus,
    onRefresh: refreshUsers,
  }
}
