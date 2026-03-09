import React from "react"
import UsersView from "../../views/pages/UsersView"
import { useUsersController } from "./useUsersController"

const UsersController = ({ authToken, currentUser }) => {
  const viewModel = useUsersController({ authToken, currentUser })

  return <UsersView {...viewModel} />
}

export default UsersController
