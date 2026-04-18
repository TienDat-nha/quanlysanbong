/**
 * Component điều khiển trang quản lý sân của chủ sân (Admin)
 * 
 * Chức năng:
 * - Kết nối logic quản lý sân (useAdminOwnerFieldsController) với giao diện (AdminOwnerFieldsView)
 * - Hiển thị danh sách tất cả sân đã được đăng ký bởi chủ sân
 * - Cho phép lọc theo trạng thái duyệt (Chờ duyệt, Đã duyệt, Đã khóa, Từ chối)
 * - Cho phép duyệt, từ chối, khóa/mở khóa sân
 * 
 * Props:
 * - authToken: Token xác thực
 * - currentUser: Thông tin người dùng hiện tại (phải là Admin)
 */

import React from "react"
import AdminOwnerFieldsView from "../../views/pages/AdminOwnerFieldsView"
import { useAdminOwnerFieldsController } from "./useAdminOwnerFieldsController"

const AdminOwnerFieldsController = ({ authToken, currentUser }) => {
  const viewModel = useAdminOwnerFieldsController({ authToken, currentUser })

  return <AdminOwnerFieldsView {...viewModel} />
}

export default AdminOwnerFieldsController
