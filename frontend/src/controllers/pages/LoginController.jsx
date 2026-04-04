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
