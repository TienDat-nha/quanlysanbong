import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { createLoginForm, isAdminUser } from "../../models/authModel"
import { loginUser } from "../../models/api"
import { ROUTES } from "../../models/routeModel"

export const useLoginController = ({ onLoginSuccess }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(createLoginForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const infoMessage = location.state?.message
    || (location.state?.registered
      ? "Dang ky thanh cong. Vui long dang nhap de tiep tuc."
      : "")

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const data = await loginUser(form)
      onLoginSuccess?.(data.token, data.user)
      navigate(
        location.state?.from || (isAdminUser(data.user) ? ROUTES.adminFields : ROUTES.booking),
        { replace: true }
      )
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
    infoMessage,
    registerPath: ROUTES.register,
    handleFieldChange,
    handleSubmit,
  }
}
