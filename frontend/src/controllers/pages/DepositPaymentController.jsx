import React, { useEffect, useRef, useState } from "react"
import PaymentMethodModal from "../../components/PaymentMethodModal"
import { getBookingById } from "../../models/api"
import {
  formatBookingStatusVi,
  formatDepositMethodVi,
  formatDepositStatusVi,
  formatPaymentStatusVi,
} from "../../models/bookingTextModel"
import DepositPaymentView from "../../views/pages/DepositPaymentView"
import { useDepositPaymentController } from "./useDepositPaymentController"

const DepositPaymentController = ({ authToken, currentUser }) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const pollingIntervalRef = useRef(null)

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
    handlePaymentOptionChange,
    handleCreateVnpayPayment,
    handleCreateMomoPayment,
    handleRefresh,
    handleGoToBookings,
    handleGoToFields,
  } = useDepositPaymentController({ authToken })

  useEffect(() => {
    if (!showPaymentModal || paymentConfirmed || !holdExpired) {
      return
    }

    setShowPaymentModal(false)
  }, [holdExpired, paymentConfirmed, showPaymentModal])

  useEffect(() => {
    if (!showPaymentModal || !authToken || !booking?.id || holdExpired || paymentConfirmed) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const bookingData = await getBookingById(booking.id, authToken)
        const updatedBooking = bookingData?.booking
        const updatedStatus = String(updatedBooking?.status || "").trim().toUpperCase()
        const updatedHoldValue = String(updatedBooking?.expiredAt || updatedBooking?.holdExpiresAt || "").trim()
        const updatedHoldTimestamp = updatedHoldValue ? new Date(updatedHoldValue).getTime() : 0
        const bookingTimedOut =
          updatedHoldTimestamp > 0
          && !Number.isNaN(updatedHoldTimestamp)
          && Date.now() >= updatedHoldTimestamp

        if (updatedBooking?.depositStatus === "PAID" || updatedBooking?.paymentStatus === "PAID") {
          setShowPaymentModal(false)
          clearInterval(pollInterval)
          if (pollingIntervalRef.current === pollInterval) {
            pollingIntervalRef.current = null
          }

          setTimeout(() => {
            handleRefresh()
          }, 500)

          return
        }

        if (
          bookingTimedOut
          || updatedStatus === "CANCELLED"
          || updatedStatus === "CANCELED"
          || updatedStatus === "EXPIRED"
        ) {
          setShowPaymentModal(false)
          clearInterval(pollInterval)
          if (pollingIntervalRef.current === pollInterval) {
            pollingIntervalRef.current = null
          }
          handleRefresh()
        }
      } catch (err) {
        console.error("Error polling payment status:", err)
      }
    }, 3000)

    pollingIntervalRef.current = pollInterval

    return () => {
      clearInterval(pollInterval)
      if (pollingIntervalRef.current === pollInterval) {
        pollingIntervalRef.current = null
      }
    }
  }, [showPaymentModal, authToken, booking?.id, handleRefresh, holdExpired, paymentConfirmed])

  const handleOpenPaymentModal = () => {
    if (!booking?.id || holdExpired || paymentConfirmed) {
      return
    }

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    handleRefresh()
  }

  return (
    <>
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
        onConfirmStaticDeposit={handleOpenPaymentModal}
        onPaymentOptionChange={handlePaymentOptionChange}
        onCreateVnpayPayment={handleCreateVnpayPayment}
        onCreateMomoPayment={handleCreateMomoPayment}
        onRefresh={handleRefresh}
        onGoToBookings={handleGoToBookings}
        onGoToFields={handleGoToFields}
      />

      {showPaymentModal && (
        <PaymentMethodModal
          bookingId={booking?.id}
          bookingIds={Array.isArray(booking?.bookingIds) ? booking.bookingIds : []}
          totalPrice={totalPrice}
          depositAmount={depositAmount}
          authToken={authToken}
          paymentType={paymentOption === "full" ? "FULL" : "DEPOSIT"}
          isFullPayment={paymentOption === "full"}
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  )
}

export default DepositPaymentController
