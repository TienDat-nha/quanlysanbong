import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  createRegisterForm,
  isValidEmail,
  validateRegisterDetails,
} from "../../models/authModel"
import { registerUser, requestRegisterOtp } from "../../models/api"
import { ROUTES } from "../../models/routeModel"

export const useRegisterController = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(createRegisterForm)
  const [submitting, setSubmitting] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const redirectTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleRequestOtp = async () => {
    const email = String(form.email || "").trim().toLowerCase()

    if (!email) {
      setError("Vui long nhap email truoc khi yeu cau OTP.")
      return
    }

    if (!isValidEmail(email)) {
      setError("Email khong hop le.")
      return
    }

    setOtpSending(true)
    setError("")
    setSuccessMessage("")

    try {
      const data = await requestRegisterOtp({ email })
      setSuccessMessage(
        String(data?.message || "").trim() || "Da gui ma OTP. Vui long kiem tra email."
      )
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setOtpSending(false)
    }
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

    setSubmitting(true)
    try {
      const data = await registerUser({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        otp: form.otp,
        role: form.role,
      })

      setSuccessMessage(
        String(data?.message || "").trim()
        || "Dang ky thanh cong. Dang chuyen sang trang dang nhap..."
      )
      redirectTimeoutRef.current = setTimeout(() => {
        navigate(ROUTES.login, {
          replace: true,
          state: {
            registered: true,
            message: "Dang ky thanh cong. Vui long dang nhap de tiep tuc.",
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
    otpSending,
    error,
    successMessage,
    loginPath: ROUTES.login,
    roleOptions: [
      { value: "customer", label: "Khach dat san" },
      { value: "admin", label: "Admin / Chu san" },
    ],
    handleFieldChange,
    handleRequestOtp,
    handleSubmit,
  }
}
