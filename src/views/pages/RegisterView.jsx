import React from "react"
import { Link } from "react-router-dom"

const RegisterView = ({
  form,
  submitting,
  error,
  successMessage,
  onFieldChange,
  onSubmit,
  loginPath,
}) => {
  return (
    <section className="page section authPage registerPage">
      <div className="container narrowContainer registerContainer">
        <div className="registerHero">
          <div className="registerHeroTop">
            <span className="registerEyebrow">api-be-football</span>
          </div>

          <h1>Đăng ký tài khoản</h1>
          <p className="registerHeroText">
            Tạo tài khoản mới để đăng nhập và làm việc với backend Render hiện tại.
          </p>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Thông tin tài khoản</h2>
              <p>Backend yêu cầu họ tên, email, số điện thoại và mật khẩu.</p>
            </div>
          </div>

          <div className="registerFieldGrid">
            <div className="registerField">
              <label htmlFor="register-full-name">Họ và tên</label>
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
              <label htmlFor="register-phone">Số điện thoại</label>
              <input
                id="register-phone"
                type="text"
                value={form.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                placeholder="09xxxxxxxx"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-password">Mật khẩu</label>
              <input
                id="register-password"
                type="password"
                value={form.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-confirm-password">Xác nhận mật khẩu</label>
              <input
                id="register-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
            </div>
          </div>

          {error && <p className="message error">{error}</p>}
          {successMessage && <p className="message success">{successMessage}</p>}

          <button className="btn registerSubmitBtn" type="submit" disabled={submitting}>
            {submitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="helperText registerFooterText">
          Đã có tài khoản? <Link to={loginPath}>Đăng nhập</Link>
        </p>
      </div>
    </section>
  )
}

export default RegisterView
