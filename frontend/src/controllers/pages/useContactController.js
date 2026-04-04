import { useState } from "react"
import { sendContact } from "../../models/api"
import {
  createContactFeedback,
  createContactForm,
} from "../../models/contactModel"

export const useContactController = () => {
  const [form, setForm] = useState(createContactForm)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(createContactFeedback)

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setFeedback(createContactFeedback())

    try {
      await sendContact(form)
      setForm(createContactForm())
      setFeedback({ type: "success", text: "Gửi liên hệ thành công." })
    } catch (apiError) {
      setFeedback({ type: "error", text: apiError.message })
    } finally {
      setSubmitting(false)
    }
  }

  return {
    form,
    submitting,
    feedback,
    handleFieldChange,
    handleSubmit,
  }
}
