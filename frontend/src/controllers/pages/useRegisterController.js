import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createRegisterForm, validateRegisterDetails } from "../../models/authModel"
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

export const useRegisterController = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(createRegisterForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
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
    setOtpState((prev) => ({
      ...prev,
      input: String(value || "").replace(/\D/g, "").slice(0, 6),
      feedback: prev.feedback?.type === "error" ? null : prev.feedback,
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

    const validationError = validateRegisterDetails(form)
    if (validationError) {
      setError(validationError)
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

    if (!otpState.code) {
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
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccessMessage("")

    const validationError = validateRegisterDetails(form)
    if (validationError) {
      setError(validationError)
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
