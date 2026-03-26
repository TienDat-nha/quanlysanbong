import { useEffect, useMemo, useState } from "react"
import { isAdminUser } from "../../models/authModel"
import {
  createPublicUser,
  deletePublicUser,
  getPublicUsers,
  updatePublicUser,
} from "../../models/api"
import {
  getApiRoleValue,
  getManagedUserRoleLabel,
  getUserList,
  getUserSummary,
} from "../../models/userModel"
import { ROUTES } from "../../models/routeModel"

const INITIAL_FORM_VALUES = Object.freeze({
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "USER",
})

const ROLE_OPTIONS = Object.freeze([
  { value: "USER", label: "Người dùng" },
  { value: "ADMIN", label: "Chủ sân" },
])

export const useUsersController = ({ authToken, currentUser }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [editingUserId, setEditingUserId] = useState(null)
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)
  const [statusActionUserId, setStatusActionUserId] = useState("")
  const [statusActionMode, setStatusActionMode] = useState("")

  const canManageUsers = Boolean(authToken) && isAdminUser(currentUser)
  const summary = useMemo(() => getUserSummary(users), [users])

  const fetchUsers = async () => {
    const data = await getPublicUsers()
    return getUserList(data)
  }

  useEffect(() => {
    let mounted = true

    if (!canManageUsers) {
      setUsers([])
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    const loadUsers = async () => {
      setLoading(true)

      try {
        const nextUsers = await fetchUsers()

        if (mounted) {
          setUsers(nextUsers)
          setError("")
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

    loadUsers()

    return () => {
      mounted = false
    }
  }, [canManageUsers])

  const refreshUsers = async () => {
    const nextUsers = await fetchUsers()
    setUsers(nextUsers)
    return nextUsers
  }

  const resetForm = () => {
    setFormValues(INITIAL_FORM_VALUES)
    setEditingUserId(null)
  }

  const isCurrentAdminAccount = (user) => {
    const currentId = String(currentUser?.id || currentUser?._id || "").trim()
    const currentEmail = String(currentUser?.email || "").trim().toLowerCase()
    const targetId = String(user?.id || "").trim()
    const targetEmail = String(user?.email || "").trim().toLowerCase()

    return Boolean((currentId && targetId && currentId === targetId) || (currentEmail && targetEmail && currentEmail === targetEmail))
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const validateAdminForm = () => {
    if (!canManageUsers) {
      return "Chỉ tài khoản admin mới được tạo, sửa hoặc xóa tài khoản."
    }

    if (!String(formValues.name || "").trim()) {
      return "Vui lòng nhập tên tài khoản."
    }

    if (!String(formValues.email || "").trim()) {
      return "Vui lòng nhập email."
    }

    if (!String(formValues.phone || "").trim()) {
      return "Vui lòng nhập số điện thoại."
    }

    if (!editingUserId && !String(formValues.password || "").trim()) {
      return "Vui lòng nhập mật khẩu cho tài khoản mới."
    }

    if (!["USER", "ADMIN"].includes(String(formValues.role || "").trim().toUpperCase())) {
      return "Vai trò tài khoản không hợp lệ."
    }

    return ""
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccessMessage("")

    const validationError = validateAdminForm()
    if (validationError) {
      setError(validationError)
      setSubmitting(false)
      return
    }

    try {
      const payload = {
        ...formValues,
        role: getApiRoleValue(formValues.role),
      }

      if (editingUserId) {
        await updatePublicUser(authToken, editingUserId, payload)
        setSuccessMessage("Cập nhật tài khoản thành công.")
      } else {
        await createPublicUser(authToken, payload)
        setSuccessMessage(`Đã tạo ${getManagedUserRoleLabel(payload.role).toLowerCase()} mới.`)
      }

      await refreshUsers()
      resetForm()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản admin mới được sửa tài khoản.")
      return
    }

    setEditingUserId(user.id)
    setFormValues({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: "",
      role: getApiRoleValue(user.role),
    })
    setError("")
    setSuccessMessage("")
  }

  const handleCancelEdit = () => {
    resetForm()
    setError("")
    setSuccessMessage("")
  }

  const handleDeleteUser = async (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản admin mới được xóa tài khoản.")
      return
    }

    if (isCurrentAdminAccount(user)) {
      setError("Không thể xóa tài khoản admin đang đăng nhập.")
      return
    }

    const shouldDelete = window.confirm(`Xóa tài khoản ${user.name}?`)
    if (!shouldDelete) {
      return
    }

    setDeletingUserId(user.id)
    setError("")
    setSuccessMessage("")

    try {
      await deletePublicUser(authToken, user.id)
      await refreshUsers()

      if (editingUserId === user.id) {
        resetForm()
      }

      setSuccessMessage("Xóa tài khoản thành công.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleToggleUserStatus = async (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản admin mới được khóa hoặc mở khóa tài khoản.")
      return
    }

    if (isCurrentAdminAccount(user)) {
      setError("Không thể khóa tài khoản admin đang đăng nhập.")
      return
    }

    const nextLocked = !user.isLocked
    const shouldContinue = window.confirm(
      nextLocked
        ? `Khóa tài khoản ${user.name}?`
        : `Mở khóa tài khoản ${user.name}?`
    )

    if (!shouldContinue) {
      return
    }

    setStatusActionUserId(user.id)
    setStatusActionMode(nextLocked ? "lock" : "unlock")
    setError("")
    setSuccessMessage("")

    try {
      await updatePublicUser(authToken, user.id, {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: getApiRoleValue(user.role),
        isDeleted: nextLocked,
        isActive: !nextLocked,
        locked: nextLocked,
        isLocked: nextLocked,
        status: nextLocked ? "LOCKED" : "ACTIVE",
      })

      const nextUsers = await refreshUsers()
      const refreshedUser = nextUsers.find((item) => item.id === user.id)

      if (refreshedUser && refreshedUser.isLocked !== nextLocked) {
        setError("Backend chưa phản ánh trạng thái khóa/mở khóa mới của tài khoản này.")
        return
      }

      setSuccessMessage(nextLocked ? "Đã khóa tài khoản." : "Đã mở khóa tài khoản.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setStatusActionUserId("")
      setStatusActionMode("")
    }
  }

  return {
    users,
    loading,
    error,
    successMessage,
    formValues,
    submitting,
    deletingUserId,
    statusActionUserId,
    statusActionMode,
    isEditing: Boolean(editingUserId),
    canManageUsers,
    isAuthenticated: Boolean(authToken),
    currentUser,
    roleOptions: ROLE_OPTIONS,
    summary,
    loginPath: ROUTES.login,
    onInputChange: handleInputChange,
    onSubmit: handleSubmit,
    onEditUser: handleEditUser,
    onCancelEdit: handleCancelEdit,
    onDeleteUser: handleDeleteUser,
    onToggleUserStatus: handleToggleUserStatus,
    onRefresh: refreshUsers,
  }
}
