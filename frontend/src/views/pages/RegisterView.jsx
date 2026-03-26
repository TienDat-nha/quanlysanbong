import React from "react"
import { Link } from "react-router-dom"
import { FiArrowRight, FiCheckCircle, FiMail, FiPhone, FiShield, FiUser } from "react-icons/fi"

const ROLE_CONTENT = Object.freeze({
  customer: {
    title: "NgÆ°á»i Ä‘áº·t sÃ¢n",
    description: "DÃ nh cho ngÆ°á»i cáº§n tÃ¬m sÃ¢n trá»‘ng, Ä‘áº·t lá»‹ch nhanh vÃ  theo dÃµi tráº¡ng thÃ¡i Ä‘Æ¡n.",
    previewTitle: "TÃ i khoáº£n Ä‘áº·t sÃ¢n nhanh",
    previewText:
      "Báº¡n cÃ³ thá»ƒ chá»n sÃ¢n phÃ¹ há»£p, Ä‘áº·t lá»‹ch nhanh vÃ  theo dÃµi thanh toÃ¡n ngay trÃªn má»™t mÃ n hÃ¬nh.",
    icon: <FiUser />,
  },
  admin: {
    title: "Admin / Chá»§ sÃ¢n",
    description: "Vai trÃ² admin Ä‘Æ°á»£c backend phÃ¢n quyá»n riÃªng sau khi tÃ i khoáº£n Ä‘Æ°á»£c táº¡o.",
    previewTitle: "TÃ i khoáº£n quáº£n lÃ½ sÃ¢n",
    previewText:
      "Backend má»›i khÃ´ng má»Ÿ tá»± Ä‘Äƒng kÃ½ admin. Táº¡i form nÃ y báº¡n táº¡o tÃ i khoáº£n ngÆ°á»i dÃ¹ng chuáº©n, sau Ä‘Ã³ admin cÃ³ thá»ƒ Ä‘Æ°á»£c cáº¥p quyá»n riÃªng.",
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
            <span className="registerStepBadge">HoÃ n táº¥t trong 3 bÆ°á»›c</span>
          </div>

          <h1>ÄÄƒng KÃ½ TÃ i Khoáº£n</h1>
          <p className="registerHeroText">
            Táº¡o tÃ i khoáº£n má»›i Ä‘á»ƒ Ä‘áº·t sÃ¢n, theo dÃµi lá»‹ch Ä‘áº·t vÃ  quÃ¡ trÃ¬nh thanh toÃ¡n. Giao diá»‡n
            Ä‘Æ°á»£c giá»¯ nguyÃªn, nhÆ°ng luá»“ng d? liá»‡u Ä‘Ã£ Ä‘Æ°á»£c Ä‘iá»u chá»‰nh theo backend má»›i.
          </p>
        </div>

        <form className="formCard registerCard" onSubmit={onSubmit}>
          <div className="registerSectionTitle">
            <div>
              <h2>Nháº­p thÃ´ng tin cÆ¡ báº£n</h2>
              <p>
                Backend hiá»‡n táº¡i dÃ¹ng tÃªn, email, sá»‘ Ä‘iá»‡n thoáº¡i vÃ  máº­t kháº©u. Form giá»¯ nguyÃªn bá»‘
                cá»¥c cÅ© Ä‘á»ƒ khÃ´ng áº£nh hÆ°á»Ÿng giao diá»‡n.
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
              <span>Táº¡o tÃ i khoáº£n</span>
              <FiArrowRight aria-hidden="true" />
              <span>ÄÄƒng nháº­p</span>
            </div>
          </div>

          <div className="registerFieldGrid">
            <div className="registerField">
              <label htmlFor="register-full-name">Há» vÃ  tÃªn</label>
              <input
                id="register-full-name"
                type="text"
                value={form.fullName}
                onChange={(event) => onFieldChange("fullName", event.target.value)}
                placeholder="Nguyá»…n VÄƒn A"
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
              <label htmlFor="register-phone">Sá»‘ Ä‘iá»‡n thoáº¡i</label>
              <input
                id="register-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                placeholder="09xxxxxxxx"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-password">Máº­t kháº©u</label>
              <input
                id="register-password"
                type="password"
                value={form.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                placeholder="Tá»‘i thiá»ƒu 6 kÃ½ tá»±"
              />
            </div>

            <div className="registerField">
              <label htmlFor="register-confirm-password">XÃ¡c nháº­n máº­t kháº©u</label>
              <input
                id="register-confirm-password"
                type="password"
                value={form.confirmPassword}
                onChange={(event) => onFieldChange("confirmPassword", event.target.value)}
                placeholder="Nháº­p láº¡i máº­t kháº©u"
              />
            </div>
          </div>

          <div className="formCard registerOtpCard registerOtpSummary">
            <div className="registerOtpHero">
              <span className="registerPreviewIcon" aria-hidden="true">
                <FiMail />
              </span>
              <div>
                <h2>ThÃ´ng tin backend má»›i</h2>
                <p>Luá»“ng Ä‘Äƒng kÃ½ khÃ´ng cÃ²n dÃ¹ng OTP. HÃ£y nháº­p chÃ­nh xÃ¡c email vÃ  sá»‘ Ä‘iá»‡n thoáº¡i.</p>
              </div>
            </div>

            <div className="registerPreviewFlow">
              <span>
                <FiPhone aria-hidden="true" /> Sá»‘ Ä‘iá»‡n thoáº¡i Ä‘Æ°á»£c dÃ¹ng cho booking
              </span>
              <FiArrowRight aria-hidden="true" />
              <span>
                <FiCheckCircle aria-hidden="true" /> ÄÄƒng nháº­p ngay sau khi táº¡o
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
            {submitting ? "Äang táº¡o tÃ i khoáº£n..." : "ÄÄƒng KÃ½"}
          </button>
        </form>

        <p className="helperText registerFooterText">
          ÄÃ£ cÃ³ tÃ i khoáº£n? <Link to={loginPath}>ÄÄƒng nháº­p</Link>
        </p>
      </div>
    </section>
  )
}

export default RegisterView
