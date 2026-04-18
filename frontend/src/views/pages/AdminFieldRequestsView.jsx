/**
 
 * Giao diện trang duyệt yêu cầu tạo sân (Admin)
 * 
 * Chức năng:
 * - Hiển thị danh sách yêu cầu tạo sân từ chủ sân
 * - Hiển thị bộ lọc theo trạng thái (Tất cả, Chờ duyệt, Đã duyệt, Bị từ chối)
 * - Hiển thị thẻ thống kê: Tổng yêu cầu, Chờ duyệt, Đã duyệt, Bị từ chối
 * - Hiển thị nút Duyệt, Từ chối cho mỗi yêu cầu
 * - Hiển thị modal để nhập lý do từ chối
 * - Hiển thị badge trạng thái với màu sắc khác nhau
 * - Hiển thị trạng thái tải, lỗi
 * 
 * Props:
 * - requests: Danh sách yêu cầu
 * - loading: Trạng thái đang tải
 * - error: Thông báo lỗi
 * - filterStatus: Bộ lọc hiện tại
 * - setFilterStatus: Hàm thay đổi bộ lọc
 * - actionLoading: Trạng thái đang thực hiện action
 * - stats: Thống kê yêu cầu
 * - rejectReason, setRejectReason: Quản lý lý do từ chối
 * - rejectFieldId, setRejectFieldId: Quản lý fieldId cần từ chối
 * - handleApproveField, handleRejectField: Hàm xử lý
 */

import React from "react";
import "./AdminFieldRequestsView.scss";
// Hàm lấy class badge theo trạng thái
const AdminFieldRequestsView = ({
  requests = [],
  loading = false,
  error = null,
  filterStatus = "PENDING",
  setFilterStatus = () => {},
  actionLoading = null,
  stats = {},
  rejectReason = "",
  setRejectReason = () => {},
  rejectFieldId = null,
  setRejectFieldId = () => {},
  handleApproveField = () => {},
  handleRejectField = () => {},
}) => {
  // Các tùy chọn trạng thái để hiển thị trong dropdown filter
  const statusOptions = [
    { value: "ALL", label: "Tất cả" },
    { value: "PENDING", label: "Chờ duyệt" },
    { value: "APPROVED", label: "Đã duyệt" },
    { value: "REJECTED", label: "Bị từ chối" },
  ];
  // Hàm lọc yêu cầu theo trạng thái
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "PENDING":
        return "pending";
      case "APPROVED":
        return "approved";
      case "REJECTED":
        return "rejected";
      default:
        return "";
    }
  };

  // Hàm lọc yêu cầu theo trạng thái
  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "Chờ duyệt";
      case "APPROVED":
        return "Đã duyệt";
      case "REJECTED":
        return "Bị từ chối";
      default:
        return status;
    }
  };

  // Hàm xử lý xác nhận từ chối yêu cầu (gọi handleRejectField với rejectFieldId và rejectReason)
  const handleConfirmReject = () => {
    if (rejectFieldId) {
      handleRejectField(rejectFieldId);
    }
  };

  if (loading) {
    return (
      <div className="admin-field-requests-container loading">
        <div className="spinner"></div>
        <p>Đang tải yêu cầu sân...</p>
      </div>
    );
  }

  return (
    <div className="admin-field-requests-container">
      <div className="section-header">
        <h1>Duyệt yêu cầu tạo sân</h1>
        <p>Quản lý các yêu cầu tạo sân từ chủ sân</p>
      </div>

      {error && (
        <div className="error">
          <strong>Lỗi!</strong>
          <p>{error}</p>
        </div>
      )}

      {/* Thống kê tổng quan */}
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Bảng yêu cầu */}
      {requests.length === 0 ? (
        <div className="empty-state">
          <p>
            {filterStatus === "ALL"
              ? "Không có yêu cầu sân nào"
              : `Không có yêu cầu sân nào ở trạng thái "${getStatusLabel(filterStatus)}"`}
          </p>
        </div>
      ) : (
        <div className="requests-table-wrapper">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Chủ sân</th>
                <th>Tên sân</th>
                <th>Địa chỉ</th>
                <th>Giá/giờ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request?.id || request?._id}>
                  <td>
                    <div className="owner-info">
                      <div className="owner-name">
                        {request?.ownerFullName || "N/A"}
                      </div>
                      <div className="owner-email">
                        {request?.ownerEmail || "N/A"}
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{request?.name || "N/A"}</strong>
                  </td>
                  <td>{request?.address || "N/A"}</td>
                  <td>
                    {request?.pricePerHour
                      ? `${request.pricePerHour.toLocaleString()} VND`
                      : "N/A"}
                  </td>
                  <td>
                    <span
                      className={`status-badge status-${getStatusBadgeClass(
                        request?.status,
                      )}`}
                    >
                      {getStatusLabel(request?.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      {request?.status === "PENDING" && (
                        <>
                          <button
                            className="btn-approve"
                            onClick={() =>
                              handleApproveField(request?.id || request?._id)
                            }
                            disabled={
                              actionLoading === request?.id ||
                              actionLoading === request?._id
                            }
                            title="Phê duyệt yêu cầu"
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() =>
                              setRejectFieldId(request?.id || request?._id)
                            }
                            disabled={
                              actionLoading === request?.id ||
                              actionLoading === request?._id
                            }
                            title="Từ chối yêu cầu"
                          >
                            ✕ Từ chối
                          </button>
                        </>
                      )}
                      {request?.status === "APPROVED" && (
                        <span className="status-label">Đã duyệt</span>
                      )}
                      {request?.status === "REJECTED" && (
                        <span className="status-label rejected-label">
                          Bị từ chối
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectFieldId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">Lý do từ chối yêu cầu</div>
            <div className="modal-body">
              <label>Nhập lý do từ chối:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Thông tin sân không đầy đủ, ảnh chất lượng kém, ..."
                rows={4}
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => {
                  setRejectFieldId(null);
                  setRejectReason("");
                }}
              >
                Hủy
              </button>
              <button
                className="btn-confirm"
                onClick={handleConfirmReject}
                disabled={
                  !rejectReason.trim() || actionLoading === rejectFieldId
                }
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFieldRequestsView;
