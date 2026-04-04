import React from "react"
import { useOwnerFieldRequestsController } from "./useOwnerFieldRequestsController"
import OwnerFieldRequestsView from "../../views/pages/OwnerFieldRequestsView"

const OwnerFieldRequestsController = ({ authToken, currentUser }) => {
  const viewModel = useOwnerFieldRequestsController(authToken, currentUser)

  return <OwnerFieldRequestsView {...viewModel} />
}

export default OwnerFieldRequestsController
