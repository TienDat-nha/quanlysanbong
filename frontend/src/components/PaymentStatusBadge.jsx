import React from 'react'
import { getPaymentStatusInfo } from '../utils/paymentHelpers'
import './PaymentStatusBadge.scss'

const PaymentStatusBadge = ({ status, className = '' }) => {
  const info = getPaymentStatusInfo(status)
  
  return (
    <span className={`payment-status-badge badge-${info.color} ${className}`.trim()}>
      <span className="badge-icon">{info.icon}</span>
      <span className="badge-label">{info.label}</span>
    </span>
  )
}

export default PaymentStatusBadge
