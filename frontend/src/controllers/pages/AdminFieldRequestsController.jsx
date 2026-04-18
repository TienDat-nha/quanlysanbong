/**
 * Component điều khiển trang duyệt yêu cầu tạo sân (Admin)
 * 
 * Chức năng:
 * - Kết nối logic duyệt yêu cầu (useAdminFieldRequestsController) với giao diện (AdminFieldRequestsView)
 * - Hiển thị danh sách yêu cầu tạo sân từ chủ sân
 * - Cho phép Admin duyệt hoặc từ chối yêu cầu
 * - Cho phép nhập lý do từ chối
 * - Hiển thị thống kê yêu cầu (Tổng, Chờ duyệt, Đã duyệt, Bị từ chối)
 * 
 * Props:
 * - authToken: Token xác thực
 * - currentUser: Thông tin người dùng hiện tại (phải là Admin)
 */

import React from "react"
import { useAdminFieldRequestsController } from "./useAdminFieldRequestsController"
import AdminFieldRequestsView from "../../views/pages/AdminFieldRequestsView"

const AdminFieldRequestsController = ({ authToken, currentUser }) => {
  const viewModel = useAdminFieldRequestsController(authToken, currentUser)

  return <AdminFieldRequestsView {...viewModel} />
}

export default AdminFieldRequestsController
