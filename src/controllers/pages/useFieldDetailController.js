import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { getFieldById } from "../../models/api"
import { getFieldDetail } from "../../models/fieldModel"

export const useFieldDetailController = () => {
  const { id } = useParams()
  const [field, setField] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const loadField = async () => {
      setLoading(true)
      setError("")

      try {
        const data = await getFieldById(id)
        if (mounted) {
          setField(getFieldDetail(data))
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

    loadField()

    return () => {
      mounted = false
    }
  }, [id])

  return {
    field,
    loading,
    error,
  }
}
