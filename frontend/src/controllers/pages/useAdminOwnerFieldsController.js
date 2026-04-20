import { useEffect, useState } from "react"
import {
  approveAdminField,
  deleteAdminField,
  getAllFieldForAdmin,
  rejectAdminField,
} from "../../models/api"

const getApprovalStatusKey = (field) => {
  const rawStatus = String(field?.status || field?.approvalStatus || "")
    .trim()
    .toUpperCase()

  if (rawStatus === "REJECTED") {
    return "REJECTED"
  }

  if (rawStatus === "LOCKED" || field?.isLocked || field?.locked) {
    return "LOCKED"
  }

  if (rawStatus === "APPROVED" || rawStatus === "ACTIVE") {
    return "APPROVED"
  }

  if (rawStatus === "PENDING") {
    return "PENDING"
  }

  return "PENDING"
}

const filterFieldsByApprovalStatus = (fields = [], filterApprovalStatus = "ALL") => {
  const nextFields = Array.isArray(fields) ? fields : []

  if (filterApprovalStatus === "ALL") {
    return nextFields
  }

  return nextFields.filter((field) => getApprovalStatusKey(field) === filterApprovalStatus)
}

const patchFieldStatus = (fields = [], fieldId, nextStatus) =>
  (Array.isArray(fields) ? fields : []).map((field) => {
    if (String(field?.id || "") !== String(fieldId || "")) {
      return field
    }

    const normalizedStatus = String(nextStatus || "").trim().toUpperCase()
    const isLocked = normalizedStatus === "LOCKED"

    return {
      ...field,
      status: normalizedStatus,
      approvalStatus: normalizedStatus,
      isLocked,
      locked: isLocked,
    }
  })

const fetchFilteredFields = async (token, filterApprovalStatus = "ALL") => {
  const response = await getAllFieldForAdmin(token)
  return filterFieldsByApprovalStatus(response?.fields || [], filterApprovalStatus)
}

export const useAdminOwnerFieldsController = ({ authToken }) => {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterApprovalStatus, setFilterApprovalStatus] = useState("ALL")
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    const loadFields = async () => {
      try {
        setLoading(true)
        setError(null)
        setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
      } catch (err) {
        setError(err?.message || "Lá»—i táº£i danh sÃ¡ch sÃ¢n cá»§a chá»§ sÃ¢n")
      } finally {
        setLoading(false)
      }
    }

    if (authToken) {
      loadFields()
      return
    }

    setFields([])
    setLoading(false)
    setError(null)
  }, [authToken, filterApprovalStatus])

  const handleApproveField = async (fieldId) => {
    try {
      setActionLoading(fieldId)
      setError(null)
      await approveAdminField(authToken, fieldId)
      setFields((currentFields) =>
        filterFieldsByApprovalStatus(
          patchFieldStatus(currentFields, fieldId, "APPROVED"),
          filterApprovalStatus
        )
      )
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
    } catch (err) {
      setError(err?.message || "Lá»—i phÃª duyá»‡t sÃ¢n")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectField = async (fieldId, reason = "") => {
    try {
      setActionLoading(fieldId)
      setError(null)
      await rejectAdminField(authToken, fieldId, reason)
      setFields((currentFields) =>
        filterFieldsByApprovalStatus(
          patchFieldStatus(currentFields, fieldId, "REJECTED"),
          filterApprovalStatus
        )
      )
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
    } catch (err) {
      setError(err?.message || "Lá»—i tá»« chá»‘i sÃ¢n")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteField = async (fieldId, fieldName = "") => {
    const normalizedFieldId = String(fieldId || "").trim()
    if (!normalizedFieldId) {
      return
    }

    const normalizedFieldName = String(fieldName || "").trim()
    const confirmMessage = normalizedFieldName
      ? `XÃ¡c nháº­n xÃ³a sÃ¢n "${normalizedFieldName}"?`
      : "XÃ¡c nháº­n xÃ³a sÃ¢n nÃ y?"

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      setActionLoading(normalizedFieldId)
      setError(null)
      await deleteAdminField(authToken, normalizedFieldId)
      setFields((currentFields) =>
        (Array.isArray(currentFields) ? currentFields : []).filter(
          (field) => String(field?.id || "") !== normalizedFieldId
        )
      )
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
    } catch (err) {
      setError(err?.message || "Lá»—i xÃ³a sÃ¢n")
    } finally {
      setActionLoading(null)
    }
  }

  return {
    fields,
    loading,
    error,
    filterApprovalStatus,
    setFilterApprovalStatus,
    handleApproveField,
    handleRejectField,
    handleDeleteField,
    actionLoading,
  }
}
