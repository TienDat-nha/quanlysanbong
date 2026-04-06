import React, { useEffect, useMemo, useState } from 'react'
import { PAYMENT_METHODS, PAYMENT_TYPES } from '../models/paymentModel'
import { formatCurrencyVi, getPaymentMethodLabel, getPaymentTypeLabel } from '../utils/paymentHelpers'
import './PaymentMethodForm.scss'

const VISIBLE_PAYMENT_METHODS = PAYMENT_METHODS.filter((method) => method !== 'BANK')

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
  hidePaymentTypeSection = false,
  paymentTypeLabelOverride = '',
  fixedPaymentNotice = '',
}) => {
  const [selectedMethod, setSelectedMethod] = useState(VISIBLE_PAYMENT_METHODS[0] || '')
  const [selectedType, setSelectedType] = useState(defaultPaymentType)

  const availableTypes = useMemo(() => {
    let nextTypes = PAYMENT_TYPES

    if (hideFullPaymentOption) {
      nextTypes = nextTypes.filter((type) => type !== 'FULL')
    }

    if (hideDepositOption) {
      nextTypes = nextTypes.filter((type) => type !== 'DEPOSIT')
    }

    return nextTypes
  }, [hideDepositOption, hideFullPaymentOption])

  useEffect(() => {
    const normalizedDefaultType = availableTypes.includes(defaultPaymentType)
      ? defaultPaymentType
      : availableTypes[0] || ''

    if (normalizedDefaultType && normalizedDefaultType !== selectedType) {
      setSelectedType(normalizedDefaultType)
    }
  }, [availableTypes, defaultPaymentType, selectedType])

  const effectiveSelectedType = availableTypes.includes(selectedType)
    ? selectedType
    : availableTypes[0] || selectedType
  const paymentAmount = effectiveSelectedType === 'DEPOSIT' ? depositAmount : totalPrice
  const effectivePaymentTypeLabel =
    paymentTypeLabelOverride
    || getPaymentTypeLabel(effectiveSelectedType)
  const submitLabel = selectedMethod === 'MOMO' ? 'Tiếp tục đến MoMo' : 'Tạo thanh toán'

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!selectedMethod || !effectiveSelectedType) {
      alert('Vui lòng chọn phương thức và loại thanh toán')
      return
    }

    onSubmit(bookingId, selectedMethod, effectiveSelectedType)
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
                onChange={(event) => setSelectedMethod(event.target.value)}
                disabled={loading}
              />
              <span className="radio-label">{getPaymentMethodLabel(method)}</span>
            </label>
          ))}
        </div>
      </div>

      {!hidePaymentTypeSection && availableTypes.length > 0 && (
        <div className="form-section">
          <label>Loại thanh toán</label>
          {availableTypes.length === 1 ? (
            <div className="form-info-text">
              <strong>{effectivePaymentTypeLabel}</strong>
              <p>({formatCurrencyVi(paymentAmount)})</p>
            </div>
          ) : (
            <div className="radio-group">
              {availableTypes.map((type) => (
                <label key={type} className="radio-option">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={effectiveSelectedType === type}
                    onChange={(event) => setSelectedType(event.target.value)}
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

      {hidePaymentTypeSection && (
        <div className="form-section">
          <label>Loại thanh toán</label>
          <div className="form-info-text">
            <strong>{effectivePaymentTypeLabel}</strong>
            <p>({formatCurrencyVi(paymentAmount)})</p>
            {fixedPaymentNotice && <p>{fixedPaymentNotice}</p>}
          </div>
        </div>
      )}

      <div className="form-info">
        <p>
          <strong>{hidePaymentTypeSection ? 'Số tiền cần thanh toán:' : 'Số tiền xác nhận:'}</strong> {formatCurrencyVi(paymentAmount)}
        </p>
      </div>

      {error && <div className="form-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading}
      >
        {loading ? 'Đang xử lý...' : submitLabel}
      </button>
    </form>
  )
}

export default PaymentMethodForm
