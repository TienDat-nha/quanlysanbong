import React from "react"
import { Link } from "react-router-dom"
import { FiArrowRight, FiCheckCircle, FiMail, FiPhone, FiShield, FiUser } from "react-icons/fi"

const ROLE_CONTENT = Object.freeze({
  customer: {
    title: "Người đặt sân",
    description: "Dành cho người cần tìm sân trống, đặt lịch nhanh và theo dõi trạng thái đơn.",
    previewTitle: "Tài khoản đặt sân nhanh",
    previewText:
      "Bạn có thể chọn sân phù hợp, đặt lịch nhanh và theo dõi thanh toán ngay trên một màn hình.",
    icon: <FiUser />,
  },
  admin: {
    title: "Admin / Chủ sân",
    description: "Vai trò admin được backend phân quyền riêng sau khi tài khoản được tạo.",
    previewTitle: "Tài khoản quản lý sân",
    previewText:
      "Backend mới không mở tự đăng ký admin. Tại form này bạn tạo tài khoản người dùng chuẩn, sau đó admin có thể được cấp quyền riêng.",
    icon: <FiShield />,
  },
})

const RegisterView = ({
  form,
  submitting,
  error,
  successMessage,
  roleOptions,
  onFieldChange,
  onSubmit,
  loginPath,
}) => {
  const selectedRoleContent = ROLE_CONTENT[form.role] || ROLE_CONTENT.customer

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
            Tạo tài khoản mới để đặt sân, theo dõi lịch đặt và quá trình thanh toán. Giao diện
            được giữ nguyên, nhưng luồng dữ liệu đã được điều chỉnh theo backend mới.
          </p>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Nhập thông tin cơ bản</h2>
              <p>
                Backend hiện tại dùng tên, email, số điện thoại và mật khẩu. Form giữ nguyên bố
                cục cũ để không ảnh hưởng giao diện.
              </p>
            </div>
          </div>

          <div className="registerRoleGrid">
            {roleOptions.map((option) => {
              const roleContent = ROLE_CONTENT[option.value] || ROLE_CONTENT.customer
              const isSelected = form.role === option.value

              return (
                <label key={option.value} className={`roleCard ${isSelected ? "isSelected" : ""}`.trim()}>
                  <input
                    type="radio"
                    name="register-role"
                    value={option.value}
                    checked={isSelected}
                    onChange={(event) => onFieldChange("role", event.target.value)}
                  />
                  <span className="roleCardIcon" aria-hidden="true">
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

          <div className="registerPreview">
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
              <span>Tạo tài khoản</span>
              <FiArrowRight aria-hidden="true" />
              <span>Đăng nhập</span>
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
                <FiMail />
              </span>
              <div>
                <h2>Thông tin backend mới</h2>
                <p>Luồng đăng ký không còn dùng OTP. Hãy nhập chính xác email và số điện thoại.</p>
              </div>
            </div>

            <div className="registerPreviewFlow">
              <span>
                <FiPhone aria-hidden="true" /> Số điện thoại được dùng cho booking
              </span>
              <FiArrowRight aria-hidden="true" />
              <span>
                <FiCheckCircle aria-hidden="true" /> Đăng nhập ngay sau khi tạo
              </span>
            </div>
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
