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
        <h1>Đăng nhập</h1>
        <p>Đăng nhập bằng email hoặc số điện thoại để làm việc với backend api-be-football.</p>

        <form className="formCard" onSubmit={onSubmit}>
          {infoMessage && <p className="message success">{infoMessage}</p>}

          <label htmlFor="login-username">Email hoặc số điện thoại</label>
          <input
            id="login-username"
            type="text"
            value={form.username}
            onChange={(event) => onFieldChange("username", event.target.value)}
            placeholder="email@domain.com hoặc 09xxxxxxxx"
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
            {submitting ? "Đang xử lý..." : "Đăng nhập"}
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
