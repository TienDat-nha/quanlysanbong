import React from "react"

const UsersView = ({
  users,
  loading,
  error,
  successMessage,
  formValues,
  submitting,
  deletingUserId,
  isEditing,
  canManageUsers,
  onInputChange,
  onSubmit,
  onEditUser,
  onCancelEdit,
  onDeleteUser,
}) => {
  return (
    <section className="page section usersPage">
      <div className="container pageHeader usersPageHeader">
        <div>
          <p className="usersEyebrow">Render Backend</p>
          <h1>Danh sách người dùng</h1>
          <p>Frontend này đang lấy dữ liệu trực tiếp từ API backend.</p>
        </div>

        <div className="usersHighlight">
          <span>Tổng người dùng</span>
          <strong>{users.length}</strong>
        </div>
      </div>

      <div className="container usersPageLayout">
        <aside className="usersSidebar">
          <form className="formCard usersForm" onSubmit={onSubmit}>
            <div className="usersPanelHeader">
              <h2>{isEditing ? "Cập nhật người dùng" : "Thêm người dùng mới"}</h2>
            </div>

            <p>
              {canManageUsers
                ? "Tài khoản ADMIN có thể tạo, sửa và xóa người dùng trên backend."
                : "Danh sách người dùng là công khai. Đăng nhập bằng tài khoản ADMIN để quản lý."}
            </p>

            <label htmlFor="user-name">Tên người dùng</label>
            <input
              id="user-name"
              name="name"
              type="text"
              placeholder="Nguyễn Văn A"
              value={formValues.name}
              onChange={onInputChange}
              disabled={!canManageUsers || submitting}
            />

            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              name="email"
              type="email"
              placeholder="email@domain.com"
              value={formValues.email}
              onChange={onInputChange}
              disabled={!canManageUsers || submitting}
            />

            <label htmlFor="user-phone">Số điện thoại</label>
            <input
              id="user-phone"
              name="phone"
              type="text"
              placeholder="09xxxxxxxx"
              value={formValues.phone}
              onChange={onInputChange}
              disabled={!canManageUsers || submitting}
            />

            <label htmlFor="user-password">Mật khẩu</label>
            <input
              id="user-password"
              name="password"
              type="password"
              placeholder={isEditing ? "Bỏ trống nếu không đổi" : "Nhập mật khẩu"}
              value={formValues.password}
              onChange={onInputChange}
              disabled={!canManageUsers || submitting}
            />

            <label htmlFor="user-role">Vai trò</label>
            <select
              id="user-role"
              name="role"
              value={formValues.role}
              onChange={onInputChange}
              disabled={!canManageUsers || submitting}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <div className="usersActionsRow">
              <button className="btn" type="submit" disabled={!canManageUsers || submitting}>
                {submitting ? "Đang lưu..." : isEditing ? "Cập nhật người dùng" : "Thêm người dùng"}
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
              <p>Đang tải danh sách người dùng...</p>
            </article>
          ) : (
            <article className="usersPanel">
              <div className="usersPanelHeader">
                <h2>Danh sách hiện tại</h2>
                <span>{users.length} bản ghi</span>
              </div>

              {users.length === 0 ? (
                <p className="usersEmptyState">Chưa có người dùng nào trong danh sách.</p>
              ) : (
                <div className="usersTableWrap">
                  <table className="usersTable">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên</th>
                        <th>Email</th>
                        <th>Số điện thoại</th>
                        <th>Vai trò</th>
                        {canManageUsers && <th>Thao tác</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.name}</td>
                          <td>{user.email || "-"}</td>
                          <td>{user.phone || "-"}</td>
                          <td>{user.role}</td>
                          {canManageUsers && (
                            <td>
                              <div className="usersRowActions">
                                <button
                                  className="outlineBtnInline"
                                  type="button"
                                  onClick={() => onEditUser(user)}
                                  disabled={submitting || deletingUserId === user.id}
                                >
                                  Sửa
                                </button>
                                <button
                                  className="outlineBtnInline usersDeleteBtn"
                                  type="button"
                                  onClick={() => onDeleteUser(user)}
                                  disabled={submitting || deletingUserId === user.id}
                                >
                                  {deletingUserId === user.id ? "Đang xóa..." : "Xóa"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
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
