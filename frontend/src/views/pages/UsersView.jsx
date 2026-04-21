import React from "react"
import { Link } from "react-router-dom"
import {
  FiEdit3,
  FiHome,
  FiLock,
  FiMail,
  FiRefreshCw,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
} from "react-icons/fi"
import {
  getApiRoleValue,
  getManagedUserRoleLabel,
  getManagedUserStatusLabel,
} from "../../models/userModel"

const createSummaryCards = (summary) => [
  {
    key: "total",
    label: "Tổng tài khoản",
    value: summary.total,
    tone: "primary",
    note: "Toàn bộ tài khoản hiện có",
    icon: <FiUsers />,
  },
  {
    key: "users",
    label: "Người dùng",
    value: summary.customers,
    tone: "neutral",
    note: "Tài khoản đặt sân",
    icon: <FiUser />,
  },
  {
    key: "owners",
    label: "Chủ sân",
    value: summary.owners,
    tone: "warning",
    note: "Tài khoản quản lý sân",
    icon: <FiHome />,
  },
  {
    key: "admins",
    label: "Quản trị",
    value: summary.admins,
    tone: "primary",
    note: "Tài khoản có quyền cao nhất",
    icon: <FiShield />,
  },
  {
    key: "locked",
    label: "Đang khóa",
    value: summary.locked,
    tone: "success",
    note: "Tài khoản đang bị hạn chế",
    icon: <FiLock />,
  },
]

const controlClass = (error, baseClass = "") =>
  `${baseClass}${error ? `${baseClass ? " " : ""}ownerFormControl--error` : ""}`.trim()

const ErrorText = ({ text }) => (text ? <p className="ownerFieldError">{text}</p> : null)

const getRoleBadgeClass = (role, email) => {
  const normalizedRole = getApiRoleValue(role, email)

  if (normalizedRole === "ADMIN") {
    return "isAdmin"
  }

  if (normalizedRole === "OWNER") {
    return "isOwner"
  }

  return "isUser"
}

const UsersView = ({
  users,
  loading,
  error,
  successMessage,
  formValues,
  formErrors,
  submitting,
  deletingUserId,
  statusActionUserId,
  statusActionMode,
  otpEnabled,
  otpSetupMessage,
  otpState,
  otpSummary,
  canResendOtp,
  otpExpired,
  otpActionMode,
  isEditing,
  canManageUsers,
  isAuthenticated,
  currentUser,
  roleOptions,
  summary,
  loginPath,
  onInputChange,
  onOtpInputChange,
  onRequestOtp,
  onVerifyOtp,
  onSubmit,
  onEditUser,
  onCancelEdit,
  onDeleteUser,
  onToggleUserStatus,
  onRefresh,
}) => {
  const otpFeedbackClass =
    otpState.feedback?.type === "error"
      ? "message error"
      : otpState.feedback?.type === "warning"
        ? "message warning"
        : "message success"

  const otpStatusLabel = otpState.verified
    ? "Đã xác nhận"
    : otpActionMode === "send"
      ? "Đang gửi mã"
      : otpState.feedback?.type === "error" && (otpState.targetEmail || formValues.email)
        ? "Gửi mã thất bại"
        : otpState.codeHash
          ? otpExpired
            ? "Đã hết hạn"
            : "Đang chờ xác nhận"
          : "Chưa gửi mã"

  const summaryCards = createSummaryCards(summary)

  if (!isAuthenticated) {
    return (
      <section className="page section usersPage">
        <div className="container usersHeroShell">
          <div className="usersHeroMain usersHeroMain--single">
            <div className="usersHeroCopy">
              <span className="usersEyebrow">Khu quản trị</span>
              <h1>Quản lý người dùng và chủ sân</h1>
              <p>
                Vui lòng <Link to={loginPath}>đăng nhập</Link> bằng tài khoản admin để quản lý
                tài khoản.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (!canManageUsers) {
    return (
      <section className="page section usersPage">
        <div className="container usersHeroShell">
          <div className="usersHeroMain usersHeroMain--single">
            <div className="usersHeroCopy">
              <span className="usersEyebrow">Khu quản trị</span>
              <h1>Quản lý người dùng và chủ sân</h1>
              <p>Tài khoản {currentUser?.email} không có quyền truy cập khu quản trị tài khoản.</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="page section usersPage">
      <div className="container usersHeroShell">
        <div className="usersHeroMain">
          <div className="usersHeroCopy">
            <span className="usersEyebrow">Khu quản trị tài khoản</span>
            <h1>Quản lý người dùng và chủ sân</h1>
            <p>
              Tạo tài khoản mới, xác thực OTP cho luồng admin, khóa hoặc mở khóa truy cập, và
              theo dõi toàn bộ trạng thái người dùng trong một màn hình.
            </p>
          </div>

          <aside className="usersHighlight">
            <span className="usersHighlightLabel">Admin đang đăng nhập</span>
            <strong>{currentUser?.email || "ADMIN"}</strong>
            <p>Khu vực này dành cho quản trị viên theo dõi tài khoản người dùng và chủ sân.</p>
          </aside>
        </div>
      </div>

      <div className="container usersSummaryGrid">
        {summaryCards.map((card) => (
          <article className={`usersSummaryCard usersSummaryCard--${card.tone}`} key={card.key}>
            <span className="usersSummaryIcon" aria-hidden="true">
              {card.icon}
            </span>
            <div className="usersSummaryMeta">
              <span className="usersSummaryLabel">{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.note}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="container usersPageLayout">
        <aside className="usersSidebar">
          <form className="formCard usersForm usersSurfaceCard" onSubmit={onSubmit}>
            <div className="usersPanelHeader">
              <div className="usersPanelHeading">
                <h2>{isEditing ? "Cập nhật tài khoản" : "Tạo tài khoản mới"}</h2>
                <p className="usersPanelLead">
                  {isEditing
                    ? "Chỉnh sửa thông tin, phân quyền và trạng thái tài khoản hiện có."
                    : "Tạo tài khoản người dùng hoặc chủ sân mới từ khu vực quản trị."}
                </p>
              </div>
              <span className="usersPanelChip">
                {isEditing ? "Chế độ sửa" : "Admin có OTP email"}
              </span>
            </div>

            <label htmlFor="user-name">Tên tài khoản</label>
            <input
              id="user-name"
              className={controlClass(formErrors?.name)}
              name="name"
              type="text"
              placeholder="Nguyễn Văn A"
              value={formValues.name}
              onChange={onInputChange}
              disabled={submitting}
            />
            <ErrorText text={formErrors?.name} />

            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              className={controlClass(formErrors?.email)}
              name="email"
              type="email"
              placeholder="email@domain.com"
              value={formValues.email}
              onChange={onInputChange}
              disabled={submitting}
            />
            <ErrorText text={formErrors?.email} />

            <label htmlFor="user-phone">Số điện thoại</label>
            <input
              id="user-phone"
              className={controlClass(formErrors?.phone)}
              name="phone"
              type="text"
              required
              placeholder="09xxxxxxxx"
              value={formValues.phone}
              onChange={onInputChange}
              disabled={submitting}
            />
            <ErrorText text={formErrors?.phone} />

            <label htmlFor="user-password">Mật khẩu</label>
            <input
              id="user-password"
              className={controlClass(formErrors?.password)}
              name="password"
              type="password"
              placeholder={isEditing ? "Bỏ trống nếu không đổi" : "Nhập mật khẩu"}
              value={formValues.password}
              onChange={onInputChange}
              disabled={submitting}
            />
            <ErrorText text={formErrors?.password} />

            <label htmlFor="user-role">Loại tài khoản</label>
            <select
              id="user-role"
              className={controlClass(formErrors?.role)}
              name="role"
              value={formValues.role}
              onChange={onInputChange}
              disabled={submitting || isEditing}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ErrorText text={formErrors?.role} />
            {isEditing && (
              <p className="usersPanelLead">Vai tro chi thiet lap khi tao moi tai khoan.</p>
            )}

            {!isEditing && (
              <section className="usersOtpCard">
                <div className="usersPanelHeader">
                  <div className="usersPanelHeading">
                    <h2>Xác thực OTP email</h2>
                    <p className="usersPanelLead">
                      Bắt buộc khi admin tạo tài khoản mới để tránh tạo nhầm hoặc trùng dữ liệu.
                    </p>
                  </div>
                  <span className="usersPanelChip usersPanelChip--soft">Bắt buộc khi tạo mới</span>
                </div>

                {!otpEnabled && <p className="message warning">{otpSetupMessage}</p>}

                <div className="otpSummary usersOtpMeta">
                  <p>
                    <strong>Email nhận mã:</strong>{" "}
                    {otpState.targetEmail || formValues.email || "Chưa nhập email"}
                  </p>
                  <p>
                    <strong>Trạng thái:</strong> {otpStatusLabel}
                  </p>
                  <div className="usersOtpStats">
                    <span>
                      <FiMail aria-hidden="true" /> Hết hạn sau: {otpSummary.countdownLabel}
                    </span>
                    <span>
                      <FiRefreshCw aria-hidden="true" /> Gửi lại sau: {otpSummary.resendLabel}
                    </span>
                  </div>
                </div>

                <label htmlFor="user-otp">Mã OTP</label>
                <input
                  id="user-otp"
                  className={controlClass(formErrors?.otpInput, "usersOtpInput")}
                  type="text"
                  inputMode="numeric"
                  value={otpState.input}
                  onChange={(event) => onOtpInputChange(event.target.value)}
                  placeholder="Nhập 6 số OTP"
                  maxLength={6}
                  disabled={submitting || otpActionMode === "send" || !otpEnabled}
                />
                <ErrorText text={formErrors?.otpInput} />

                <div className="usersActionsRow usersOtpActions">
                  <button
                    className="btn"
                    type="button"
                    onClick={onRequestOtp}
                    disabled={submitting || otpActionMode === "verify" || !canResendOtp || !otpEnabled}
                  >
                    {otpActionMode === "send"
                      ? "Đang gửi..."
                      : otpState.codeHash
                        ? "Gửi lại OTP"
                        : "Gửi OTP"}
                  </button>

                  <button
                    className="outlineBtnInline"
                    type="button"
                    onClick={onVerifyOtp}
                    disabled={submitting || otpActionMode === "send" || !otpState.codeHash || !otpEnabled}
                  >
                    {otpActionMode === "verify"
                      ? "Đang xác nhận..."
                      : otpState.verified
                        ? "Đã xác nhận"
                        : "Xác nhận OTP"}
                  </button>
                </div>

                {otpState.feedback?.text && (
                  <p className={otpFeedbackClass}>{otpState.feedback.text}</p>
                )}
              </section>
            )}

            <div className="usersActionsRow">
              <button
                className="btn"
                type="submit"
                disabled={submitting || (!isEditing && !otpSummary.canSubmit)}
              >
                {submitting
                  ? "Đang lưu..."
                  : isEditing
                    ? "Cập nhật tài khoản"
                    : otpSummary.canSubmit
                      ? "Tạo tài khoản"
                      : "Xác nhận OTP để tiếp tục"}
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
            <article className="usersPanel usersSurfaceCard">
              <p>Đang tải danh sách tài khoản...</p>
            </article>
          ) : (
            <article className="usersPanel usersSurfaceCard">
              <div className="usersPanelHeader">
                <div className="usersPanelHeading">
                  <h2>Danh sách hiện tại</h2>
                  <p className="usersPanelLead">
                    Theo dõi trạng thái, phân quyền và thao tác nhanh cho từng tài khoản.
                  </p>
                </div>
                <div className="usersActionsRow">
                  <span className="usersPanelChip usersPanelChip--count">{users.length} bản ghi</span>
                  <button className="outlineBtnInline" type="button" onClick={onRefresh}>
                    <FiRefreshCw aria-hidden="true" />
                    Tải lại
                  </button>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="usersEmptyState">
                  <span className="usersEmptyIcon" aria-hidden="true">
                    <FiUsers />
                  </span>
                  <h3>Chưa có tài khoản nào trong danh sách</h3>
                  <p>Tạo tài khoản mới ở cột bên trái để bắt đầu quản lý người dùng và chủ sân.</p>
                </div>
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
                        const normalizedRole = getApiRoleValue(user.role, user.email)
                        const roleBadgeClass = getRoleBadgeClass(user.role, user.email)
                        const isPrimaryAdmin = normalizedRole === "ADMIN"
                        const isSelf =
                          String(user.id || "").trim()
                            === String(currentUser?.id || currentUser?._id || "").trim()
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
                              <span className={`usersRoleBadge ${roleBadgeClass}`}>
                                {getManagedUserRoleLabel(user.role, user.email)}
                              </span>
                            </td>
                            <td>
                              <span className={`usersStatusBadge ${user.isLocked ? "isLocked" : "isActive"}`}>
                                {getManagedUserStatusLabel(user)}
                              </span>
                            </td>
                            <td>
                              <div className="usersRowActions">
                                <button
                                  className="outlineBtnInline"
                                  type="button"
                                  onClick={() => onEditUser(user)}
                                  disabled={submitting || isDeleting || isStatusLoading || isPrimaryAdmin}
                                >
                                  <FiEdit3 aria-hidden="true" />
                                  Sửa
                                </button>
                                <button
                                  className="outlineBtnInline"
                                  type="button"
                                  onClick={() => onToggleUserStatus(user)}
                                  disabled={submitting || isDeleting || isStatusLoading || isSelf || isPrimaryAdmin}
                                >
                                  <FiLock aria-hidden="true" />
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
                                  disabled={submitting || isDeleting || isStatusLoading || isSelf || isPrimaryAdmin}
                                >
                                  <FiTrash2 aria-hidden="true" />
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
