import React, { useEffect, useRef, useState } from "react"
import PaymentMethodModal from "../../components/PaymentMethodModal"
import { getBookingById } from "../../models/api"
import {
  formatBookingStatusVi,
  formatDepositMethodVi,
  formatDepositStatusVi,
  formatPaymentStatusVi,
  getBookingPaymentSummaryVi,
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
    paymentCompleted,
    hasConfirmedDeposit,
    outstandingAmount,
    paidDepositAmount,
    remainingPaidAmount,
    paymentStatusLabel,
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
    if (!showPaymentModal) {
      return
    }

    if (paymentCompleted || (holdExpired && !hasConfirmedDeposit)) {
      setShowPaymentModal(false)
    }
  }, [hasConfirmedDeposit, holdExpired, paymentCompleted, showPaymentModal])

  useEffect(() => {
    if (!showPaymentModal || !authToken || !booking?.id || paymentCompleted || (holdExpired && !hasConfirmedDeposit)) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }

      return
    }

    const pollInterval = setInterval(async () => {
      try {
        const bookingData = await getBookingById(booking.id, authToken)
        const rawUpdatedBooking = bookingData?.booking
        const rawUpdatedPaymentSummary = getBookingPaymentSummaryVi(rawUpdatedBooking)
        const shouldPreserveDepositState =
          hasConfirmedDeposit
          && !paymentCompleted
          && rawUpdatedBooking
          && !rawUpdatedPaymentSummary.isFullyPaid
        const updatedBooking = shouldPreserveDepositState
          ? {
            ...rawUpdatedBooking,
            paymentType: booking?.paymentType || booking?.type || rawUpdatedBooking?.paymentType,
            type: booking?.paymentType || booking?.type || rawUpdatedBooking?.type,
            depositAmount: booking?.depositAmount ?? rawUpdatedBooking?.depositAmount,
            remainingAmount: booking?.remainingAmount ?? rawUpdatedBooking?.remainingAmount,
            paidAmount: booking?.paidAmount ?? rawUpdatedBooking?.paidAmount,
            depositPaid: true,
            fullyPaid: false,
            depositStatus: booking?.depositStatus || rawUpdatedBooking?.depositStatus || "PAID",
            paymentStatus: booking?.paymentStatus || rawUpdatedBooking?.paymentStatus || "DEPOSIT_PAID",
          }
          : rawUpdatedBooking
        const updatedPaymentSummary = getBookingPaymentSummaryVi(updatedBooking)
        const updatedStatus = String(updatedBooking?.status || "").trim().toUpperCase()
        const updatedHoldValue = String(updatedBooking?.expiredAt || updatedBooking?.holdExpiresAt || "").trim()
        const updatedHoldTimestamp = updatedHoldValue ? new Date(updatedHoldValue).getTime() : 0
        const bookingTimedOut =
          updatedHoldTimestamp > 0
          && !Number.isNaN(updatedHoldTimestamp)
          && Date.now() >= updatedHoldTimestamp

        const paymentCompletedNow = paymentOption === "remaining" || paymentOption === "full"
          ? updatedPaymentSummary.isFullyPaid
          : updatedPaymentSummary.hasConfirmedDeposit || updatedPaymentSummary.isFullyPaid

        if (paymentCompletedNow) {
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
  }, [showPaymentModal, authToken, booking, handleRefresh, hasConfirmedDeposit, holdExpired, paymentCompleted, paymentOption])

  const handleOpenPaymentModal = () => {
    if (!booking?.id || paymentCompleted || (holdExpired && !hasConfirmedDeposit)) {
      return
    }

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (result = null) => {
    setShowPaymentModal(false)

    if (result?.redirectToBookings) {
      handleGoToBookings({
        bookingMessage: String(result?.message || '').trim() || 'ÄÃ£ táº¡o yÃªu cáº§u thanh toÃ¡n. ÄÆ¡n Ä‘ang chá» admin xÃ¡c nháº­n.',
        bookingMessageType: String(result?.messageType || 'success').trim() || 'success',
      })
      return
    }

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
        paymentCompleted={paymentCompleted}
        hasConfirmedDeposit={hasConfirmedDeposit}
        outstandingAmount={outstandingAmount}
        paidDepositAmount={paidDepositAmount}
        remainingPaidAmount={remainingPaidAmount}
        paymentStatusLabel={paymentStatusLabel}
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
          totalPrice={selectedPaymentAmount}
          depositAmount={depositAmount}
          authToken={authToken}
          paymentType={paymentOption === "deposit" ? "DEPOSIT" : "FULL"}
          isFullPayment={paymentOption !== "deposit"}
          paymentTypeLabelOverride={paymentOption === "remaining" ? "Thanh toán phần còn lại" : ""}
          fixedPaymentNotice={
            paymentOption === "remaining"
              ? "Bước này bắt buộc thanh toán toàn bộ số tiền còn nợ."
              : ""
          }
          onPaymentSuccess={handlePaymentSuccess}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </>
  )
}

export default DepositPaymentController
