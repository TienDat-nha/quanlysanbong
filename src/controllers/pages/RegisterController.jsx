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
    handleFieldChange,
    handleSubmit,
  } = useRegisterController()

  return (
    <RegisterView
      form={form}
      submitting={submitting}
      error={error}
      successMessage={successMessage}
      loginPath={loginPath}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
    />
  )
}

export default RegisterController
