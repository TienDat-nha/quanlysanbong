import React from "react"
import { Link } from "react-router-dom"
import { FiInfo, FiMapPin, FiNavigation, FiRotateCcw, FiSearch } from "react-icons/fi"
import { getFieldTypeSummary } from "../../models/fieldModel"

const FieldsView = ({
  loading,
  error,
  fields,
  totalFields,
  resultCount,
  search,
  searchOptions,
  hasActiveFilters,
  formatPrice,
  createFieldDetailRoute,
  createBookingRoute,
  onSearchChange,
  onResetSearch,
}) => {
  return (
    <section className="page section">
      <div className="container pageHeader usersPageHeader">
        <div>
          <p className="usersEyebrow">Danh sách sân</p>
          <h1>Tìm sân bóng phù hợp</h1>
          <p>
            Người dùng có thể tìm sân theo tên, phường và thành phố trước khi mở lịch đặt
            sân.
          </p>
        </div>
        <div className="usersHighlight">
          <span>Kết quả hiển thị</span>
          <strong>{resultCount}</strong>
        </div>
      </div>

      <div className="container">
        <section className="fieldSearchCard">
          <div className="fieldSearchIntro">
            <div className="fieldSearchHeading">
              <span className="fieldSearchBadge">Lọc nhanh</span>
              <h2>Tìm kiếm nhanh</h2>
              <p className="helperText">
                Nhập tên sân hoặc khu vực để lọc danh sách. Hệ thống hỗ trợ tìm kiếm không
                dấu.
              </p>
            </div>

            <div className="fieldSearchMeta">
              <span className="fieldSearchCount">
                {resultCount}/{totalFields} sân
              </span>
              <p className="fieldSearchHint">Gõ tên sân, phường hoặc thành phố để lọc tức thì.</p>
            </div>
          </div>

          <div className="fieldSearchGrid">
            <label className="fieldSearchInput" htmlFor="field-search-name">
              <span className="fieldSearchLabel">Tên sân</span>
              <span className="fieldSearchControl">
                <span className="fieldSearchInputIcon" aria-hidden="true">
                  <FiSearch />
                </span>
                <input
                  id="field-search-name"
                  type="text"
                  value={search.keyword}
                  onChange={(event) => onSearchChange("keyword", event.target.value)}
                  placeholder="Ví dụ: Phong Phú"
                />
              </span>
            </label>

            <label className="fieldSearchInput" htmlFor="field-search-ward">
              <span className="fieldSearchLabel">Phường</span>
              <span className="fieldSearchControl">
                <span className="fieldSearchInputIcon" aria-hidden="true">
                  <FiMapPin />
                </span>
                <input
                  id="field-search-ward"
                  type="text"
                  list="field-search-ward-options"
                  value={search.ward}
                  onChange={(event) => onSearchChange("ward", event.target.value)}
                  placeholder="Ví dụ: Phường 7"
                />
              </span>
            </label>

            <label className="fieldSearchInput" htmlFor="field-search-city">
              <span className="fieldSearchLabel">Thành phố</span>
              <span className="fieldSearchControl">
                <span className="fieldSearchInputIcon" aria-hidden="true">
                  <FiNavigation />
                </span>
                <input
                  id="field-search-city"
                  type="text"
                  list="field-search-city-options"
                  value={search.city}
                  onChange={(event) => onSearchChange("city", event.target.value)}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
                />
              </span>
            </label>
          </div>

          <datalist id="field-search-ward-options">
            {(searchOptions?.wards || []).map((ward) => (
              <option key={ward} value={ward} />
            ))}
          </datalist>

          <datalist id="field-search-city-options">
            {(searchOptions?.cities || []).map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>

          <div className="fieldSearchFooter">
            <p className="helperText fieldSearchTip">
              <FiInfo aria-hidden="true" />
              <span>
                Có thể nhập một phần tên hoặc địa chỉ, ví dụ `Phong`, `Phường 7`,
                `Hồ Chí Minh`.
              </span>
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="outlineBtnInline fieldSearchReset"
                onClick={onResetSearch}
              >
                <FiRotateCcw aria-hidden="true" />
                Xóa bộ lọc
              </button>
            )}
          </div>
        </section>

        {loading && <p>Đang tải dữ liệu sân...</p>}
        {error && <p className="message error">{error}</p>}

        {!loading && !error && fields.length === 0 && (
          <p className="usersEmptyState fieldSearchEmpty">
            {hasActiveFilters
              ? "Không tìm thấy sân phù hợp với bộ lọc hiện tại. Hãy thử đổi tên sân, phường hoặc thành phố."
              : "Chưa có sân nào để hiển thị."}
          </p>
        )}

        {!loading && !error && fields.length > 0 && (
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
                  <div className="fieldLocationMeta">
                    {field.district && <span>Khu vực: {field.district}</span>}
                    {field.ward && <span>Phường: {field.ward}</span>}
                    {field.city && <span>Thành phố: {field.city}</span>}
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
