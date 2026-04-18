/**
 * Hook quản lý logic duyệt yêu cầu tạo sân (Admin)
 * 
 * Chức năng:
 * - Tải danh sách yêu cầu tạo sân từ API (các sân với trạng thái PENDING, APPROVED, REJECTED)
 * - Lọc yêu cầu theo trạng thái (ALL, PENDING, APPROVED, REJECTED)
 * - Duyệt yêu cầu (gọi API approveAdminField)
 * - Từ chối yêu cầu với lý do (gọi API rejectAdminField)
 * - Quản lý trạng thái lý do từ chối, fieldId cần từ chối
 * - Tính toán thống kê yêu cầu theo trạng thái
 * - Quản lý trạng thái tải, lỗi, thực hiện action
  
 
 */

import { useCallback, useEffect, useState } from "react"
import * as API from "../../models/api"

export const useAdminFieldRequestsController = (authToken, currentUser) => {
  // State quản lý danh sách yêu cầu tạo sân, trạng thái tải, lỗi, bộ lọc trạng thái, trạng thái thực hiện action, lý do từ chối, fieldId cần từ chối 
  const [requests, setRequests] = useState([])
   // Nếu cần lưu danh sách gốc không lọc
  const [loading, setLoading] = useState(false)
  // Nếu cần lưu lỗi chung
  const [error, setError] = useState(null)
  // Bộ lọc trạng thái yêu cầu (ALL, PENDING, APPROVED, REJECTED)
  const [filterStatus, setFilterStatus] = useState("PENDING")
  // Trạng thái đang thực hiện action (fieldId đang duyệt/từ chối hoặc null)
  const [actionLoading, setActionLoading] = useState(null)
  // Lý do từ chối yêu cầu
  const [rejectReason, setRejectReason] = useState("")
  // FieldId của yêu cầu đang được từ chối (để hiển thị modal nhập lý do)
  const [rejectFieldId, setRejectFieldId] = useState(null)
// Hàm tải yêu cầu tạo sân từ API
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

  // Hàm xử lý duyệt yêu cầu
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

  // Hàm xử lý từ chối yêu cầu với lý do
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

  // Hàm lọc yêu cầu theo trạng thái
  const getFilteredRequests = () => {
    if (filterStatus === "ALL") {
      return requests
    }
    return requests.filter(req => req?.status === filterStatus)
  }

  // Hàm tính toán thống kê yêu cầu theo trạng thái
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
