import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  createLoginForm,
  isOwnerAccount,
  matchesLoginAccountType,
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

      if (!matchesLoginAccountType(data.user, form.accountType)) {
        setError(
          isOwnerAccount(data.user)
            ? "Tài khoản này thuộc nhóm chủ sân / quản trị. Hãy chọn đúng loại đăng nhập."
            : "Tài khoản này là người dùng đặt sân. Hãy chọn đăng nhập người dùng."
        )
        return
      }

      onLoginSuccess?.(data.token, data.user)
      navigate(
        location.state?.from || (isOwnerAccount(data.user) ? ROUTES.adminFields : ROUTES.booking),
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
