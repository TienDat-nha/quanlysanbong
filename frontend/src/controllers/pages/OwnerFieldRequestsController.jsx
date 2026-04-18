/**
 
 * Component điều khiển trang xem yêu cầu tạo sân của chủ sân
 * 
 * Chức năng:
 * - Kết nối logic xem yêu cầu (useOwnerFieldRequestsController) với giao diện (OwnerFieldRequestsView)
 * - Hiển thị danh sách yêu cầu tạo sân của chủ sân hiện tại
 * - Hiển thị trạng thái từng yêu cầu (Chờ duyệt, Đã duyệt, Bị từ chối)
 * - Cho phép lọc theo trạng thái
 * - Hiển thị thống kê yêu cầu
 * 
 * Props:
 * - authToken: Token xác thực
 * - currentUser: Thông tin người dùng hiện tại (phải là Owner)
 */

import React from "react"
import { useOwnerFieldRequestsController } from "./useOwnerFieldRequestsController"
import OwnerFieldRequestsView from "../../views/pages/OwnerFieldRequestsView"

const OwnerFieldRequestsController = ({ authToken, currentUser }) => {
  const viewModel = useOwnerFieldRequestsController(authToken, currentUser)

  return <OwnerFieldRequestsView {...viewModel} />
}

export default OwnerFieldRequestsController
