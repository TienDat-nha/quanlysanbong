import React from "react"
import { Link } from "react-router-dom"

const RegisterView = ({
  form,
  submitting,
  otpSending,
  error,
  successMessage,
  onFieldChange,
  onRequestOtp,
  onSubmit,
  loginPath,
}) => {
  return (
    <section className="page section authPage registerPage">
      <div className="container narrowContainer registerContainer">
        <div className="registerHero">
          <div className="registerHeroTop">
            <span className="registerEyebrow">SanBong</span>
          </div>

          <h1>Dang ky tai khoan</h1>
          <p className="registerHeroText">
            Tao tai khoan moi de dat san, quan ly lich dat va nhan thong bao qua email.
          </p>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Thong tin tai khoan</h2>
              <p>Nhap email, xin ma OTP, sau do hoan tat dang ky.</p>
            </div>
          </div>

          <div className="registerFieldGrid">
            <div className="registerField">
              <label htmlFor="register-full-name">Ho va ten</label>
              <input
                id="register-full-name"
                type="text"
                value={form.fullName}
                onChange={(event) => onFieldChange("fullName", event.target.value)}
                placeholder="Nguyen Van A"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={form.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                placeholder="email@domain.com"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-password">Mat khau</label>
              <input
                id="register-password"
                type="password"
                value={form.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                placeholder="Toi thieu 6 ky tu"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-confirm-password">Xac nhan mat khau</label>
              <input
                id="register-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
                placeholder="Nhap lai mat khau"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-otp">Ma OTP</label>
              <input
                id="register-otp"
                type="text"
                value={form.otp}
                onChange={(event) => onFieldChange("otp", event.target.value)}
                placeholder="Nhap 6 chu so"
              />
            </div>
          </div>

          {error && <p className="message error">{error}</p>}
          {successMessage && <p className="message success">{successMessage}</p>}

          <button
            className="ghostBtn registerOtpBtn"
            type="button"
            onClick={onRequestOtp}
            disabled={otpSending || submitting}
          >
            {otpSending ? "Dang gui OTP..." : "Gui ma OTP"}
          </button>

          <button className="btn registerSubmitBtn" type="submit" disabled={submitting}>
            {submitting ? "Dang tao tai khoan..." : "Dang ky"}
          </button>
        </form>

        <p className="helperText registerFooterText">
          Da co tai khoan? <Link to={loginPath}>Dang nhap</Link>
        </p>
      </div>
    </section>
  )
}

export default RegisterView
