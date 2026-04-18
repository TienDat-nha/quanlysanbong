/**
 * Component điều khiển trang đăng nhập
 * 
 * Chức năng:
 * - Kết nối logic đăng nhập (useLoginController hook) với giao diện (LoginView)
 * - Quản lý dữ liệu form đăng nhập (email, password, accountType)
 * - Xử lý sự kiện submit form
 * - Hiển thị lỗi hoặc thông báo thành công
 * - Hỗ trợ 3 loại tài khoản: Người dùng, Chủ sân, Admin
 * 
 * Props:
 * - onLoginSuccess: Hàm được gọi khi đăng nhập thành công
 */

import React from "react"
import LoginView from "../../views/pages/LoginView"
import { useLoginController } from "./useLoginController"

const LoginController = ({ onLoginSuccess }) => {
  const {
    form,
    submitting,
    error,
    infoMessage,
    registerPath,
    handleFieldChange,
    handleSubmit,
  } = useLoginController({ onLoginSuccess })

  return (
    <LoginView
      form={form}
      submitting={submitting}
      error={error}
      infoMessage={infoMessage}
      registerPath={registerPath}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
    />
  )
}

export default LoginController
