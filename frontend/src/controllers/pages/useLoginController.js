import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  createLoginForm,
  isStaffAccount,
  LOGIN_ACCOUNT_TYPES,
  matchesLoginAccountType,
  normalizeLoginAccountType,
} from "../../models/authModel"
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
      ? "Đăng ký thành công. Vui lòng đăng nhập để tiếp tục."
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
      const requestedAccountType = normalizeLoginAccountType(form.accountType)

      if (!matchesLoginAccountType(data.user, requestedAccountType)) {
        setError(
          isStaffAccount(data.user)
            ? "Tài khoản này thuộc nhóm quản lý sân."
            : "Tài khoản này là người dùng đặt sân."
        )
        return
      }

      const fallbackPath =
        requestedAccountType === LOGIN_ACCOUNT_TYPES.admin
          ? ROUTES.adminUsers
          : requestedAccountType === LOGIN_ACCOUNT_TYPES.owner
            ? ROUTES.adminFields
            : ROUTES.booking

      onLoginSuccess?.(data.token, data.user, requestedAccountType)
      navigate(location.state?.from || fallbackPath, { replace: true })
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
