import React, { useState } from 'react'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../models/paymentModel'
import { getPaymentMethodLabel, getPaymentTypeLabel, formatCurrencyVi } from '../utils/paymentHelpers'
import './PaymentMethodForm.scss'

const VISIBLE_PAYMENT_METHODS = PAYMENT_METHODS.filter((method) => method !== 'MOMO')

const PaymentMethodForm = ({
  bookingId,
  totalPrice,
  depositAmount,
  onSubmit,
  loading = false,
  error = '',
  defaultPaymentType = 'DEPOSIT',
  hideFullPaymentOption = false,
  hideDepositOption = false,
}) => {
  const [selectedMethod, setSelectedMethod] = useState(VISIBLE_PAYMENT_METHODS[0] || '')
  const [selectedType, setSelectedType] = useState(defaultPaymentType)

  const paymentAmount = selectedType === 'DEPOSIT' ? depositAmount : totalPrice
  // Filter available types based on which option should be hidden
  let availableTypes = PAYMENT_TYPES
  if (hideFullPaymentOption) {
    availableTypes = availableTypes.filter(t => t !== 'FULL')
  }
  if (hideDepositOption) {
    availableTypes = availableTypes.filter(t => t !== 'DEPOSIT')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedMethod || !selectedType) {
      alert('Vui lòng chọn phương thức và loại thanh toán')
      return
    }
    onSubmit(bookingId, selectedMethod, selectedType)
  }

  return (
    <form className="payment-method-form" onSubmit={handleSubmit}>
      <h3>Chọn phương thức thanh toán</h3>

      <div className="form-section">
        <label>Phương thức thanh toán</label>
        <div className="radio-group">
          {VISIBLE_PAYMENT_METHODS.map((method) => (
            <label key={method} className="radio-option">
              <input
                type="radio"
                name="method"
                value={method}
                checked={selectedMethod === method}
                onChange={(e) => setSelectedMethod(e.target.value)}
                disabled={loading}
              />
              <span className="radio-label">{getPaymentMethodLabel(method)}</span>
            </label>
          ))}
        </div>
      </div>

      {availableTypes.length > 0 && (
        <div className="form-section">
          <label>Loại thanh toán</label>
          {availableTypes.length === 1 ? (
            <div className="form-info-text">
              <strong>{getPaymentTypeLabel(availableTypes[0])}</strong>
              <p>({formatCurrencyVi(availableTypes[0] === 'DEPOSIT' ? depositAmount : totalPrice)})</p>
            </div>
          ) : (
            <div className="radio-group">
            {availableTypes.map((type) => (
              <label key={type} className="radio-option">
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={selectedType === type}
                  onChange={(e) => setSelectedType(e.target.value)}
                  disabled={loading}
                />
                <span className="radio-label">
                  {getPaymentTypeLabel(type)} ({formatCurrencyVi(type === 'DEPOSIT' ? depositAmount : totalPrice)})
                </span>
              </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-info">
        <p>
          <strong>Số tiền xác nhận:</strong> {formatCurrencyVi(paymentAmount)}
        </p>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
      >
        {loading ? 'Đang xử lý...' : 'Tạo thanh toán'}
      </button>
    </form>
  )
}

export default PaymentMethodForm
