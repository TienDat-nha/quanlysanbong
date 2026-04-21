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
  FiTrash2,
  FiUser,
} from "react-icons/fi"
import "./AdminOwnerFieldsView.scss"

const APPROVAL_STATUS_META = Object.freeze({
  PENDING: {
    label: "Chá» duyá»‡t",
    badgeLabel: "Chá» duyá»‡t",
    tone: "pending",
    icon: <FiClock />,
  },
  APPROVED: {
    label: "ÄÃ£ duyá»‡t",
    badgeLabel: "ÄÃ£ duyá»‡t",
    tone: "approved",
    icon: <FiCheckCircle />,
  },
  LOCKED: {
    label: "ÄÃ£ khÃ³a",
    badgeLabel: "ÄÃ£ khÃ³a",
    tone: "locked",
    icon: <FiLock />,
  },
  REJECTED: {
    label: "Tá»« chá»‘i",
    badgeLabel: "Tá»« chá»‘i",
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
  return firstSubFieldType || "ChÆ°a cáº­p nháº­t"
}

const getSummaryCards = (fields = []) => [
  {
    key: "total",
    label: "Äang hiá»ƒn thá»‹",
    value: fields.length,
    tone: "neutral",
    icon: <FiFileText />,
  },
  {
    key: "pending",
    label: "Chá» duyá»‡t",
    value: fields.filter((field) => getApprovalStatusKey(field) === "PENDING").length,
    tone: "pending",
    icon: <FiClock />,
  },
  {
    key: "approved",
    label: "ÄÃ£ duyá»‡t",
    value: fields.filter((field) => getApprovalStatusKey(field) === "APPROVED").length,
    tone: "approved",
    icon: <FiCheckCircle />,
  },
  {
    key: "locked",
    label: "ÄÃ£ khÃ³a",
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
  handleDeleteField = () => {},
  actionLoading = null,
}) => {
  const [rejectReason, setRejectReason] = useState("")
  const [rejectFieldId, setRejectFieldId] = useState(null)
  const [failedImages, setFailedImages] = useState({})

  const approvalStatuses = [
    { value: "ALL", label: "Táº¥t cáº£" },
    { value: "PENDING", label: "Chá» duyá»‡t" },
    { value: "APPROVED", label: "ÄÃ£ duyá»‡t" },
    { value: "LOCKED", label: "ÄÃ£ khÃ³a" },
    { value: "REJECTED", label: "Bá»‹ tá»« chá»‘i" },
  ]

  const selectedFilterLabel =
    approvalStatuses.find((status) => status.value === filterApprovalStatus)?.label || "Táº¥t cáº£"

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
          <span className="admin-owner-fields-kicker">Khu kiá»ƒm duyá»‡t sÃ¢n</span>
          <h1>Quáº£n lÃ½ sÃ¢n cá»§a chá»§ sÃ¢n</h1>
          <p>
            Theo dÃµi tráº¡ng thÃ¡i phÃª duyá»‡t, rÃ  soÃ¡t há»“ sÆ¡ sÃ¢n vÃ  xá»­ lÃ½ nhanh thao tÃ¡c xÃ³a sÃ¢n
            khi cáº§n.
          </p>
        </div>

        <div className="admin-owner-fields-filterCard">
          <span className="filterCardLabel">
            <FiFilter aria-hidden="true" />
            Bá»™ lá»c Ä‘ang Ã¡p dá»¥ng
          </span>
          <label className="filterField" htmlFor="owner-field-approval-filter">
            <span>Tráº¡ng thÃ¡i</span>
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
          <p>Äang táº£i danh sÃ¡ch sÃ¢n...</p>
        </div>
      ) : fields.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            <FiFileText />
          </span>
          <h2>KhÃ´ng cÃ³ sÃ¢n phÃ¹ há»£p</h2>
          <p>
            KhÃ´ng tÃ¬m tháº¥y sÃ¢n nÃ o theo bá»™ lá»c â€œ{selectedFilterLabel}â€. HÃ£y Ä‘á»•i bá»™ lá»c
            hoáº·c chá» chá»§ sÃ¢n gá»­i há»“ sÆ¡ má»›i.
          </p>
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
                      alt={field?.name || "SÃ¢n bÃ³ng"}
                      onError={() => markImageAsFailed(field)}
                    />
                  ) : (
                    <div className="field-card-placeholder">
                      <FiImage aria-hidden="true" />
                      <span>ChÆ°a cÃ³ áº£nh sÃ¢n</span>
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
                      {field?.ownerEmail || "ChÆ°a cÃ³ email chá»§ sÃ¢n"}
                    </span>
                  </div>

                  <div className="field-card-heading">
                    <h2>{field?.name || "ChÆ°a Ä‘áº·t tÃªn sÃ¢n"}</h2>
                    <p>
                      <FiMapPin aria-hidden="true" />
                      {getFieldAddress(field) || "ChÆ°a cáº­p nháº­t Ä‘á»‹a chá»‰"}
                    </p>
                  </div>

                  <div className="field-card-metrics">
                    <div className="metric-box">
                      <span>GiÃ¡/giá»</span>
                      <strong>{formatPrice(field?.pricePerHour || 0)}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Loáº¡i sÃ¢n</span>
                      <strong>{getFieldType(field)}</strong>
                    </div>
                    <div className="metric-box">
                      <span>SÃ¢n con</span>
                      <strong>{subFields.length}</strong>
                    </div>
                    <div className="metric-box">
                      <span>Quáº­n/Khu vá»±c</span>
                      <strong>{field?.district || "ChÆ°a cáº­p nháº­t"}</strong>
                    </div>
                  </div>

                  {subFields.length > 0 && (
                    <div className="subfields-block">
                      <span className="section-label">Danh sÃ¡ch sÃ¢n con</span>
                      <div className="subfields-list">
                        {subFields.map((subField, index) => (
                          <span key={`${field?.id}-${subField?.id || index}`} className="subfield-chip">
                            {subField?.name || `SÃ¢n ${index + 1}`}
                            <em>{subField?.type || "ChÆ°a rÃµ loáº¡i"}</em>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {field?.article && (
                    <div className="field-description">
                      <span className="section-label">MÃ´ táº£</span>
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
                          {isProcessing ? "Äang xá»­ lÃ½..." : "PhÃª duyá»‡t"}
                        </button>
                        <button
                          type="button"
                          className="field-action field-action--reject"
                          onClick={() => setRejectFieldId(field?.id)}
                          disabled={isProcessing}
                        >
                          <FiSlash aria-hidden="true" />
                          Tá»« chá»‘i
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
                        {isProcessing ? "Äang xá»­ lÃ½..." : "Duyá»‡t láº¡i"}
                      </button>
                    )}

                    {["APPROVED", "LOCKED"].includes(fieldApprovalStatus) && (
                      <button
                        type="button"
                        className="field-action field-action--delete"
                        onClick={() => handleDeleteField(field?.id, field?.name)}
                        disabled={isProcessing}
                      >
                        <FiTrash2 aria-hidden="true" />
                        {isProcessing ? "Äang xá»­ lÃ½..." : "XÃ³a sÃ¢n"}
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
            <h3>Tá»« chá»‘i yÃªu cáº§u sÃ¢n</h3>
            <p>Ghi lÃ½ do Ä‘á»ƒ chá»§ sÃ¢n dá»… chá»‰nh láº¡i thÃ´ng tin náº¿u cáº§n.</p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Nháº­p lÃ½ do tá»« chá»‘i"
              rows={5}
            />
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setRejectFieldId(null)}>
                Há»§y
              </button>
              <button type="button" className="btn-confirm" onClick={handleSubmitReject}>
                XÃ¡c nháº­n tá»« chá»‘i
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminOwnerFieldsView
