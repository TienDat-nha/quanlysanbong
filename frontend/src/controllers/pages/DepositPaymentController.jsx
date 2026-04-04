import React from "react"
import DepositPaymentView from "../../views/pages/DepositPaymentView"
import {
  formatBookingStatusVi,
  formatDepositMethodVi,
  formatDepositStatusVi,
  formatPaymentStatusVi,
} from "../../models/bookingTextModel"
import { useDepositPaymentController } from "./useDepositPaymentController"

const DepositPaymentController = ({ authToken, currentUser }) => {
  const {
    booking,
    field,
    loading,
    error,
    feedback,
    actionLoading,
    paymentConfirmed,
    holdExpiresAt,
    holdExpired,
    countdownLabel,
    paymentMethods,
    staticTransfer,
    totalPrice,
    depositAmount,
    remainingAmount,
    selectedPaymentAmount,
    selectedRemainingAmount,
    paymentOption,
    paymentOptionLabel,
    paymentOptions,
    summary,
    formatPrice,
    loginPath,
    bookingPath,
    fieldsPath,
    currentPath,
    handleConfirmStaticDeposit,
    handlePaymentOptionChange,
    handleCreateVnpayPayment,
    handleCreateMomoPayment,
    handleRefresh,
    handleGoToBookings,
    handleGoToFields,
  } = useDepositPaymentController({ authToken })

  return (
    <DepositPaymentView
      authToken={authToken}
      currentUser={currentUser}
      booking={booking}
      field={field}
      loading={loading}
      error={error}
      feedback={feedback}
      actionLoading={actionLoading}
      paymentConfirmed={paymentConfirmed}
      holdExpiresAt={holdExpiresAt}
      holdExpired={holdExpired}
      countdownLabel={countdownLabel}
      paymentMethods={paymentMethods}
      staticTransfer={staticTransfer}
      totalPrice={totalPrice}
      depositAmount={depositAmount}
      remainingAmount={remainingAmount}
      selectedPaymentAmount={selectedPaymentAmount}
      selectedRemainingAmount={selectedRemainingAmount}
      paymentOption={paymentOption}
      paymentOptionLabel={paymentOptionLabel}
      paymentOptions={paymentOptions}
      summary={summary}
      formatPrice={formatPrice}
      formatStatus={formatBookingStatusVi}
      formatDepositStatus={formatDepositStatusVi}
      formatPaymentStatus={formatPaymentStatusVi}
      formatDepositMethod={formatDepositMethodVi}
      loginPath={loginPath}
      bookingPath={bookingPath}
      fieldsPath={fieldsPath}
      currentPath={currentPath}
      onConfirmStaticDeposit={handleConfirmStaticDeposit}
      onPaymentOptionChange={handlePaymentOptionChange}
      onCreateVnpayPayment={handleCreateVnpayPayment}
      onCreateMomoPayment={handleCreateMomoPayment}
      onRefresh={handleRefresh}
      onGoToBookings={handleGoToBookings}
      onGoToFields={handleGoToFields}
    />
  )
}

export default DepositPaymentController
