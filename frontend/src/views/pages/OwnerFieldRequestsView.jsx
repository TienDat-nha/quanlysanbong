import React from "react"
import "./OwnerFieldRequestsView.scss"

const OwnerFieldRequestsView = ({
  fields = [],
  loading = false,
  error = null,
  filterStatus = "PENDING",
  setFilterStatus = () => {},
  stats = {},
}) => {
  const statusOptions = [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chờ duyệt" },
    { value: "APPROVED", label: "Đã duyệt" },
    { value: "REJECTED", label: "Bị từ chối" },
  ]

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "PENDING":
        return "pending"
      case "APPROVED":
        return "approved"
      case "REJECTED":
        return "rejected"
      default:
        return ""
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "Chờ duyệt"
      case "APPROVED":
        return "Đã duyệt"
      case "REJECTED":
        return "Bị từ chối"
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="owner-field-requests-container loading">
        <div className="spinner"></div>
        <p>Đang tải yêu cầu sân...</p>
      </div>
    )
  }

  return (
    <div className="owner-field-requests-container">
      <div className="section-header">
        <h1>Yêu cầu tạo sân của tôi</h1>
        <p>Theo dõi trạng thái các yêu cầu tạo sân của bạn</p>
      </div>

      {error && (
        <div className="error">
          <strong>Lỗi!</strong>
          <p>{error}</p>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Tổng cộng</div>
          <div className="stat-value total">{stats.total || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chờ duyệt</div>
          <div className="stat-value pending">{stats.pending || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Đã duyệt</div>
          <div className="stat-value approved">{stats.approved || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bị từ chối</div>
          <div className="stat-value rejected">{stats.rejected || 0}</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filters-section">
        <label>Lọc theo trạng thái</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Requests Grid */}
      {fields.length === 0 ? (
        <div className="empty-state">
          <p>
            {filterStatus === "ALL"
              ? "Bạn chưa tạo yêu cầu sân nào"
              : `Không có yêu cầu sân nào ở trạng thái "${getStatusLabel(filterStatus)}"`}
          </p>
        </div>
      ) : (
        <div className="requests-grid">
          {fields.map((field) => (
            <div key={field?.id || field?._id} className="request-card">
              {/* Field Image */}
              <div className="field-image-wrapper">
                {field?.coverImage ? (
                  <img src={field.coverImage} alt={field.name} />
                ) : (
                  <div className="placeholder-image">
                    <span>Không có ảnh</span>
                  </div>
                )}
                <div
                  className={`status-badge status-${getStatusBadgeClass(
                    field?.status
                  )}`}
                >
                  {getStatusLabel(field?.status)}
                </div>
              </div>

              {/* Field Content */}
              <div className="field-content">
                <h3 className="field-name">{field?.name}</h3>

                <div className="field-info">
                  <div className="info-item">
                    <span className="label">Địa chỉ:</span>
                    <span className="value">
                      {field?.address || "Chưa xác định"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Quận/Huyện:</span>
                    <span className="value">
                      {field?.district || "Chưa xác định"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Giá/giờ:</span>
                    <span className="value">
                      {field?.pricePerHour ? `${field.pricePerHour.toLocaleString()} VND` : "Chưa xác định"}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Loại sân:</span>
                    <span className="value">
                      {field?.type || "Chưa xác định"}
                    </span>
                  </div>
                </div>

                {/* Rejection Reason */}
                {field?.status === "REJECTED" && field?.rejectReason && (
                  <div className="rejection-reason">
                    <strong>Lý do từ chối:</strong>
                    <p>{field.rejectReason}</p>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="status-info">
                  <p className="status-text">
                    {field?.status === "PENDING" &&
                      "⏳ Yêu cầu của bạn đang chờ Admin duyệt. Vui lòng chờ trong vài ngày."}
                    {field?.status === "APPROVED" &&
                      "✅ Yêu cầu của bạn đã được phê duyệt! Sân của bạn sẽ sớm xuất hiện trên hệ thống."}
                    {field?.status === "REJECTED" &&
                      "❌ Yêu cầu của bạn bị từ chối. Vui lòng kiểm tra lý do và tạo yêu cầu mới."}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default OwnerFieldRequestsView
