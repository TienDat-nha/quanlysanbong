import React from "react"
import RegisterView from "../../views/pages/RegisterView"
import { useRegisterController } from "./useRegisterController"

const RegisterController = () => {
  const {
    form,
    submitting,
    error,
    successMessage,
    loginPath,
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
      loginPath={loginPath}
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
