import { useEffect, useState } from "react"
import { getFields } from "../../models/api"
import { getFieldList } from "../../models/fieldModel"

export const useFieldsController = () => {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  return {
    fields,
    loading,
    error,
  }
}
