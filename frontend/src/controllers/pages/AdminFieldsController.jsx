import React from "react"
import AdminFieldsView from "../../views/pages/AdminFieldsView"
import { useAdminFieldsController } from "./useAdminFieldsController"

const AdminFieldsController = ({ authToken, currentUser }) => {
  const viewModel = useAdminFieldsController({ authToken, currentUser })

  return <AdminFieldsView {...viewModel} />
}

export default AdminFieldsController
