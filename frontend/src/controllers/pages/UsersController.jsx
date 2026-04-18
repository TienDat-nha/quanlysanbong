/**
 * Component điều khiển trang quản lý người dùng (dành cho Admin)
 * 
 * Chức năng:
 * - Kết nối logic quản lý người dùng (useUsersController) với giao diện (UsersView)
 * - Quản lý danh sách người dùng (tạo, sửa, xóa, khóa/mở khóa)
 * - Quản lý OTP cho người dùng (gửi, xác thực)
 * - Phân quyền cho người dùng (Admin, Owner, User)
 * - Hiển thị thống kê người dùng
 * 
 * Props:
 * - authToken: Token xác thực
 * - currentUser: Thông tin người dùng hiện tại (phải là Admin)
 */

import React from "react"
import UsersView from "../../views/pages/UsersView"
import { useUsersController } from "./useUsersController"

const UsersController = ({ authToken, currentUser }) => {
  const viewModel = useUsersController({ authToken, currentUser })

  return <UsersView {...viewModel} />
}

export default UsersController
