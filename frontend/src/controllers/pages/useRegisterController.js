import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  createRegisterForm,
  REGISTER_ROLE_OPTIONS,
  validateRegisterDetails,
} from "../../models/authModel"
import { registerUser } from "../../models/api"
import { ROUTES } from "../../models/routeModel"

export const useRegisterController = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(createRegisterForm)
  const [submitting, setSubmitting] = useState(false)
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
    roleOptions: REGISTER_ROLE_OPTIONS,
    handleFieldChange,
    handleSubmit,
  }
}
