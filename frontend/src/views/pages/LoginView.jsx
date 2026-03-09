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
        <h1>Đăng Nhập</h1>
        <p>Đăng nhập để đặt sân, theo dõi lịch sử đặt chỗ và quản lý sân của bạn.</p>

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

          <label htmlFor="login-password">Mật khẩu</label>
          <input
            id="login-password"
            type="password"
            value={form.password}
            onChange={(event) => onFieldChange("password", event.target.value)}
            placeholder="Nhập mật khẩu"
          />

          {error && <p className="message error">{error}</p>}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Đang xử lý..." : "Đăng Nhập"}
          </button>
        </form>

        <p className="helperText">
          Chưa có tài khoản? <Link to={registerPath}>Đăng ký ngay</Link>
        </p>
      </div>
    </section>
  )
}

export default LoginView
