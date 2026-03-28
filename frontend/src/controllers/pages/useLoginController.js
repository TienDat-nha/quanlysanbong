import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  createLoginForm,
  getRoleBasedLoginAccountType,
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
        const actualAccountType = getRoleBasedLoginAccountType(data.user)
        setError(
          actualAccountType === LOGIN_ACCOUNT_TYPES.admin
            ? "T?i kho?n n?y l? Qu?n tr?, kh?ng ph?i Ch? s?n."
            : actualAccountType === LOGIN_ACCOUNT_TYPES.owner
              ? "T?i kho?n n?y l? Ch? s?n, kh?ng ph?i Qu?n tr?."
              : isStaffAccount(data.user)
                ? "T?i kho?n n?y thu?c nh?m qu?n l? s?n."
                : "T?i kho?n n?y l? ng??i d?ng ??t s?n."
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
