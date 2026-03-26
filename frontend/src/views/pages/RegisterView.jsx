import React from "react"
import { Link } from "react-router-dom"
import { FiArrowRight, FiCheckCircle, FiMail, FiPhone, FiShield, FiUser } from "react-icons/fi"

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
            <span className="registerEyebrow">SanBong</span>
            <span className="registerStepBadge">Đăng ký người dùng</span>
          </div>

          <h1>Đăng Ký Tài Khoản Người Dùng</h1>
          <p className="registerHeroText">
            Trang đăng ký chính chỉ dùng để tạo tài khoản người dùng đặt sân. Tài khoản chủ sân và
            admin được cấp từ khu vực quản trị.
          </p>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Nhập thông tin cơ bản</h2>
              <p>
                Sau khi tạo xong, bạn có thể đăng nhập để đặt sân, theo dõi lịch đặt và thanh toán
                trên cùng một tài khoản.
              </p>
            </div>
          </div>

          <div className="registerPreview">
            <div className="registerPreviewHeader">
              <span className="registerPreviewIcon" aria-hidden="true">
                <FiUser />
              </span>
              <div>
                <strong>Tài khoản người dùng</strong>
                <p>Dùng để đăng nhập, đặt sân, theo dõi lịch đặt và thanh toán.</p>
              </div>
            </div>

            <div className="registerPreviewFlow">
              <span>Đăng ký</span>
              <FiArrowRight aria-hidden="true" />
              <span>Đăng nhập</span>
              <FiArrowRight aria-hidden="true" />
              <span>Đặt sân</span>
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
              <label htmlFor="register-phone">Số điện thoại</label>
              <input
                id="register-phone"
                type="tel"
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

          <div className="formCard registerOtpCard registerOtpSummary">
            <div className="registerOtpHero">
              <span className="registerPreviewIcon" aria-hidden="true">
                <FiShield />
              </span>
              <div>
                <h2>Chủ sân và admin</h2>
                <p>
                  Tài khoản chủ sân và admin được tạo từ khu quản trị. Trang này không mở tự đăng
                  ký cho các nhóm quyền đó.
                </p>
              </div>
            </div>

            <div className="registerPreviewFlow">
              <span>
                <FiMail aria-hidden="true" /> Email dùng để đăng nhập
              </span>
              <FiArrowRight aria-hidden="true" />
              <span>
                <FiPhone aria-hidden="true" /> Số điện thoại dùng cho booking
              </span>
              <FiArrowRight aria-hidden="true" />
              <span>
                <FiCheckCircle aria-hidden="true" /> Chủ sân và admin tạo trong khu quản trị
              </span>
            </div>
          </div>

          <div className="registerStatusStack">
            {error && <p className="message error">{error}</p>}
            {successMessage && <p className="message success">{successMessage}</p>}
          </div>

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
