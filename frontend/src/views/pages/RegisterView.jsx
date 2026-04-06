import React from "react"
import { Link } from "react-router-dom"
import { FiArrowRight, FiCheckCircle, FiMail } from "react-icons/fi"

const controlClass = (error, baseClass = "") =>
  `${baseClass}${error ? `${baseClass ? " " : ""}ownerFormControl--error` : ""}`.trim()

const ErrorText = ({ text }) => (text ? <p className="ownerFieldError">{text}</p> : null)

const RegisterView = ({
  form,
  submitting,
  error,
  successMessage,
  formErrors,
  loginPath,
  otpActionMode,
  otpState,
  otpSummary,
  canResendOtp,
  otpExpired,
  onFieldChange,
  onOtpInputChange,
  onRequestOtp,
  onVerifyOtp,
  onSubmit,
}) => {
  const otpFeedbackClass =
    otpState.feedback?.type === "error"
      ? "message error"
      : otpState.feedback?.type === "warning"
        ? "message warning"
        : "message success"

  const otpStatusLabel = otpState.verified
    ? "Đã xác nhận"
    : otpActionMode === "send"
      ? "Đang gửi mã"
      : otpState.feedback?.type === "error" && (otpState.targetEmail || form.email)
        ? "Gửi mã thất bại"
        : otpState.code
          ? otpExpired
            ? "Đã hết hạn"
            : "Đang chờ xác nhận"
          : "Chưa gửi mã"

  return (
    <section className="page section authPage registerPage">
      <div className="container narrowContainer registerContainer">
        <div className="registerHero">
          <div className="registerHeroTop">
            <span className="registerEyebrow">SanBong</span>
            <span className="registerStepBadge">Đăng ký người dùng</span>
          </div>

          <h1>Đăng Ký Tài Khoản Người Dùng</h1>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Nhập thông tin cơ bản</h2>
            </div>
          </div>

          <div className="registerFieldGrid">
            <div className="registerField">
              <label htmlFor="register-full-name">Họ và tên</label>
              <input
                id="register-full-name"
                className={controlClass(formErrors?.fullName)}
                type="text"
                value={form.fullName}
                onChange={(event) => onFieldChange("fullName", event.target.value)}
                placeholder="Nguyễn Văn A"
              />
              <ErrorText text={formErrors?.fullName} />
            </div>

            <div className="registerField">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className={controlClass(formErrors?.email)}
                type="email"
                value={form.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                placeholder="email@domain.com"
              />
              <ErrorText text={formErrors?.email} />
            </div>

            <div className="registerField">
              <label htmlFor="register-phone">Số điện thoại</label>
              <input
                id="register-phone"
                className={controlClass(formErrors?.phone)}
                type="tel"
                required
                value={form.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                placeholder="09xxxxxxxx"
              />
              <ErrorText text={formErrors?.phone} />
            </div>

            <div className="registerField">
              <label htmlFor="register-password">Mật khẩu</label>
              <input
                id="register-password"
                className={controlClass(formErrors?.password)}
                type="password"
                value={form.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
              />
              <ErrorText text={formErrors?.password} />
            </div>

            <div className="registerField">
              <label htmlFor="register-confirm-password">Xác nhận mật khẩu</label>
              <input
                id="register-confirm-password"
                className={controlClass(formErrors?.confirmPassword)}
                type="password"
                value={form.confirmPassword}
                onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
              <ErrorText text={formErrors?.confirmPassword} />
            </div>
          </div>

          <div className="formCard registerOtpCard registerOtpSummary">
            <div className="registerOtpHero">
              <span className="registerPreviewIcon" aria-hidden="true">
                <FiMail />
              </span>
              <div>
                <h2>Xác nhận OTP email</h2>
              </div>
            </div>

            <div className="otpSummary registerOtpMeta">
              <p>
                <strong>Email nhận mã:</strong> {otpState.targetEmail || form.email || "Chưa gửi OTP"}
              </p>
              <p>
                <strong>Trạng thái:</strong> {otpStatusLabel}
              </p>
              <div className="registerOtpStats">
                <span className="registerOtpStat">
                  <FiCheckCircle aria-hidden="true" /> Hết hạn sau: {otpSummary.countdownLabel}
                </span>
                <span className="registerOtpStat">
                  <FiArrowRight aria-hidden="true" /> Gửi lại sau: {otpSummary.resendLabel}
                </span>
              </div>
            </div>

            <div className="registerField otpRow">
              <label htmlFor="register-otp">Mã OTP</label>
              <input
                id="register-otp"
                className={controlClass(formErrors?.otpInput)}
                type="text"
                inputMode="numeric"
                value={otpState.input}
                onChange={(event) => onOtpInputChange(event.target.value)}
                placeholder="Nhập 6 số OTP"
                maxLength={6}
                disabled={submitting || otpActionMode === "send"}
              />
              <ErrorText text={formErrors?.otpInput} />
            </div>

            <div className="otpActionRow registerOtpActions">
              <button
                className="registerOtpBtn"
                type="button"
                onClick={onRequestOtp}
                disabled={submitting || otpActionMode === "verify" || !canResendOtp}
              >
                {otpActionMode === "send"
                  ? "Đang gửi..."
                  : otpState.code
                    ? "Gửi lại OTP"
                    : "Gửi OTP"}
              </button>
              <button
                className="outlineBtnInline"
                type="button"
                onClick={onVerifyOtp}
                disabled={submitting || otpActionMode === "send" || !otpState.code}
              >
                {otpActionMode === "verify"
                  ? "Đang xác nhận..."
                  : otpState.verified
                    ? "Đã xác nhận"
                    : "Xác nhận OTP"}
              </button>
            </div>

            {otpState.feedback?.text && (
              <p className={otpFeedbackClass}>{otpState.feedback.text}</p>
            )}
          </div>

          <div className="registerStatusStack">
            {error && <p className="message error">{error}</p>}
            {successMessage && <p className="message success">{successMessage}</p>}
          </div>

          <button className="btn registerSubmitBtn" type="submit" disabled={submitting || !otpSummary.canSubmit}>
            {submitting
              ? "Đang tạo tài khoản..."
              : otpSummary.canSubmit
                ? "Đăng Ký"
                : "Xác nhận OTP để tiếp tục"}
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
