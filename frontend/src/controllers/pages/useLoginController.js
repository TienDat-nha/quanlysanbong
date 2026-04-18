/**

 * Hook quản lý logic đăng nhập
 * 
 * Chức năng:
 * - Quản lý form đăng nhập (email, password, loại tài khoản)
 * - Xác thực dữ liệu form
 * - Gọi API loginUser để xác thực tài khoản
 * - Kiểm tra loại tài khoản khớp với yêu cầu (admin, owner, customer)
 * - Lưu token xác thực vào localStorage
 * - Xử lý các lỗi đăng nhập
 * - Chuyển hướng đến trang chủ phù hợp sau khi đăng nhập thành công
 * 
 * Trả về:
 * - form: Dữ liệu form đăng nhập
 * - submitting: Trạng thái đang gửi request
 * - error: Thông báo lỗi
 * - infoMessage: Thông báo thông tin (ví dụ: đăng ký thành công)
 * - handleFieldChange: Hàm cập nhật giá trị form
 * - handleSubmit: Hàm xử lý submit form
 */

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
            ? "Tài khoản này là Quản trị, không phải Chủ sân."
            : actualAccountType === LOGIN_ACCOUNT_TYPES.owner
              ? "Tài khoản này là Chủ sân, không phải Quản trị."
              : isStaffAccount(data.user)
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
