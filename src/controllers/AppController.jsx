import React from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import "../app.css"
import { getAuthCheckingMessage } from "../models/authModel"
import { ROUTES } from "../models/routeModel"
import { useAppController } from "./useAppController"
import AppView from "../views/AppView"
import FooterController from "./layout/FooterController"
import NavbarController from "./layout/NavbarController"
import HomeController from "./pages/HomeController"
import LoginController from "./pages/LoginController"
import RegisterController from "./pages/RegisterController"
import UsersController from "./pages/UsersController"

const AppController = () => {
  const { authToken, currentUser, checkingAuth, handleLoginSuccess, handleLogout } =
    useAppController()

  return (
    <AppView
      navbar={<NavbarController currentUser={currentUser} onLogout={handleLogout} />}
      footer={<FooterController />}
      checkingAuth={checkingAuth}
      authMessage={getAuthCheckingMessage()}
    >
      <Routes>
        <Route path={ROUTES.home} element={<HomeController />} />
        <Route
          path={ROUTES.users}
          element={<UsersController authToken={authToken} currentUser={currentUser} />}
        />
        <Route
          path={ROUTES.login}
          element={<LoginController onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path={ROUTES.register} element={<RegisterController />} />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </AppView>
  )
}

export default AppController
