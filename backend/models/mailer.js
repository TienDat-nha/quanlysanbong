const nodemailer = require("nodemailer")

const MAIL_PROVIDER = process.env.MAIL_PROVIDER || "smtp"
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@sanbong.local"

const hasConfiguredValue = (value) => {
  const normalized = String(value || "").trim()
  if (!normalized) {
    return false
  }

  return !normalized.startsWith("REPLACE_WITH_")
}

const getSmtpTransporter = () => {
  if (MAIL_PROVIDER !== "smtp") {
    return null
  }

  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT || 587)
  const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true"
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS

  if (
    !hasConfiguredValue(smtpHost)
    || !hasConfiguredValue(smtpUser)
    || !hasConfiguredValue(smtpPass)
  ) {
    return null
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })
}

const smtpTransporter = getSmtpTransporter()

const isEmailConfigured = () => {
  if (MAIL_PROVIDER === "console") {
    return true
  }

  if (MAIL_PROVIDER === "smtp") {
    return Boolean(smtpTransporter)
  }

  return false
}

const sendRegisterOtpEmail = async ({ to, otpCode, expiresMinutes }) => {
  if (MAIL_PROVIDER === "console") {
    // eslint-disable-next-line no-console
    console.log(
      `[MAIL-CONSOLE] Mã OTP đăng ký cho ${to}: ${otpCode} (hết hạn sau ${expiresMinutes} phút)`
    )
    return
  }

  if (MAIL_PROVIDER !== "smtp" || !smtpTransporter) {
    throw new Error("Dịch vụ email chưa được cấu hình.")
  }

  await smtpTransporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: "Mã xác nhận đăng ký tài khoản SanBong",
    text: `Mã xác nhận đăng ký của bạn là ${otpCode}. Mã có hiệu lực trong ${expiresMinutes} phút.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>SanBong - Xác nhận đăng ký</h2>
        <p>Mã xác nhận đăng ký của bạn là:</p>
        <p style="font-size: 26px; font-weight: 700; letter-spacing: 4px; margin: 10px 0;">${otpCode}</p>
        <p>Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>.</p>
        <p>Nếu bạn không thực hiện đăng ký, vui lòng bỏ qua email này.</p>
      </div>
    `,
  })
}

module.exports = {
  isEmailConfigured,
  sendRegisterOtpEmail,
}
