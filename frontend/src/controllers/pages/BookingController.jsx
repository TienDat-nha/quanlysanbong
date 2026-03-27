import React from "react"
import BookingView from "../../views/pages/BookingView"
import { useBookingController } from "./useBookingController"

const BookingController = ({ authToken, currentUser }) => {
  const {
    bookings,
    scheduleRows,
    timeline,
    selectedField,
    selectedSubField,
    hasSelectedSlot,
    loadingFields,
    loadingAvailability,
    loadingBookings,
    form,
    submitting,
    cancellingBookingId,
    feedback,
    bookingStep,
    loginPath,
    fieldsPath,
    adminFieldsPath,
    adminUsersPath,
    minBookingDate,
    formatDateTime,
    formatStatus,
    handleFieldChange,
    handleSlotSelect,
    handleContinueToConfirm,
    handleBackToSchedule,
    handleCancelBooking,
    handleSubmit,
  } = useBookingController({ authToken })

  return (
    <BookingView
      authToken={authToken}
      currentUser={currentUser}
      bookings={bookings}
      scheduleRows={scheduleRows}
      timeline={timeline}
      selectedField={selectedField}
      selectedSubField={selectedSubField}
      hasSelectedSlot={hasSelectedSlot}
      loadingFields={loadingFields}
      loadingAvailability={loadingAvailability}
      loadingBookings={loadingBookings}
      form={form}
      submitting={submitting}
      cancellingBookingId={cancellingBookingId}
      feedback={feedback}
      bookingStep={bookingStep}
      loginPath={loginPath}
      fieldsPath={fieldsPath}
      adminFieldsPath={adminFieldsPath}
      adminUsersPath={adminUsersPath}
      minBookingDate={minBookingDate}
      formatDateTime={formatDateTime}
      formatStatus={formatStatus}
      onFieldChange={handleFieldChange}
      onSlotSelect={handleSlotSelect}
      onContinueToConfirm={handleContinueToConfirm}
      onBackToSchedule={handleBackToSchedule}
      onCancelBooking={handleCancelBooking}
      onSubmit={handleSubmit}
    />
  )
}

export default BookingController
