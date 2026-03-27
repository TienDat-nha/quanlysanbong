import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createRegisterForm, isValidEmail } from "../../models/authModel"
import { registerUser } from "../../models/api"
import { ROUTES } from "../../models/routeModel"

const OTP_RESEND_SECONDS = 45
const OTP_EXPIRE_SECONDS = 300

const createInitialOtpState = () => ({
  code: "",
  input: "",
  verified: false,
  sentAt: 0,
  expiresAt: 0,
  resendAvailableAt: 0,
  targetEmail: "",
  feedback: null,
})

const createMockOtpCode = () => String(Math.floor(100000 + Math.random() * 900000))

const formatOtpCountdown = (value) => {
  const totalSeconds = Math.max(0, Number(value || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

const createRegisterFormErrors = () => ({
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  otpInput: "",
})

const getFirstRegisterFormError = (fieldErrors = {}) =>
  Object.values(fieldErrors).find((value) => String(value || "").trim()) || ""

const validateRegisterFormWithFields = (form) => {
  const nextFormErrors = createRegisterFormErrors()
  const fullName = String(form.fullName || "").trim()
  const email = String(form.email || "").trim().toLowerCase()
  const phone = String(form.phone || "").replace(/\D/g, "")
  const password = String(form.password || "")
  const confirmPassword = String(form.confirmPassword || "")

  if (!fullName) {
    nextFormErrors.fullName = "Vui lòng nhập họ và tên."
  }

  if (!email) {
    nextFormErrors.email = "Vui lòng nhập email."
  } else if (!isValidEmail(email)) {
    nextFormErrors.email = "Email không hợp lệ."
  }

  if (!String(form.phone || "").trim()) {
    nextFormErrors.phone = "Vui lòng nhập số điện thoại."
  } else if (!/^0\d{9}$/.test(phone)) {
    nextFormErrors.phone = "Số điện thoại phải gồm 10 số và bắt đầu bằng số 0."
  }

  if (!password) {
    nextFormErrors.password = "Vui lòng nhập mật khẩu."
  } else if (password.length < 6) {
    nextFormErrors.password = "Mật khẩu tối thiểu 6 ký tự."
  }

  if (!confirmPassword) {
    nextFormErrors.confirmPassword = "Vui lòng nhập lại mật khẩu."
  } else if (password && password !== confirmPassword) {
    nextFormErrors.confirmPassword = "Xác nhận mật khẩu không khớp."
  }

  const firstError = getFirstRegisterFormError(nextFormErrors)

  return {
    isValid: !firstError,
    message: firstError,
    fieldErrors: nextFormErrors,
  }
}

export const useRegisterController = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(createRegisterForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [formErrors, setFormErrors] = useState(createRegisterFormErrors)
  const [otpState, setOtpState] = useState(createInitialOtpState)
  const [now, setNow] = useState(Date.now())
  const redirectTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const resetOtpState = (feedback = null) => {
    setOtpState({
      ...createInitialOtpState(),
      feedback,
    })
  }

  const handleFieldChange = (field, value) => {
    setError("")
    setSuccessMessage("")
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
      ...(field === "password" ? { confirmPassword: "" } : {}),
      ...(field === "email" ? { otpInput: "" } : {}),
    }))

    setForm((prev) => {
      const nextValue = value
      const nextForm = {
        ...prev,
        [field]: nextValue,
      }

      if (
        prev[field] !== nextValue
        && ["fullName", "email", "phone", "password", "confirmPassword"].includes(field)
        && otpState.code
      ) {
        resetOtpState({
          type: "warning",
          text: "Thông tin đăng ký đã thay đổi. Hãy gửi lại mã OTP để tiếp tục.",
        })
      }

      return nextForm
    })
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

  const secondsUntilResend = Math.max(
    0,
    Math.ceil((otpState.resendAvailableAt - now) / 1000)
  )
  const secondsUntilExpiry = Math.max(0, Math.ceil((otpState.expiresAt - now) / 1000))
  const canResendOtp = !otpState.code || secondsUntilResend <= 0
  const otpExpired = Boolean(otpState.code) && secondsUntilExpiry <= 0 && !otpState.verified

  useEffect(() => {
    if (!otpExpired) {
      return
    }

    setOtpState((prev) => {
      if (!prev.code || prev.verified) {
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

  const otpSummary = useMemo(
    () => ({
      countdownLabel: formatOtpCountdown(secondsUntilExpiry),
      resendLabel: secondsUntilResend > 0 ? `${secondsUntilResend}s` : "Có thể gửi lại",
      canSubmit: otpState.verified,
    }),
    [otpState.verified, secondsUntilExpiry, secondsUntilResend]
  )

  const handleRequestOtp = () => {
    setError("")
    setSuccessMessage("")

    const validationResult = validateRegisterFormWithFields(form)
    setFormErrors(validationResult.fieldErrors)

    if (!validationResult.isValid) {
      setError(validationResult.message)
      return
    }

    const nextCode = createMockOtpCode()
    const sentAt = Date.now()

    setOtpState({
      code: nextCode,
      input: "",
      verified: false,
      sentAt,
      expiresAt: sentAt + OTP_EXPIRE_SECONDS * 1000,
      resendAvailableAt: sentAt + OTP_RESEND_SECONDS * 1000,
      targetEmail: String(form.email || "").trim().toLowerCase(),
      feedback: {
        type: "success",
        text: "Mã OTP demo đã được tạo. Hãy nhập đúng mã để hoàn tất xác nhận.",
      },
    })
  }

  const handleVerifyOtp = () => {
    setError("")
    setSuccessMessage("")
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      otpInput: "",
    }))

    if (!otpState.code) {
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

    if (String(otpState.input || "").trim() !== String(otpState.code || "").trim()) {
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
        text: "OTP đã được xác nhận. Bạn có thể đăng ký tài khoản.",
      },
    }))
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      otpInput: "",
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    const validationResult = validateRegisterFormWithFields(form)
    setFormErrors(validationResult.fieldErrors)

    if (!validationResult.isValid) {
      setError(validationResult.message)
      return
    }

    if (!otpState.verified) {
      const otpErrorMessage = "Vui lòng xác nhận OTP trước khi đăng ký."
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: otpErrorMessage,
      }))
      setError(otpErrorMessage)
      return
    }

    if (!otpState.verified) {
      setError("Vui lòng xác nhận OTP trước khi đăng ký.")
      return
    }

    setSubmitting(true)
    try {
      const data = await registerUser({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      })

      setSuccessMessage(
        String(data?.message || "").trim()
          || "Đăng ký thành công. Đang chuyển sang trang đăng nhập..."
      )
      redirectTimeoutRef.current = setTimeout(() => {
        navigate(ROUTES.login, {
          replace: true,
          state: {
            registered: true,
            message: "Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.",
          },
        })
      }, 1200)
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    form,
    submitting,
    error,
    successMessage,
    formErrors,
    loginPath: ROUTES.login,
    otpState,
    otpSummary,
    canResendOtp,
    otpExpired,
    handleFieldChange,
    handleOtpInputChange,
    handleRequestOtp,
    handleVerifyOtp,
    handleSubmit,
  }
}
