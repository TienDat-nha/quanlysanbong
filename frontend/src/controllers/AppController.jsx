import React from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import "../app.css"
import { getAuthCheckingMessage } from "../models/authModel"
import { ROUTES } from "../models/routeModel"
import { useAppController } from "./useAppController"
import AppView from "../views/AppView"
import FooterController from "./layout/FooterController"
import NavbarController from "./layout/NavbarController"
import AdminFieldsController from "./pages/AdminFieldsController"
import BookingController from "./pages/BookingController"
import ContactController from "./pages/ContactController"
import DepositPaymentController from "./pages/DepositPaymentController"
import FieldDetailController from "./pages/FieldDetailController"
import FieldsController from "./pages/FieldsController"
import HomeController from "./pages/HomeController"
import LoginController from "./pages/LoginController"
import RegisterController from "./pages/RegisterController"

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
        <Route path={ROUTES.fields} element={<FieldsController />} />
        <Route path={`${ROUTES.fields}/:id`} element={<FieldDetailController />} />
        <Route
          path={ROUTES.booking}
          element={<BookingController authToken={authToken} currentUser={currentUser} />}
        />
        <Route
          path={`${ROUTES.booking}/:fieldSlug`}
          element={<BookingController authToken={authToken} currentUser={currentUser} />}
        />
        <Route
          path={`${ROUTES.depositPayment}/:bookingId`}
          element={<DepositPaymentController authToken={authToken} currentUser={currentUser} />}
        />
        <Route path={ROUTES.contact} element={<ContactController />} />
        <Route
          path={ROUTES.login}
          element={<LoginController onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path={ROUTES.register} element={<RegisterController />} />
        <Route
          path={ROUTES.adminFields}
          element={<AdminFieldsController authToken={authToken} currentUser={currentUser} />}
        />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </AppView>
  )
}

export default AppController
