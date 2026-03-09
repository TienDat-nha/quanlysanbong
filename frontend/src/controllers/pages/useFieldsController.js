import { useEffect, useMemo, useState } from "react"
import { getFields } from "../../models/api"
import {
  createFieldSearchState,
  filterFieldListBySearch,
  getFieldList,
  getFieldSearchOptions,
} from "../../models/fieldModel"

export const useFieldsController = () => {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState(createFieldSearchState)

  useEffect(() => {
    let mounted = true

    const loadFields = async () => {
      try {
        const data = await getFields()
        if (mounted) {
          setFields(getFieldList(data))
        }
      } catch (apiError) {
        if (mounted) {
          setError(apiError.message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadFields()

    return () => {
      mounted = false
    }
  }, [])

  const filteredFields = useMemo(
    () => filterFieldListBySearch(fields, search),
    [fields, search]
  )

  const searchOptions = useMemo(
    () => getFieldSearchOptions(fields),
    [fields]
  )

  const hasActiveFilters = useMemo(
    () => Object.values(search).some((value) => String(value || "").trim() !== ""),
    [search]
  )

  const handleSearchChange = (field, value) => {
    setSearch((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleResetSearch = () => {
    setSearch(createFieldSearchState())
  }

  return {
    fields: filteredFields,
    totalFields: fields.length,
    resultCount: filteredFields.length,
    search,
    searchOptions,
    hasActiveFilters,
    loading,
    error,
    handleSearchChange,
    handleResetSearch,
  }
}
