import React from "react"
import { Link } from "react-router-dom"
import { FiArrowRight, FiCheckCircle, FiKey, FiMail, FiShield, FiUser } from "react-icons/fi"

const ROLE_CONTENT = Object.freeze({
  customer: {
    title: "Người đặt sân",
    description: "Dành cho người cần tìm sân trống, đặt lịch nhanh và theo dõi trạng thái đơn.",
    previewTitle: "Tài khoản đặt sân nhanh",
    previewText:
      "Bạn có thể chọn sân phù hợp, nhận OTP qua email và giữ lịch dễ dàng ngay trên một màn hình.",
    icon: <FiUser />,
  },
  admin: {
    title: "Admin / Chủ sân",
    description: "Dành cho người quản lý sân, xử lý booking, xác nhận cọc và theo dõi khách hàng.",
    previewTitle: "Tài khoản quản lý sân",
    previewText:
      "Bạn có thể tạo sân, cập nhật lịch trống, xác nhận đặt sân và quản lý thanh toán của khách.",
    icon: <FiShield />,
  },
})

const RegisterView = ({
  form,
  submitting,
  otpSending,
  error,
  successMessage,
  roleOptions,
  onFieldChange,
  onRequestOtp,
  onSubmit,
  loginPath,
}) => {
  const selectedRoleContent = ROLE_CONTENT[form.role] || ROLE_CONTENT.customer
  const isAdminRole = form.role === "admin"

  return (
    <section className="page section authPage registerPage">
      <div className="container narrowContainer registerContainer">
        <div className="registerHero">
          <div className="registerHeroTop">
            <span className="registerEyebrow">SanBong</span>
            <span className="registerStepBadge">Hoàn tất trong 3 bước</span>
          </div>

          <h1>Đăng Ký Tài Khoản</h1>
          <p className="registerHeroText">
            Tạo tài khoản mới để đặt sân, quản lý lịch đặt và nhận thông báo qua email. Chọn đúng
            vai trò để hệ thống hiển thị trải nghiệm phù hợp ngay từ đầu.
          </p>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Chọn vai trò và nhập thông tin</h2>
              <p>
                Bước 1 là chọn đúng loại tài khoản. Sau đó nhập email, nhận OTP và hoàn tất đăng
                ký.
              </p>
            </div>
          </div>

          <div className="registerRoleGrid">
            {roleOptions.map((option) => {
              const roleContent = ROLE_CONTENT[option.value] || ROLE_CONTENT.customer
              const isSelected = form.role === option.value

              return (
                <label
                  key={option.value}
                  className={`roleCard ${isSelected ? "isSelected" : ""} ${
                    option.value === "admin" ? "roleCardAdmin" : ""
                  }`.trim()}
                >
                  <input
                    type="radio"
                    name="register-role"
                    value={option.value}
                    checked={isSelected}
                    onChange={(event) => onFieldChange("role", event.target.value)}
                  />
                  <span
                    className={`roleCardIcon ${option.value === "admin" ? "roleCardIconAdmin" : ""}`}
                    aria-hidden="true"
                  >
                    {roleContent.icon}
                  </span>
                  <span className="roleCardContent">
                    <strong>{roleContent.title}</strong>
                    <small>{roleContent.description}</small>
                  </span>
                  <span className="roleCardCheck" aria-hidden="true" />
                </label>
              )
            })}
          </div>

          <div className={`registerPreview ${isAdminRole ? "isAdmin" : ""}`.trim()}>
            <div className="registerPreviewHeader">
              <span className="registerPreviewIcon" aria-hidden="true">
                {selectedRoleContent.icon}
              </span>
              <div>
                <strong>{selectedRoleContent.previewTitle}</strong>
                <p>{selectedRoleContent.previewText}</p>
              </div>
            </div>

            <div className="registerPreviewFlow">
              <span>{selectedRoleContent.title}</span>
              <FiArrowRight aria-hidden="true" />
              <span>Nhận OTP qua email</span>
              <FiArrowRight aria-hidden="true" />
              <span>Hoàn tất đăng ký</span>
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
                placeholder="Nguyễn Văn A"
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

            <div className="registerField">
              <label htmlFor="register-otp">Mã OTP</label>
              <input
                id="register-otp"
                type="text"
                value={form.otp}
                onChange={(event) => onFieldChange("otp", event.target.value)}
                placeholder="Nhập 6 chữ số"
              />
            </div>
          </div>

          <div className="formCard registerOtpCard registerOtpSummary">
            <div className="registerOtpHero">
              <span className="registerPreviewIcon" aria-hidden="true">
                <FiMail />
              </span>
              <div>
                <h2>Lấy mã OTP xác minh</h2>
                <p>Mã OTP được gửi tới email sau khi bạn bấm nút lấy mã.</p>
              </div>
            </div>

            <div className="registerPreviewFlow">
              <span>
                <FiKey aria-hidden="true" /> Vai trò đang chọn: {selectedRoleContent.title}
              </span>
              <FiArrowRight aria-hidden="true" />
              <span>
                <FiCheckCircle aria-hidden="true" /> Xác minh email
              </span>
            </div>

            <button
              className="ghostBtn registerOtpBtn"
              type="button"
              onClick={onRequestOtp}
              disabled={otpSending || submitting}
            >
              {otpSending ? "Đang gửi OTP..." : "Gửi mã OTP"}
            </button>
          </div>

          {(error || successMessage) && (
            <div className="registerStatusStack">
              {error && <p className="message error">{error}</p>}
              {successMessage && <p className="message success">{successMessage}</p>}
            </div>
          )}

          <button className="btn registerSubmitBtn" type="submit" disabled={submitting}>
            {submitting ? "Đang tạo tài khoản..." : "Đăng Ký"}
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
