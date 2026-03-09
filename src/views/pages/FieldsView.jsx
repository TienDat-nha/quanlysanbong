import React from "react"
import { Link } from "react-router-dom"
import { getFieldTypeSummary } from "../../models/fieldModel"

const FieldsView = ({
  loading,
  error,
  fields,
  formatPrice,
  createFieldDetailRoute,
  createBookingRoute,
}) => {
  return (
    <section className="page section">
      <div className="container pageHeader">
        <h1>Danh sách sân bóng</h1>
        <p>Chọn sân phù hợp, xem chi tiết và bấm Đặt lịch để mở bảng thời gian của sân đó.</p>
      </div>

      <div className="container">
        {loading && <p>Đang tải dữ liệu sân...</p>}
        {error && <p className="message error">{error}</p>}

        {!loading && !error && (
          <div className="fieldGrid">
            {fields.map((field) => (
              <article className="fieldCard" key={field.id}>
                <img src={field.coverImage} alt={field.name} />
                <div className="fieldCardBody">
                  <h3>{field.name}</h3>
                  <p>{field.address}</p>
                  <p>{getFieldTypeSummary(field) || field.type}</p>
                  <div className="fieldMeta">
                    <span>Đánh giá: {field.rating}</span>
                    <span>{formatPrice(field.pricePerHour)} VND/giờ</span>
                  </div>
                  <div className="fieldActions">
                    <Link className="btn smallBtn" to={createFieldDetailRoute(field.id)}>
                      Xem bài viết và ảnh
                    </Link>
                    <Link className="outlineBtnLink" to={createBookingRoute(field.slug)}>
                      Đặt lịch
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default FieldsView
