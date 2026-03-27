import React from "react"
import { Link } from "react-router-dom"
import { FiMapPin, FiShield, FiUser } from "react-icons/fi"
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
    title: "Chủ sân",
    description: "Dành cho tài khoản quản lý sân, đặt sân thủ công và theo dõi đơn của khách.",
    icon: <FiMapPin />,
    iconClassName: "roleCardIcon",
  },
  {
    value: LOGIN_ACCOUNT_TYPES.admin,
    title: "Admin",
    description: "Dành cho tài khoản quản trị tài khoản và khu vực quản lý sân trong admin.",
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
  const selectedOption =
    LOGIN_OPTIONS.find((option) => option.value === form.accountType) || LOGIN_OPTIONS[0]
  const isCustomerMode = form.accountType === LOGIN_ACCOUNT_TYPES.customer

  return (
    <section className="page section authPage">
      <div className="container narrowContainer">
        <h1>{`Đăng Nhập ${selectedOption.title}`}</h1>
        <p>
          Chọn đúng loại tài khoản trước khi đăng nhập. Backend hiện gộp Chủ sân và Admin chung
          một nhóm quyền, nên frontend sẽ dựa vào lựa chọn đăng nhập để mở đúng khu vực làm việc.
        </p>

        <form className="formCard" onSubmit={onSubmit}>
          {infoMessage && <p className="message success">{infoMessage}</p>}

          <div className="registerSectionTitle">
            <div>
              <h2>Loại đăng nhập</h2>
              <p>
                {isCustomerMode
                  ? "Dùng cho tài khoản người dùng đặt sân được đăng ký ở giao diện chính."
                  : selectedOption.value === LOGIN_ACCOUNT_TYPES.owner
                    ? "Dùng cho tài khoản Chủ sân cần đặt sân thủ công, quản lý sân và đơn của khách."
                    : "Dùng cho tài khoản Admin quản lý tài khoản, quản lý sân và danh sách sân."}
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
            {submitting ? "Đang xử lý..." : `Đăng Nhập ${selectedOption.title}`}
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
