import React from "react"
import { Link } from "react-router-dom"
import { getFieldTypeSummary } from "../../models/fieldModel"

const FieldDetailView = ({ loading, error, field, formatPrice, createBookingRoute, fieldsPath }) => {
  return (
    <section className="page section">
      <div className="container">
        {loading && <p>Đang tải chi tiết sân...</p>}
        {error && <p className="message error">{error}</p>}

        {!loading && !error && field && (
          <article className="fieldDetail">
            <div className="fieldDetailHeader">
              <h1>{field.name}</h1>
              <p>{field.address}</p>
              <div className="fieldMeta">
                <span>{getFieldTypeSummary(field) || field.type}</span>
                <span>Giờ mở cửa: {field.openHours}</span>
                <span>Giá: {formatPrice(field.pricePerHour)} VND/giờ</span>
                <span>Đánh giá: {field.rating}</span>
              </div>
            </div>

            <p className="fieldArticle">{field.article}</p>

            <div className="galleryGrid">
              {(field.images || []).map((image, index) => (
                <img key={`${field.id}-${index}`} src={image} alt={`${field.name}-${index + 1}`} />
              ))}
            </div>

            <div className="fieldActions">
              <Link className="btn" to={createBookingRoute(field.slug, field.id)}>
                Đặt lịch
              </Link>
              <Link className="outlineBtnLink" to={fieldsPath}>
                Quay lại danh sách
              </Link>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}

export default FieldDetailView
