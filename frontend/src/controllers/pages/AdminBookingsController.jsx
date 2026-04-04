import React from "react"
import AdminBookingsView from "../../views/pages/AdminBookingsView"
import { useAdminBookingsController } from "./useAdminBookingsController"

const AdminBookingsController = ({ authToken, currentUser }) => {
  const viewModel = useAdminBookingsController({ authToken, currentUser })

  return <AdminBookingsView {...viewModel} />
}

export default AdminBookingsController
