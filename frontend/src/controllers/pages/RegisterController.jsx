/**

 * Component điều khiển trang đăng ký
 * 
 * Chức năng:
 * - Kết nối logic đăng ký (useRegisterController hook) với giao diện (RegisterView)
 * - Quản lý dữ liệu form đăng ký (họ tên, email, sdt, mật khẩu)
 * - Quản lý quá trình xác thực OTP
 * - Xử lý sự kiện submit form
 * - Hiển thị lỗi, thông báo thành công
 * 
 * Props: Không có props
 */

import React from "react"
import RegisterView from "../../views/pages/RegisterView"
import { useRegisterController } from "./useRegisterController"

const RegisterController = () => {
  const {
    form,
    submitting,
    error,
    successMessage,
    formErrors,
    loginPath,
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
  } = useRegisterController()

  return (
    <RegisterView
      form={form}
      submitting={submitting}
      error={error}
      successMessage={successMessage}
      formErrors={formErrors}
      loginPath={loginPath}
      otpActionMode={otpActionMode}
      otpState={otpState}
      otpSummary={otpSummary}
      canResendOtp={canResendOtp}
      otpExpired={otpExpired}
      onFieldChange={handleFieldChange}
      onOtpInputChange={handleOtpInputChange}
      onRequestOtp={handleRequestOtp}
      onVerifyOtp={handleVerifyOtp}
      onSubmit={handleSubmit}
    />
  )
}

export default RegisterController
