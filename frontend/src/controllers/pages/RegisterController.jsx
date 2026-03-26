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
    roleOptions,
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
        roleOptions={roleOptions}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
      />
  )
}

export default RegisterController
