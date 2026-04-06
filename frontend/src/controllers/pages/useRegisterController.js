import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createRegisterForm, isValidEmail } from "../../models/authModel"
import {
  registerUser,
  requestRegisterOtp,
  verifyRegisterOtp,
} from "../../models/api"
import { ROUTES } from "../../models/routeModel"

const OTP_RESEND_SECONDS = 60
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
    nextFormErrors.phone = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0."
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

const normalizeSuccessOtpMessage = (value, fallback) =>
  String(value || "").trim().toLowerCase() === "success"
    ? fallback
    : String(value || fallback).trim()

export const useRegisterController = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(createRegisterForm)
  const [submitting, setSubmitting] = useState(false)
  const [otpActionMode, setOtpActionMode] = useState("")
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
      const nextForm = {
        ...prev,
        [field]: value,
      }

      if (
        prev[field] !== value
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
      countdownLabel: otpState.code ? formatOtpCountdown(secondsUntilExpiry) : "--:--",
      resendLabel: otpActionMode === "send"
        ? "Đang gửi..."
        : secondsUntilResend > 0
          ? `${secondsUntilResend}s`
          : "Có thể gửi lại",
      canSubmit: otpState.verified,
    }),
    [otpActionMode, otpState.code, otpState.verified, secondsUntilExpiry, secondsUntilResend]
  )

  const handleRequestOtp = async () => {
    setError("")
    setSuccessMessage("")

    const validationResult = validateRegisterFormWithFields(form)
    setFormErrors(validationResult.fieldErrors)

    if (!validationResult.isValid) {
      setError(validationResult.message)
      return
    }

    const normalizedTargetEmail = String(form.email || "").trim().toLowerCase()
    setOtpActionMode("send")
    setOtpState((prev) => ({
      ...prev,
      targetEmail: normalizedTargetEmail,
      verified: false,
      feedback: {
        type: "warning",
        text: "Đang gửi OTP về email. Vui lòng chờ trong giây lát.",
      },
    }))

    try {
      const otpResponse = await requestRegisterOtp({
        email: form.email,
        purpose: "register",
      })
      const sentAt = Date.now()
      const expiresAtFromApi = Number(otpResponse?.expiresAtMs || 0)
      const expiresInMinutes = Number(otpResponse?.expiresInMinutes || 0)
      const fallbackExpiresAt =
        sentAt + Math.max(
          expiresInMinutes > 0 ? expiresInMinutes * 60 * 1000 : OTP_EXPIRE_SECONDS * 1000,
          1000
        )

      setOtpState({
        code: "issued",
        input: "",
        verified: false,
        sentAt,
        expiresAt: expiresAtFromApi > sentAt ? expiresAtFromApi : fallbackExpiresAt,
        resendAvailableAt: sentAt + OTP_RESEND_SECONDS * 1000,
        targetEmail: String(otpResponse?.email || normalizedTargetEmail).trim().toLowerCase(),
        feedback: {
          type: "success",
          text: normalizeSuccessOtpMessage(
            otpResponse?.message,
            "Mã OTP đã được gửi về email. Hãy nhập đúng mã để xác nhận."
          ),
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
        targetEmail: prev.targetEmail || normalizedTargetEmail,
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
    setOtpActionMode("verify")
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      otpInput: "",
    }))

    if (!otpState.code) {
      const message = "Hãy gửi mã OTP trước khi xác nhận."
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: message,
      }))
      setOtpState((prev) => ({
        ...prev,
        feedback: {
          type: "error",
          text: message,
        },
      }))
      setOtpActionMode("")
      return
    }

    if (otpExpired) {
      const message = "Mã OTP đã hết hạn. Hãy gửi lại mã mới."
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: message,
      }))
      setOtpState((prev) => ({
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: message,
        },
      }))
      setOtpActionMode("")
      return
    }

    if (String(otpState.input || "").trim().length !== 6) {
      const message = "Vui lòng nhập đủ 6 số OTP."
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: message,
      }))
      setOtpState((prev) => ({
        ...prev,
        verified: false,
        feedback: {
          type: "error",
          text: message,
        },
      }))
      setOtpActionMode("")
      return
    }

    try {
      const verifyResponse = await verifyRegisterOtp({
        email: otpState.targetEmail || form.email,
        otp: otpState.input,
        purpose: "register",
      })

      setOtpState((prev) => ({
        ...prev,
        verified: true,
        feedback: {
          type: "success",
          text: normalizeSuccessOtpMessage(
            verifyResponse?.message,
            "OTP đã được xác nhận. Bạn có thể đăng ký tài khoản."
          ),
        },
      }))
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: "",
      }))
    } catch (apiError) {
      const message = String(apiError?.message || "Không thể xác nhận OTP lúc này.").trim()
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        otpInput: message,
      }))
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
    otpActionMode,
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
