import React from 'react'
import { getPaymentStatusInfo } from '../utils/paymentHelpers'
import './PaymentStatusBadge.scss'

const PaymentStatusBadge = ({ status, expiredAt = null, createdAt = null, className = '' }) => {
  const info = getPaymentStatusInfo(status, expiredAt, createdAt)
  
  return (
    <span className={`payment-status-badge badge-${info.color} ${className}`.trim()}>
      <span className="badge-icon">{info.icon}</span>
      <span className="badge-label">{info.label}</span>
    </span>
  )
}

export default PaymentStatusBadge
