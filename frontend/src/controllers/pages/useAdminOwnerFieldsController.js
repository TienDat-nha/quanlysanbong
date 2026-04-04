import { useEffect, useState } from "react"
import {
  approveAdminField,
  getAdminFields,
  lockAdminField,
  rejectAdminField,
  unlockAdminField,
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

const normalizeErrorKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

const isAlreadyLockedError = (value = "") =>
  normalizeErrorKey(value).includes("chi duoc khoa san da duyet")

const isAlreadyUnlockedError = (value = "") =>
  normalizeErrorKey(value).includes("san chua bi khoa")

const fetchFilteredFields = async (token, filterApprovalStatus = "ALL") => {
  const response = await getAdminFields(token)
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
        setError(err?.message || "Lỗi tải danh sách sân của chủ sân")
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
      setError(err?.message || "Lỗi phê duyệt sân")
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
      setError(err?.message || "Lỗi từ chối sân")
    } finally {
      setActionLoading(null)
    }
  }

  const handleLockField = async (fieldId) => {
    try {
      setActionLoading(fieldId)
      setError(null)
      await lockAdminField(authToken, fieldId)
      setFields((currentFields) =>
        filterFieldsByApprovalStatus(
          patchFieldStatus(currentFields, fieldId, "LOCKED"),
          filterApprovalStatus
        )
      )
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
    } catch (err) {
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
      setError(
        isAlreadyLockedError(err?.message)
          ? "Sân này đang ở trạng thái đã khóa. Bạn có thể bấm mở khóa để kích hoạt lại."
          : err?.message || "Lỗi khóa sân"
      )
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnlockField = async (fieldId) => {
    try {
      setActionLoading(fieldId)
      setError(null)
      await unlockAdminField(authToken, fieldId)
      setFields((currentFields) =>
        filterFieldsByApprovalStatus(
          patchFieldStatus(currentFields, fieldId, "APPROVED"),
          filterApprovalStatus
        )
      )
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
    } catch (err) {
      setFields(await fetchFilteredFields(authToken, filterApprovalStatus))
      setError(
        isAlreadyUnlockedError(err?.message)
          ? "Sân này hiện không ở trạng thái khóa."
          : err?.message || "Lỗi mở khóa sân"
      )
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
    handleLockField,
    handleUnlockField,
    actionLoading,
  }
}
