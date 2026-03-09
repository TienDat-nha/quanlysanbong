import { useEffect, useState } from "react"
import { isAdminUser } from "../../models/authModel"
import {
  createPublicUser,
  deletePublicUser,
  getPublicUsers,
  updatePublicUser,
} from "../../models/api"
import { getUserItem, getUserList } from "../../models/userModel"

const INITIAL_FORM_VALUES = Object.freeze({
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "USER",
})

export const useUsersController = ({ authToken, currentUser }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [editingUserId, setEditingUserId] = useState(null)
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)

  const canManageUsers = Boolean(authToken) && isAdminUser(currentUser)

  useEffect(() => {
    let mounted = true

    const loadUsers = async () => {
      try {
        const data = await getPublicUsers()

        if (mounted) {
          setUsers(getUserList(data))
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
  }, [])

  const resetForm = () => {
    setFormValues(INITIAL_FORM_VALUES)
    setEditingUserId(null)
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
      return "Chỉ tài khoản ADMIN mới được tạo, sửa hoặc xóa người dùng."
    }

    if (!String(formValues.name || "").trim()) {
      return "Vui lòng nhập tên người dùng."
    }

    if (!String(formValues.email || "").trim()) {
      return "Vui lòng nhập email."
    }

    if (!String(formValues.phone || "").trim()) {
      return "Vui lòng nhập số điện thoại."
    }

    if (!editingUserId && !String(formValues.password || "").trim()) {
      return "Vui lòng nhập mật khẩu cho người dùng mới."
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
      if (editingUserId) {
        const updatedUser = getUserItem(
          await updatePublicUser(authToken, editingUserId, formValues)
        )

        setUsers((currentUsers) =>
          currentUsers.map((user) => (user.id === editingUserId ? updatedUser || user : user))
        )
        setSuccessMessage("Cập nhật người dùng thành công.")
      } else {
        const createdUser = getUserItem(await createPublicUser(authToken, formValues))

        setUsers((currentUsers) => getUserList([...currentUsers, createdUser].filter(Boolean)))
        setSuccessMessage("Thêm người dùng thành công.")
      }

      resetForm()
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = (user) => {
    if (!canManageUsers) {
      setError("Chỉ tài khoản ADMIN mới được sửa người dùng.")
      return
    }

    setEditingUserId(user.id)
    setFormValues({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: "",
      role: user.role,
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
      setError("Chỉ tài khoản ADMIN mới được xóa người dùng.")
      return
    }

    const shouldDelete = window.confirm(`Xóa người dùng ${user.name}?`)
    if (!shouldDelete) {
      return
    }

    setDeletingUserId(user.id)
    setError("")
    setSuccessMessage("")

    try {
      await deletePublicUser(authToken, user.id)

      setUsers((currentUsers) => currentUsers.filter((item) => item.id !== user.id))

      if (editingUserId === user.id) {
        resetForm()
      }

      setSuccessMessage("Xóa người dùng thành công.")
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setDeletingUserId(null)
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
    isEditing: Boolean(editingUserId),
    canManageUsers,
    onInputChange: handleInputChange,
    onSubmit: handleSubmit,
    onEditUser: handleEditUser,
    onCancelEdit: handleCancelEdit,
    onDeleteUser: handleDeleteUser,
  }
}
