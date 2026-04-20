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

const normalizeFieldId = (value) => String(value || "").trim()

const toRequestField = (field = {}) => {
  const normalizedStatus = normalizeRequestStatus(field)

  return {
    ...field,
    status: normalizedStatus,
    approvalStatus: normalizedStatus || String(field?.approvalStatus || "").trim(),
    fieldStatus: normalizedStatus || String(field?.fieldStatus || "").trim(),
  }
}

export const useAdminFieldRequestsController = (authToken) => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState("PENDING")
  const [actionLoading, setActionLoading] = useState(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectFieldId, setRejectFieldId] = useState(null)

  const loadFieldRequests = useCallback(async () => {
    if (!authToken) {
      setRequests([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { fields: allFields } = await API.getAllFieldForAdmin(authToken)
      const requestFields = (allFields || [])
        .map((field) => toRequestField(field))
        .filter((field) => REQUEST_STATUSES.has(field.status))

      setRequests(requestFields)
    } catch (err) {
      setError(err?.message || "Loi khi tai yeu cau san")
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [authToken])

  useEffect(() => {
    loadFieldRequests()
  }, [loadFieldRequests])

  const handleApproveField = async (fieldId) => {
    if (!fieldId || !authToken) {
      return
    }

    try {
      setActionLoading(fieldId)
      await API.approveAdminField(authToken, fieldId)

      const normalizedFieldId = normalizeFieldId(fieldId)
      setRequests((prev) =>
        prev.map((request) => {
          const requestId = normalizeFieldId(request?.id || request?._id)

          return requestId === normalizedFieldId
            ? {
                ...request,
                status: "APPROVED",
                approvalStatus: "APPROVED",
                fieldStatus: "APPROVED",
              }
            : request
        })
      )
    } catch (err) {
      setError(err?.message || "Loi khi duyet yeu cau")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectField = async (fieldId) => {
    if (!fieldId || !authToken) {
      return
    }

    try {
      setActionLoading(fieldId)
      await API.rejectAdminField(authToken, fieldId, rejectReason)

      const normalizedFieldId = normalizeFieldId(fieldId)
      const normalizedReason = String(rejectReason || "").trim()

      setRequests((prev) =>
        prev.map((request) => {
          const requestId = normalizeFieldId(request?.id || request?._id)

          return requestId === normalizedFieldId
            ? {
                ...request,
                status: "REJECTED",
                approvalStatus: "REJECTED",
                fieldStatus: "REJECTED",
                rejectReason: normalizedReason || "Khong hop le",
              }
            : request
        })
      )

      setRejectReason("")
      setRejectFieldId(null)
    } catch (err) {
      setError(err?.message || "Loi khi tu choi yeu cau")
    } finally {
      setActionLoading(null)
    }
  }

  const getFilteredRequests = () => {
    if (filterStatus === "ALL") {
      return requests
    }

    return requests.filter((request) => normalizeRequestStatus(request) === filterStatus)
  }

  const getRequestStats = () => {
    return {
      total: requests.length,
      pending: requests.filter((request) => normalizeRequestStatus(request) === "PENDING").length,
      approved: requests.filter((request) => normalizeRequestStatus(request) === "APPROVED").length,
      rejected: requests.filter((request) => normalizeRequestStatus(request) === "REJECTED").length,
    }
  }

  return {
    requests: getFilteredRequests(),
    allRequests: requests,
    loading,
    error,
    filterStatus,
    setFilterStatus,
    actionLoading,
    stats: getRequestStats(),
    rejectReason,
    setRejectReason,
    rejectFieldId,
    setRejectFieldId,
    handleApproveField,
    handleRejectField,
  }
}
