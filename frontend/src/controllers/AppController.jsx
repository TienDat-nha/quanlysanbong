import React from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import "../App.css"
import { getAuthCheckingMessage, isAdminUser, isOwnerUser } from "../models/authModel"
import { ROUTES } from "../models/routeModel"
import { useAppController } from "./useAppController"
import AppView from "../views/AppView"
import FooterController from "./layout/FooterController"
import NavbarController from "./layout/NavbarController"
import AdminFieldsController from "./pages/AdminFieldsController"
import AdminBookingsController from "./pages/AdminBookingsController"
import AdminOwnerFieldsController from "./pages/AdminOwnerFieldsController"
import AdminFieldRequestsController from "./pages/AdminFieldRequestsController"
import OwnerFieldRequestsController from "./pages/OwnerFieldRequestsController"
import BookingController from "./pages/BookingController"
import DepositPaymentController from "./pages/DepositPaymentController"
import FieldDetailController from "./pages/FieldDetailController"
import FieldsController from "./pages/FieldsController"
import HomeController from "./pages/HomeController"
import LoginController from "./pages/LoginController"
import RegisterController from "./pages/RegisterController"
import UsersController from "./pages/UsersController"
import MyPaymentsController from "./pages/MyPaymentsController"

const getRoleHomePath = (currentUser) => {
  if (isAdminUser(currentUser)) {
    return ROUTES.adminUsers
  }

  if (isOwnerUser(currentUser)) {
    return ROUTES.adminFields
  }

  return ROUTES.home
}

const ProtectedPortalRoute = ({
  authToken,
  currentUser,
  allowAdmin = false,
  allowOwner = false,
  children,
}) => {
  const location = useLocation()

  if (!authToken || !currentUser) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
          message: "Đăng nhập để tiếp tục.",
        }}
      />
    )
  }

  const isAllowed =
    (allowAdmin && isAdminUser(currentUser)) || (allowOwner && isOwnerUser(currentUser))

  if (!isAllowed) {
    return <Navigate to={getRoleHomePath(currentUser)} replace />
  }

  return children
}

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
        <Route
          path={ROUTES.login}
          element={<LoginController onLoginSuccess={handleLoginSuccess} />}
        />
        <Route path={ROUTES.register} element={<RegisterController />} />
        <Route
          path={ROUTES.adminFields}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowOwner
            >
              <AdminFieldsController authToken={authToken} currentUser={currentUser} />
            </ProtectedPortalRoute>
          }
        />
        <Route
          path={ROUTES.adminBookings}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowOwner
            >
              <AdminBookingsController authToken={authToken} currentUser={currentUser} />
            </ProtectedPortalRoute>
          }
        />
        <Route
          path={ROUTES.adminOwnerFields}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowAdmin
            >
              <AdminOwnerFieldsController authToken={authToken} currentUser={currentUser} />
            </ProtectedPortalRoute>
          }
        />
        <Route
          path={ROUTES.adminFieldRequests}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowAdmin
            >
              <AdminFieldRequestsController authToken={authToken} currentUser={currentUser} />
            </ProtectedPortalRoute>
          }
        />
        <Route
          path={ROUTES.ownerFieldRequests}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowOwner
            >
              <OwnerFieldRequestsController authToken={authToken} currentUser={currentUser} />
            </ProtectedPortalRoute>
          }
        />
        <Route
          path={ROUTES.adminUsers}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowAdmin
            >
              <UsersController authToken={authToken} currentUser={currentUser} />
            </ProtectedPortalRoute>
          }
        />
        <Route
          path={ROUTES.myPayments}
          element={
            authToken ? (
              <MyPaymentsController authToken={authToken} />
            ) : (
              <Navigate
                to={ROUTES.login}
                replace
                state={{
                  from: ROUTES.myPayments,
                  message: "Đăng nhập để xem lịch sử thanh toán.",
                }}
              />
            )
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </AppView>
  )
}

export default AppController
