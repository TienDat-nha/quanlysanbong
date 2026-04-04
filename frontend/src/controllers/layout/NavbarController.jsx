import React from "react"
import { createNavbarModel } from "../../models/layout/navbarModel"
import NavbarView from "../../views/layout/NavbarView"
import { useNavbarController } from "./useNavbarController"

const NavbarController = ({ currentUser, onLogout }) => {
  const viewModel = createNavbarModel(currentUser)
  const { isMenuOpen, closeMenu, openMenu, handleLogout } = useNavbarController({
    onLogout,
  })

  return (
    <NavbarView
      {...viewModel}
      isMenuOpen={isMenuOpen}
      closeMenu={closeMenu}
      openMenu={openMenu}
      onLogoutClick={handleLogout}
    />
  )
}

export default NavbarController
