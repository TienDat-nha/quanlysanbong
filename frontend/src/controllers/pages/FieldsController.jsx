import React from "react"
import { createBookingRoute, createFieldDetailRoute } from "../../models/routeModel"
import { formatPrice } from "../../models/fieldModel"
import FieldsView from "../../views/pages/FieldsView"
import { useFieldsController } from "./useFieldsController"

const FieldsController = () => {
  const {
    fields,
    totalFields,
    resultCount,
    search,
    searchOptions,
    hasActiveFilters,
    loading,
    error,
    handleSearchChange,
    handleResetSearch,
  } = useFieldsController()

  return (
    <FieldsView
      loading={loading}
      error={error}
      fields={fields}
      totalFields={totalFields}
      resultCount={resultCount}
      search={search}
      searchOptions={searchOptions}
      hasActiveFilters={hasActiveFilters}
      formatPrice={formatPrice}
      createFieldDetailRoute={createFieldDetailRoute}
      createBookingRoute={createBookingRoute}
      onSearchChange={handleSearchChange}
      onResetSearch={handleResetSearch}
    />
  )
}

export default FieldsController
