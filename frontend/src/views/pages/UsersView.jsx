import React from "react"
import { Link } from "react-router-dom"
import {
  getApiRoleValue,
  getManagedUserRoleLabel,
  getManagedUserStatusLabel,
} from "../../models/userModel"

const createSummaryCards = (summary) => [
  { key: "total", label: "Tổng tài khoản", value: summary.total, tone: "primary" },
  { key: "users", label: "Người dùng", value: summary.customers, tone: "neutral" },
  { key: "owners", label: "Chủ sân", value: summary.owners, tone: "warning" },
  { key: "locked", label: "Đang khóa", value: summary.locked, tone: "success" },
]

const UsersView = ({
  users,
  loading,
  error,
  successMessage,
  formValues,
  submitting,
  deletingUserId,
  statusActionUserId,
  statusActionMode,
  isEditing,
  canManageUsers,
  isAuthenticated,
  currentUser,
  roleOptions,
  summary,
  loginPath,
  onInputChange,
  onSubmit,
  onEditUser,
  onCancelEdit,
  onDeleteUser,
  onToggleUserStatus,
  onRefresh,
}) => {
  if (!isAuthenticated) {
    return (
      <section className="page section usersPage">
        <div className="container pageHeader usersPageHeader">
          <div>
            <p className="usersEyebrow">Khu quản trị</p>
            <h1>Quản Lý Người Dùng Và Chủ Sân</h1>
            <p>
              Vui lòng <Link to={loginPath}>đăng nhập</Link> bằng tài khoản admin do DB cấp để quản
              lý tài khoản.
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (!canManageUsers) {
    return (
      <section className="page section usersPage">
        <div className="container pageHeader usersPageHeader">
          <div>
            <p className="usersEyebrow">Khu quản trị</p>
            <h1>Quản Lý Người Dùng Và Chủ Sân</h1>
            <p>Tài khoản {currentUser?.email} không có quyền truy cập khu quản trị tài khoản.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page section usersPage">
      <div className="container pageHeader usersPageHeader">
        <div>
          <p className="usersEyebrow">Khu quản trị tài khoản</p>
          <h1>Quản Lý Người Dùng Và Chủ Sân</h1>
          <p>
            Tài khoản admin cấp từ DB có thể tạo user/chủ sân, xóa tài khoản và khóa hoặc mở khóa
            bằng chính backend hiện tại.
          </p>
        </div>

        <div className="usersHighlight">
          <span>Admin đang đăng nhập</span>
          <strong>{currentUser?.email || "ADMIN"}</strong>
        </div>
      </div>

      <div className="container adminDashboardStats">
        {createSummaryCards(summary).map((card) => (
          <article className={`adminStatCard adminStatCard--${card.tone}`} key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="container usersPageLayout">
        <aside className="usersSidebar">
          <form className="formCard usersForm" onSubmit={onSubmit}>
            <div className="usersPanelHeader">
              <h2>{isEditing ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}</h2>
              <span>{isEditing ? "Chế độ sửa" : "Admin tạo trực tiếp"}</span>
            </div>

            <p className="usersFormHint">
              Trang đăng ký ngoài giao diện chính chỉ tạo user. Màn này dùng cho admin tạo người
              dùng hoặc chủ sân.
            </p>
            <p className="usersFormHint">
              Lưu ý: backend hiện gom quyền quản trị và chủ sân vào cùng nhóm `ADMIN`.
            </p>

            <label htmlFor="user-name">Tên tài khoản</label>
            <input
              id="user-name"
              name="name"
              type="text"
              placeholder="Nguyễn Văn A"
              value={formValues.name}
              onChange={onInputChange}
              disabled={submitting}
            />

            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              name="email"
              type="email"
              placeholder="email@domain.com"
              value={formValues.email}
              onChange={onInputChange}
              disabled={submitting}
            />

            <label htmlFor="user-phone">Số điện thoại</label>
            <input
              id="user-phone"
              name="phone"
              type="text"
              placeholder="09xxxxxxxx"
              value={formValues.phone}
              onChange={onInputChange}
              disabled={submitting}
            />

            <label htmlFor="user-password">Mật khẩu</label>
            <input
              id="user-password"
              name="password"
              type="password"
              placeholder={isEditing ? "Bỏ trống nếu không đổi" : "Nhập mật khẩu"}
              value={formValues.password}
              onChange={onInputChange}
              disabled={submitting}
            />

            <label htmlFor="user-role">Loại tài khoản</label>
            <select
              id="user-role"
              name="role"
              value={formValues.role}
              onChange={onInputChange}
              disabled={submitting}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div className="usersActionsRow">
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? "Đang lưu..." : isEditing ? "Cập nhật tài khoản" : "Tạo tài khoản"}
              </button>

              {isEditing && (
                <button
                  className="outlineBtnInline"
                  type="button"
                  onClick={onCancelEdit}
                  disabled={submitting}
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>
        </aside>

        <div className="usersContent">
          {successMessage && <p className="message success">{successMessage}</p>}
          {error && <p className="message error">{error}</p>}

          {loading ? (
            <article className="usersPanel">
              <p>Đang tải danh sách tài khoản...</p>
            </article>
          ) : (
            <article className="usersPanel">
              <div className="usersPanelHeader">
                <h2>Danh sách hiện tại</h2>
                <div className="usersActionsRow">
                  <span>{users.length} bản ghi</span>
                  <button className="outlineBtnInline" type="button" onClick={onRefresh}>
                    Tải lại
                  </button>
                </div>
              </div>

              {users.length === 0 ? (
                <p className="usersEmptyState">Chưa có tài khoản nào trong danh sách.</p>
              ) : (
                <div className="usersTableWrap">
                  <table className="usersTable">
                    <thead>
                      <tr>
                        <th>Tên</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Loại</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((user) => {
                        const isOwner = getApiRoleValue(user.role) === "ADMIN"
                        const isSelf =
                          String(user.id || "").trim() === String(currentUser?.id || currentUser?._id || "").trim()
                          || String(user.email || "").trim().toLowerCase()
                            === String(currentUser?.email || "").trim().toLowerCase()
                        const isDeleting = deletingUserId === user.id
                        const isStatusLoading = statusActionUserId === user.id

                        return (
                          <tr key={user.id}>
                            <td>
                              <div className="usersInlineMeta">
                                <strong>{user.name}</strong>
                                {isSelf && <span className="usersSelfBadge">Tài khoản hiện tại</span>}
                              </div>
                            </td>
                            <td>{user.email || "-"}</td>
                            <td>{user.phone || "-"}</td>
                            <td>
                              <span className={`usersRoleBadge ${isOwner ? "isOwner" : "isUser"}`}>
                                {getManagedUserRoleLabel(user.role)}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`usersStatusBadge ${user.isLocked ? "isLocked" : "isActive"}`}
                              >
                                {getManagedUserStatusLabel(user)}
                              </span>
                            </td>
                            <td>
                              <div className="usersRowActions">
                                <button
                                  className="outlineBtnInline"
                                  type="button"
                                  onClick={() => onEditUser(user)}
                                  disabled={submitting || isDeleting || isStatusLoading}
                                >
                                  Sửa
                                </button>
                                <button
                                  className="outlineBtnInline"
                                  type="button"
                                  onClick={() => onToggleUserStatus(user)}
                                  disabled={submitting || isDeleting || isStatusLoading || isSelf}
                                >
                                  {isStatusLoading
                                    ? statusActionMode === "unlock"
                                      ? "Đang mở..."
                                      : "Đang khóa..."
                                    : user.isLocked
                                      ? "Mở khóa"
                                      : "Khóa"}
                                </button>
                                <button
                                  className="outlineBtnInline usersDeleteBtn"
                                  type="button"
                                  onClick={() => onDeleteUser(user)}
                                  disabled={submitting || isDeleting || isStatusLoading || isSelf}
                                >
                                  {isDeleting ? "Đang xóa..." : "Xóa"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

export default UsersView
