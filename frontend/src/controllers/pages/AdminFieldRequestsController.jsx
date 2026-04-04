import React from "react"
import { useAdminFieldRequestsController } from "./useAdminFieldRequestsController"
import AdminFieldRequestsView from "../../views/pages/AdminFieldRequestsView"

const AdminFieldRequestsController = ({ authToken, currentUser }) => {
  const viewModel = useAdminFieldRequestsController(authToken, currentUser)

  return <AdminFieldRequestsView {...viewModel} />
}

export default AdminFieldRequestsController
