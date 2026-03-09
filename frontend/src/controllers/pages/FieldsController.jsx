import React from "react"
import { createBookingRoute, createFieldDetailRoute } from "../../models/routeModel"
import { formatPrice } from "../../models/fieldModel"
import FieldsView from "../../views/pages/FieldsView"
import { useFieldsController } from "./useFieldsController"

const FieldsController = () => {
  const { fields, loading, error } = useFieldsController()

  return (
    <FieldsView
      loading={loading}
      error={error}
      fields={fields}
      formatPrice={formatPrice}
      createFieldDetailRoute={createFieldDetailRoute}
      createBookingRoute={createBookingRoute}
    />
  )
}

export default FieldsController
