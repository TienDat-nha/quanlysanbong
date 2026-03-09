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
    paymentMethods,
    staticTransfer,
    totalPrice,
    depositAmount,
    remainingAmount,
    summary,
    formatPrice,
    loginPath,
    bookingPath,
    fieldsPath,
    currentPath,
    handleConfirmStaticDeposit,
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
      paymentMethods={paymentMethods}
      staticTransfer={staticTransfer}
      totalPrice={totalPrice}
      depositAmount={depositAmount}
      remainingAmount={remainingAmount}
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
      onCreateVnpayPayment={handleCreateVnpayPayment}
      onCreateMomoPayment={handleCreateMomoPayment}
      onRefresh={handleRefresh}
      onGoToBookings={handleGoToBookings}
      onGoToFields={handleGoToFields}
    />
  )
}

export default DepositPaymentController
