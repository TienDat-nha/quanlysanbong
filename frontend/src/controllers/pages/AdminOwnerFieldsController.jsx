import React from "react"
import AdminOwnerFieldsView from "../../views/pages/AdminOwnerFieldsView"
import { useAdminOwnerFieldsController } from "./useAdminOwnerFieldsController"

const AdminOwnerFieldsController = ({ authToken, currentUser }) => {
  const viewModel = useAdminOwnerFieldsController({ authToken, currentUser })

  return <AdminOwnerFieldsView {...viewModel} />
}

export default AdminOwnerFieldsController
