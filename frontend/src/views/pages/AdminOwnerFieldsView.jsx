/**
 * Giao diện trang quản lý sân chủ sân (Admin)
 * 
 * Chức năng:
 * - Hiển thị danh sách sân với thông tin: Tên sân, Địa chỉ, Chủ sân, Trạng thái duyệt
 * - Hiển thị bộ lọc theo trạng thái duyệt (Chờ duyệt, Đã duyệt, Đã khóa, Từ chối)
 * - Hiển thị hình ảnh sân (nếu có)
 * - Hiển thị nút Duyệt, Từ chối, Khóa, Mở khóa
 * - Hiển thị badge trạng thái với màu sắc khác nhau
 * - Hiển thị modal để xác nhận hành động
 * - Hiển thị trạng thái tải, lỗi
 * 
 * Props:
 * - fields: Danh sách sân
 * - loading: Trạng thái đang tải
 * - error: Thông báo lỗi
 * - filterApprovalStatus: Bộ lọc hiện tại
 * - setFilterApprovalStatus: Hàm thay đổi bộ lọc
 * - actionLoading: Trạng thái đang thực hiện action
 * - Các hàm xử lý duyệt, từ chối, khóa, mở khóa
 */

import React, { useMemo, useState } from "react"
import {
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiFileText,
  FiImage,
  FiLock,
  FiMapPin,
  FiSlash,
  FiUnlock,
  FiUser,
} from "react-icons/fi"
import "./AdminOwnerFieldsView.scss"

const APPROVAL_STATUS_META = Object.freeze({
  PENDING: {
    label: "Chờ duyệt",
    badgeLabel: "Chờ duyệt",
    tone: "pending",
    icon: <FiClock />,
  },
  APPROVED: {
    label: "Đã duyệt",
    badgeLabel: "Đã duyệt",
    tone: "approved",
    icon: <FiCheckCircle />,
  },
  LOCKED: {
    label: "Đã khóa",
    badgeLabel: "Đã khóa",
    tone: "locked",
    icon: <FiLock />,
  },
  REJECTED: {
    label: "Từ chối",
    badgeLabel: "Từ chối",
    tone: "rejected",
    icon: <FiSlash />,
  },
})

const getApprovalStatusKey = (field) => {
  const rawStatus = String(field?.status || field?.approvalStatus || "")
    .trim()
    .toUpperCase()

  if (rawStatus === "REJECTED") {
    return "REJECTED"
  }

  if (rawStatus === "LOCKED" || field?.isLocked || field?.locked) {
    return "LOCKED"
  }

  if (rawStatus === "APPROVED" || rawStatus === "ACTIVE") {
    return "APPROVED"
  }

  if (rawStatus === "PENDING") {
    return "PENDING"
  }

  return "PENDING"
}

const getApprovalStatusMeta = (field) =>
  APPROVAL_STATUS_META[getApprovalStatusKey(field)] || APPROVAL_STATUS_META.PENDING

const formatPrice = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const getFieldAddress = (field) =>
  [field?.address, field?.district, field?.city]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ")

const getFieldType = (field) => {
  const directType = String(field?.type || "").trim()
  if (directType) {
    return directType
  }

  const firstSubFieldType = String(field?.subFields?.[0]?.type || "").trim()
  return firstSubFieldType || "Chưa cập nhật"
}

const getSummaryCards = (fields = []) => [
  {
    key: "total",
    label: "Đang hiển thị",
    value: fields.length,
    tone: "neutral",
    icon: <FiFileText />,
  },
  {
    key: "pending",
    label: "Chờ duyệt",
    value: fields.filter((field) => getApprovalStatusKey(field) === "PENDING").length,
    tone: "pending",
    icon: <FiClock />,
  },
  {
    key: "approved",
    label: "Đã duyệt",
    value: fields.filter((field) => getApprovalStatusKey(field) === "APPROVED").length,
    tone: "approved",
    icon: <FiCheckCircle />,
  },
  {
    key: "locked",
    label: "Đã khóa",
    value: fields.filter((field) => getApprovalStatusKey(field) === "LOCKED").length,
    tone: "locked",
    icon: <FiLock />,
  },
]

const AdminOwnerFieldsView = ({
  fields = [],
  loading = false,
  error = null,
  filterApprovalStatus = "ALL",
  setFilterApprovalStatus = () => {},
  handleApproveField = () => {},
  handleRejectField = () => {},
  handleLockField = () => {},
  handleUnlockField = () => {},
  actionLoading = null,
}) => {
  const [rejectReason, setRejectReason] = useState("")
  const [rejectFieldId, setRejectFieldId] = useState(null)
  const [failedImages, setFailedImages] = useState({})

  const approvalStatuses = [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chờ duyệt" },
    { value: "APPROVED", label: "Đã duyệt" },
    { value: "LOCKED", label: "Đã khóa" },
    { value: "REJECTED", label: "Bị từ chối" },
  ]

  const selectedFilterLabel =
    approvalStatuses.find((status) => status.value === filterApprovalStatus)?.label || "Tất cả"

  const summaryCards = useMemo(() => getSummaryCards(fields), [fields])

  const markImageAsFailed = (field) => {
    const imageKey = `${field?.id || ""}:${String(field?.coverImage || "").trim()}`

    if (!imageKey) {
      return
    }

    setFailedImages((currentValue) =>
      currentValue[imageKey]
        ? currentValue
        : {
            ...currentValue,
            [imageKey]: true,
          }
    )
  }

  const handleSubmitReject = () => {
    if (!rejectFieldId) {
      return
    }

    handleRejectField(rejectFieldId, rejectReason)
    setRejectFieldId(null)
    setRejectReason("")
  }

  return (
    <section className="admin-owner-fields-container">
      <header className="admin-owner-fields-hero">
        <div className="admin-owner-fields-copy">
          <span className="admin-owner-fields-kicker">Khu kiểm duyệt sân</span>
          <h1>Quản lý sân của chủ sân</h1>
          <p>
            Theo dõi trạng thái phê duyệt, rà soát hồ sơ sân và xử lý nhanh các thao tác khóa hoặc
            mở khóa đối với từng chủ sân.
          </p>
        </div>

        <div className="admin-owner-fields-filterCard">
          <span className="filterCardLabel">
            <FiFilter aria-hidden="true" />
            Bộ lọc đang áp dụng
          </span>
          <label className="filterField" htmlFor="owner-field-approval-filter">
            <span>Trạng thái</span>
            <select
              id="owner-field-approval-filter"
              value={filterApprovalStatus}
              onChange={(event) => setFilterApprovalStatus(event.target.value)}
              className="filter-select"
            >
              {approvalStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <strong>{selectedFilterLabel}</strong>
        </div>
      </header>

      <div className="admin-owner-fields-summary">
        {summaryCards.map((card) => (
          <article key={card.key} className={`summary-card summary-card--${card.tone}`}>
            <span className="summary-icon" aria-hidden="true">
              {card.icon}
            </span>
            <div>
              <span className="summary-label">{card.label}</span>
              <strong className="summary-value">{card.value}</strong>
            </div>
          </article>
        ))}
      </div>

      {error && (
        <div className="error-alert">
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Đang tải danh sách sân...</p>
        </div>
      ) : fields.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            <FiFileText />
          </span>
          <h2>Không có sân phù hợp</h2>
          <p>Không tìm thấy sân nào theo bộ lọc “{selectedFilterLabel}”. Hãy đổi bộ lọc hoặc chờ chủ sân gửi hồ sơ mới.</p>
        </div>
      ) : (
        <div className="fields-grid">
          {fields.map((field) => {
            const statusMeta = getApprovalStatusMeta(field)
            const fieldApprovalStatus = getApprovalStatusKey(field)
            const isProcessing = actionLoading === field?.id
            const subFields = Array.isArray(field?.subFields) ? field.subFields : []
            const imageKey = `${field?.id || ""}:${String(field?.coverImage || "").trim()}`
            const canRenderImage = Boolean(field?.coverImage) && !failedImages[imageKey]

            return (
              <article key={field?.id} className="field-card">
                <div className="field-card-media">
                  {canRenderImage ? (
                    <img
                      src={field.coverImage}
                      alt={field?.name || "Sân bóng"}
                      onError={() => markImageAsFailed(field)}
                    />
                  ) : (
                    <div className="field-card-placeholder">
                      <FiImage aria-hidden="true" />
                      <span>Chưa có ảnh sân</span>
                    </div>
                  )}

                  <div className="field-card-badges">
                    <span className={`status-badge status-badge--${statusMeta.tone}`}>
                      <span aria-hidden="true">{statusMeta.icon}</span>
                      {statusMeta.badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="field-card-body">
                  <div className="field-card-owner">
                    <span className="owner-chip">
                      <FiUser aria-hidden="true" />
                      {field?.ownerEmail || "Chưa có email chủ sân"}
                    </span>
                  </div>

                  <div className="field-card-heading">
                    <h2>{field?.name || "Chưa đặt tên sân"}</h2>
                    <p>
                      <FiMapPin aria-hidden="true" />
                      {getFieldAddress(field) || "Chưa cập nhật địa chỉ"}
                    </p>
                  </div>

                  <div className="field-card-metrics">
                    <div className="metric-box">
                      <span>Giá/giờ</span>
                      <strong>{formatPrice(field?.pricePerHour || 0)}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Loại sân</span>
                      <strong>{getFieldType(field)}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Sân con</span>
                      <strong>{subFields.length}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Quận/Khu vực</span>
                      <strong>{field?.district || "Chưa cập nhật"}</strong>
                    </div>
                  </div>

                  {subFields.length > 0 && (
                    <div className="subfields-block">
                      <span className="section-label">Danh sách sân con</span>
                      <div className="subfields-list">
                        {subFields.map((subField, index) => (
                          <span key={`${field?.id}-${subField?.id || index}`} className="subfield-chip">
                            {subField?.name || `Sân ${index + 1}`}
                            <em>{subField?.type || "Chưa rõ loại"}</em>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {field?.article && (
                    <div className="field-description">
                      <span className="section-label">Mô tả</span>
                      <p>{field.article}</p>
                    </div>
                  )}

                  <div className="field-actions">
                    {fieldApprovalStatus === "PENDING" && (
                      <>
                        <button
                          type="button"
                          className="field-action field-action--approve"
                          onClick={() => handleApproveField(field?.id)}
                          disabled={isProcessing}
                        >
                          <FiCheckCircle aria-hidden="true" />
                          {isProcessing ? "Đang xử lý..." : "Phê duyệt"}
                        </button>
                        <button
                          type="button"
                          className="field-action field-action--reject"
                          onClick={() => setRejectFieldId(field?.id)}
                          disabled={isProcessing}
                        >
                          <FiSlash aria-hidden="true" />
                          Từ chối
                        </button>
                      </>
                    )}

                    {fieldApprovalStatus === "REJECTED" && (
                      <button
                        type="button"
                        className="field-action field-action--approve"
                        onClick={() => handleApproveField(field?.id)}
                        disabled={isProcessing}
                      >
                        <FiCheckCircle aria-hidden="true" />
                        {isProcessing ? "Đang xử lý..." : "Duyệt lại"}
                      </button>
                    )}

                    {fieldApprovalStatus === "APPROVED" && (
                      <button
                        type="button"
                        className="field-action field-action--lock"
                        onClick={() => handleLockField(field?.id)}
                        disabled={isProcessing}
                      >
                        <FiLock aria-hidden="true" />
                        {isProcessing ? "Đang xử lý..." : "Khóa sân"}
                      </button>
                    )}

                    {fieldApprovalStatus === "LOCKED" && (
                      <button
                        type="button"
                        className="field-action field-action--unlock"
                        onClick={() => handleUnlockField(field?.id)}
                        disabled={isProcessing}
                      >
                        <FiUnlock aria-hidden="true" />
                        {isProcessing ? "Đang xử lý..." : "Mở khóa sân"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {rejectFieldId && (
        <div className="reject-modal">
          <div className="reject-modal-content">
            <h3>Từ chối yêu cầu sân</h3>
            <p>Ghi lý do để chủ sân dễ chỉnh lại thông tin nếu cần.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Nhập lý do từ chối"
              rows={5}
            />
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setRejectFieldId(null)}>
                Hủy
              </button>
              <button type="button" className="btn-confirm" onClick={handleSubmitReject}>
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminOwnerFieldsView
