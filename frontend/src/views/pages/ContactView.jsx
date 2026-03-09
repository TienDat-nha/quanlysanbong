import React from "react"

const ContactView = ({ form, submitting, feedback, onFieldChange, onSubmit }) => {
  return (
    <section className="page section">
      <div className="container pageHeader">
        <h1>Liên hệ</h1>
        <p>Gửi thông tin cho chúng tôi để được hỗ trợ đặt sân nhanh nhất.</p>
      </div>

      <div className="container narrowContainer">
        <form className="formCard" onSubmit={onSubmit}>
          <label htmlFor="contact-name">Họ và tên</label>
          <input
            id="contact-name"
            type="text"
            value={form.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="Nguyễn Văn A"
          />

          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
            placeholder="email@domain.com"
          />

          <label htmlFor="contact-phone">Số điện thoại</label>
          <input
            id="contact-phone"
            type="text"
            value={form.phone}
            onChange={(event) => onFieldChange("phone", event.target.value)}
            placeholder="09xxxxxxxx"
          />

          <label htmlFor="contact-message">Nội dung</label>
          <textarea
            id="contact-message"
            value={form.message}
            onChange={(event) => onFieldChange("message", event.target.value)}
            placeholder="Cần tư vấn lịch đặt cho đội bóng..."
            rows={5}
          />

          {feedback.text && (
            <p className={feedback.type === "error" ? "message error" : "message success"}>
              {feedback.text}
            </p>
          )}

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi liên hệ"}
          </button>
        </form>
      </div>
    </section>
  )
}

export default ContactView
