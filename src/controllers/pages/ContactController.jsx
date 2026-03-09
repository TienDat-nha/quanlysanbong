import React from "react"
import ContactView from "../../views/pages/ContactView"
import { useContactController } from "./useContactController"

const ContactController = () => {
  const { form, submitting, feedback, handleFieldChange, handleSubmit } =
    useContactController()

  return (
    <ContactView
      form={form}
      submitting={submitting}
      feedback={feedback}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
    />
  )
}

export default ContactController
