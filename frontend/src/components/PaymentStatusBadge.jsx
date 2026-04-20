import React from 'react'
import { getPaymentStatusInfo } from '../utils/paymentHelpers'
import './PaymentStatusBadge.scss'

const PaymentStatusBadge = ({ status, expiredAt = null, createdAt = null, className = '' }) => {
  // --- TIN TƯỞNG DỮ LIỆU TỪ BACKEND ---
  // Chúng ta truyền nguyên trạng status từ Server vào helper để lấy thông tin hiển thị
  const info = getPaymentStatusInfo(status, expiredAt, createdAt)
  
  // Nếu BE trả về status trống hoặc lỗi, info nên có giá trị mặc định (ví dụ: gray/Unknown)
  const safeInfo = info || {
    color: 'gray',
    label: 'Không xác định',
    icon: '❓'
  }

  return (
    <span className={`payment-status-badge badge-${safeInfo.color} ${className}`.trim()}>
      {safeInfo.icon && <span className="badge-icon">{safeInfo.icon}</span>}
      <span className="badge-label">{safeInfo.label}</span>
    </span>
  )
}

export default PaymentStatusBadge