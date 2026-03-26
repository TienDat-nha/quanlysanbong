import React from "react"
import { Link } from "react-router-dom"
import { FiShield, FiUser } from "react-icons/fi"
import { LOGIN_ACCOUNT_TYPES } from "../../models/authModel"

const LOGIN_OPTIONS = Object.freeze([
  {
    value: LOGIN_ACCOUNT_TYPES.customer,
    title: "Người dùng",
    description: "Dành cho tài khoản đặt sân và theo dõi lịch đặt.",
    icon: <FiUser />,
    iconClassName: "roleCardIcon",
  },
  {
    value: LOGIN_ACCOUNT_TYPES.owner,
    title: "Chủ sân / Admin",
    description: "Dành cho tài khoản quản lý sân hoặc tài khoản quản trị được cấp sẵn.",
    icon: <FiShield />,
    iconClassName: "roleCardIcon roleCardIconAdmin",
  },
])

const LoginView = ({
  form,
  submitting,
  error,
  infoMessage,
  onFieldChange,
  onSubmit,
  registerPath,
}) => {
  const isOwnerMode = form.accountType === LOGIN_ACCOUNT_TYPES.owner

  return (
    <section className="page section authPage">
      <div className="container narrowContainer">
        <h1>{isOwnerMode ? "Đăng Nhập Chủ Sân / Admin" : "Đăng Nhập Người Dùng"}</h1>
        <p>
          Chọn đúng loại tài khoản trước khi đăng nhập. Người dùng đặt sân và chủ sân dùng chung
          backend đăng nhập nhưng được điều hướng sang khu vực khác nhau.
        </p>

        <form className="formCard" onSubmit={onSubmit}>
          {infoMessage && <p className="message success">{infoMessage}</p>}

          <div className="registerSectionTitle">
            <div>
              <h2>Loại đăng nhập</h2>
              <p>
                {isOwnerMode
                  ? "Dùng cho tài khoản chủ sân hoặc tài khoản quản trị được DB cấp."
                  : "Dùng cho tài khoản người dùng đặt sân được đăng ký ở giao diện chính."}
              </p>
            </div>
          </div>

          <div className="registerRoleGrid loginRoleGrid">
            {LOGIN_OPTIONS.map((option) => {
              const isSelected = form.accountType === option.value

              return (
                <label
                  key={option.value}
                  className={`roleCard loginRoleCard ${isSelected ? "isSelected" : ""}`.trim()}
                >
                  <input
                    type="radio"
                    name="login-account-type"
                    value={option.value}
                    checked={isSelected}
                    onChange={(event) => onFieldChange("accountType", event.target.value)}
                  />
                  <span className={option.iconClassName} aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="roleCardContent">
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                  </span>
                  <span className="roleCardCheck" aria-hidden="true" />
                </label>
              )
            })}
          </div>

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
            {submitting
              ? "Đang xử lý..."
              : isOwnerMode
                ? "Đăng Nhập Chủ Sân / Admin"
                : "Đăng Nhập Người Dùng"}
          </button>
        </form>

        <p className="helperText">
          Chưa có tài khoản người dùng? <Link to={registerPath}>Đăng ký ngay</Link>
        </p>
      </div>
    </section>
  )
}

export default LoginView
