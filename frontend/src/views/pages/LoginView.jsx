import React from "react"
import { Link } from "react-router-dom"

const LoginView = ({
  form,
  submitting,
  error,
  infoMessage,
  onFieldChange,
  onSubmit,
  registerPath,
}) => {
  return (
    <section className="page section authPage">
      <div className="container narrowContainer">
        <h1>Dang nhap</h1>
        <p>Dang nhap de dat san, theo doi lich su dat cho va quan ly san cua ban.</p>

        <form className="formCard" onSubmit={onSubmit}>
          {infoMessage && <p className="message success">{infoMessage}</p>}

          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={form.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
            placeholder="email@domain.com"
          />

          <label htmlFor="login-password">Mat khau</label>
          <input
            id="login-password"
            type="password"
            value={form.password}
            onChange={(event) => onFieldChange("password", event.target.value)}
            placeholder="Nhap mat khau"
          />

          {error && <p className="message error">{error}</p>}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Dang xu ly..." : "Dang nhap"}
          </button>
        </form>

        <p className="helperText">
          Chua co tai khoan? <Link to={registerPath}>Dang ky ngay</Link>
        </p>
      </div>
    </section>
  )
}

export default LoginView
