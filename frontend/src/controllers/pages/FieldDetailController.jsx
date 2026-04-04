import React from "react"
import { formatPrice } from "../../models/fieldModel"
import { createBookingRoute, ROUTES } from "../../models/routeModel"
import FieldDetailView from "../../views/pages/FieldDetailView"
import { useFieldDetailController } from "./useFieldDetailController"

const FieldDetailController = () => {
  const { field, loading, error } = useFieldDetailController()

  return (
    <FieldDetailView
      loading={loading}
      error={error}
      field={field}
      formatPrice={formatPrice}
      createBookingRoute={createBookingRoute}
      fieldsPath={ROUTES.fields}
    />
  )
}

export default FieldDetailController
