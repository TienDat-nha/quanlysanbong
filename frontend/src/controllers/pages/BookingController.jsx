import React from "react"
import BookingView from "../../views/pages/BookingView"
import { useBookingController } from "./useBookingController"

const BookingController = ({ authToken, currentUser }) => {
  const {
    fields,
    bookings,
    catalogMessage,
    fieldSlug,
    scheduleRows,
    timeline,
    selectedField,
    selectedSubField,
    selectedTimeSlotIds,
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
    adminOwnerFieldsPath,
    minBookingDate,
    formatDateTime,
    formatStatus,
    handleFieldChange,
    handleSlotSelect,
    handleContinueToConfirm,
    handleBackToSchedule,
    handleCancelBooking,
    handleSubmit,
  } = useBookingController({ authToken, currentUser })

  return (
    <BookingView
      authToken={authToken}
      currentUser={currentUser}
      fields={fields}
      bookings={bookings}
      catalogMessage={catalogMessage}
      fieldSlug={fieldSlug}
      scheduleRows={scheduleRows}
      timeline={timeline}
      selectedField={selectedField}
      selectedSubField={selectedSubField}
      selectedTimeSlotIds={selectedTimeSlotIds}
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
      adminOwnerFieldsPath={adminOwnerFieldsPath}
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
