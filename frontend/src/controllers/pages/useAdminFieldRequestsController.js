import { useCallback, useEffect, useState } from "react"
import * as API from "../../models/api"

export const useAdminFieldRequestsController = (authToken, currentUser) => {
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
      const { fields: allFields } = await API.getAdminFields(authToken)
      
      // Lấy tất cả sân có status PENDING, APPROVED, REJECTED (yêu cầu từ owners)
      const requestFields = (allFields || []).filter(field => {
        return ["PENDING", "APPROVED", "REJECTED"].includes(field?.status)
      })
      
      setRequests(requestFields)
    } catch (err) {
      setError(err?.message || "Lỗi khi tải yêu cầu sân")
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [authToken])

  useEffect(() => {
    loadFieldRequests()
  }, [loadFieldRequests])

  const handleApproveField = async (fieldId) => {
    if (!fieldId || !authToken) return

    try {
      setActionLoading(fieldId)
      await API.approveAdminField(authToken, fieldId)
      
      // Cập nhật state
      setRequests(prev => prev.map(req => 
        req.id === fieldId || req._id === fieldId 
          ? { ...req, status: "APPROVED" }
          : req
      ))
    } catch (err) {
      setError(err?.message || "Lỗi khi duyệt yêu cầu")
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectField = async (fieldId) => {
    if (!fieldId || !authToken) return

    try {
      setActionLoading(fieldId)
      await API.rejectAdminField(authToken, fieldId, rejectReason)
      
      // Cập nhật state
      setRequests(prev => prev.map(req => 
        req.id === fieldId || req._id === fieldId 
          ? { ...req, status: "REJECTED", rejectReason: rejectReason || "Không hợp lệ" }
          : req
      ))
      
      // Reset modal
      setRejectReason("")
      setRejectFieldId(null)
    } catch (err) {
      setError(err?.message || "Lỗi khi từ chối yêu cầu")
    } finally {
      setActionLoading(null)
    }
  }

  const getFilteredRequests = () => {
    if (filterStatus === "ALL") {
      return requests
    }
    return requests.filter(req => req?.status === filterStatus)
  }

  const getRequestStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r?.status === "PENDING").length,
      approved: requests.filter(r => r?.status === "APPROVED").length,
      rejected: requests.filter(r => r?.status === "REJECTED").length,
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
