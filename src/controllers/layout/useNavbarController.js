import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "../../models/routeModel"

export const useNavbarController = ({ onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const openMenu = useCallback(() => {
    setIsMenuOpen(true)
  }, [])

  const handleLogout = useCallback(() => {
    onLogout?.()
    closeMenu()
    navigate(ROUTES.login)
  }, [closeMenu, navigate, onLogout])

  return {
    isMenuOpen,
    closeMenu,
    openMenu,
    handleLogout,
  }
}
