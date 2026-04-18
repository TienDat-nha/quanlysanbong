/**
 

 * Hook quản lý logic xem yêu cầu tạo sân của chủ sân
 * 
 * Chức năng:
 * - Tải danh sách yêu cầu tạo sân của chủ sân hiện tại từ API
 * - Lọc chỉ những sân thuộc về chủ sân hiện tại
 * - Lọc theo trạng thái yêu cầu (ALL, PENDING, APPROVED, REJECTED)
 * - Tính toán thống kê yêu cầu theo trạng thái
 * - Quản lý trạng thái tải, lỗi
 * 
 * Trả về:
 * - fields: Danh sách yêu cầu sân của chủ sân (đã lọc)
 * - allFields: Danh sách yêu cầu sân toàn bộ (không lọc)
 * - loading: Trạng thái đang tải
 * - error: Thông báo lỗi
 * - filterStatus: Bộ lọc trạng thái
 * - setFilterStatus: Hàm thay đổi bộ lọc
 * - stats: Thống kê yêu cầu
 */

import { useCallback, useEffect, useState } from "react"
import * as API from "../../models/api"

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
      
      // Filter chỉ những sân của owner hiện tại với status PENDING, APPROVED, REJECTED
      const ownerFields = (allFields || []).filter(field => {
        const isOwnerField = 
          field?.ownerUserId === currentUser?.id || 
          field?.userId === currentUser?.id ||
          field?.ownerEmail === currentUser?.email
        const isRequestStatus = ["PENDING", "APPROVED", "REJECTED"].includes(field?.status)
        return isOwnerField && isRequestStatus
      })
      
      setFields(ownerFields)
    } catch (err) {
      setError(err?.message || "Lỗi khi tải yêu cầu sân")
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
    return fields.filter(field => field?.status === filterStatus)
  }

  const getStatusStats = () => {
    return {
      total: fields.length,
      pending: fields.filter(f => f?.status === "PENDING").length,
      approved: fields.filter(f => f?.status === "APPROVED").length,
      rejected: fields.filter(f => f?.status === "REJECTED").length,
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
