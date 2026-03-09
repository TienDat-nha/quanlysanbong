import React from "react"
import RegisterView from "../../views/pages/RegisterView"
import { useRegisterController } from "./useRegisterController"

const RegisterController = () => {
  const {
    form,
    submitting,
    otpSending,
    error,
    successMessage,
    loginPath,
    roleOptions,
    handleFieldChange,
    handleRequestOtp,
    handleSubmit,
  } = useRegisterController()

  return (
    <RegisterView
      form={form}
      submitting={submitting}
      otpSending={otpSending}
      error={error}
      successMessage={successMessage}
      loginPath={loginPath}
      roleOptions={roleOptions}
      onFieldChange={handleFieldChange}
      onRequestOtp={handleRequestOtp}
      onSubmit={handleSubmit}
    />
  )
}

export default RegisterController
