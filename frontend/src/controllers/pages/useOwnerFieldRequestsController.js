import { useCallback, useEffect, useState } from "react"
import * as API from "../../models/api"

const REQUEST_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"])

const normalizeRequestStatus = (field = {}) => {
  const rawStatus = String(field?.approvalStatus || field?.status || field?.fieldStatus || "")
    .trim()
    .toUpperCase()

  if (rawStatus === "APPROVED" || rawStatus === "ACTIVE") {
    return "APPROVED"
  }

  if (rawStatus === "REJECTED") {
    return "REJECTED"
  }

  if (rawStatus === "PENDING") {
    return "PENDING"
  }

  return ""
}

const normalizeIdentityToken = (value) => String(value || "").trim().toLowerCase()

const isOwnerField = (field = {}, currentUser = {}) => {
  const ownerTokens = [
    currentUser?.id,
    currentUser?._id,
    currentUser?.userId,
    currentUser?.email,
  ]
    .map((value) => normalizeIdentityToken(value))
    .filter(Boolean)

  if (ownerTokens.length === 0) {
    return false
  }

  const fieldTokens = [field?.ownerUserId, field?.userId, field?.ownerEmail]
    .map((value) => normalizeIdentityToken(value))
    .filter(Boolean)

  return fieldTokens.some((value) => ownerTokens.includes(value))
}

const toRequestField = (field = {}) => {
  const normalizedStatus = normalizeRequestStatus(field)

  return {
    ...field,
    status: normalizedStatus,
    approvalStatus: normalizedStatus || String(field?.approvalStatus || "").trim(),
    fieldStatus: normalizedStatus || String(field?.fieldStatus || "").trim(),
  }
}

export const useOwnerFieldRequestsController = (authToken, currentUser) => {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState("PENDING")

  const loadFieldRequests = useCallback(async () => {
    if (!authToken) {
      setFields([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const { fields: allFields } = await API.getAdminFields(authToken)

      const ownerFields = (allFields || [])
        .map((field) => toRequestField(field))
        .filter((field) => isOwnerField(field, currentUser))
        .filter((field) => REQUEST_STATUSES.has(field.status))

      setFields(ownerFields)
    } catch (err) {
      setError(err?.message || "Loi khi tai yeu cau san")
      setFields([])
    } finally {
      setLoading(false)
    }
  }, [authToken, currentUser])

  useEffect(() => {
    loadFieldRequests()
  }, [loadFieldRequests])

  const getFilteredFields = () => {
    if (filterStatus === "ALL") {
      return fields
    }

    return fields.filter((field) => normalizeRequestStatus(field) === filterStatus)
  }

  const getStatusStats = () => {
    return {
      total: fields.length,
      pending: fields.filter((field) => normalizeRequestStatus(field) === "PENDING").length,
      approved: fields.filter((field) => normalizeRequestStatus(field) === "APPROVED").length,
      rejected: fields.filter((field) => normalizeRequestStatus(field) === "REJECTED").length,
    }
  }

  return {
    fields: getFilteredFields(),
    allFields: fields,
    loading,
    error,
    filterStatus,
    setFilterStatus,
    stats: getStatusStats(),
  }
}
