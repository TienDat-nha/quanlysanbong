import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import "../App.css";
import {
  getAuthCheckingMessage,
  isAdminUser,
  isOwnerUser,
} from "../models/authModel";
import { ROUTES } from "../models/routeModel";
import { useAppController } from "./useAppController";
import AppView from "../views/AppView";
import FooterController from "./layout/FooterController";
import NavbarController from "./layout/NavbarController";
import AdminFieldsController from "./pages/AdminFieldsController";
import AdminBookingsController from "./pages/AdminBookingsController";
import AdminOwnerFieldsController from "./pages/AdminOwnerFieldsController";
import AdminFieldRequestsController from "./pages/AdminFieldRequestsController";
import OwnerFieldRequestsController from "./pages/OwnerFieldRequestsController";
import BookingController from "./pages/BookingController";
import DepositPaymentController from "./pages/DepositPaymentController";
import FieldDetailController from "./pages/FieldDetailController";
import FieldsController from "./pages/FieldsController";
import HomeController from "./pages/HomeController";
import LoginController from "./pages/LoginController";
import RegisterController from "./pages/RegisterController";
import UsersController from "./pages/UsersController";
import MyPaymentsController from "./pages/MyPaymentsController";
// Định nghĩa hàm để lấy đường dẫn trang chủ dựa trên vai trò người dùng
const getRoleHomePath = (currentUser) => {
  if (isAdminUser(currentUser)) {
    return ROUTES.adminUsers;
  }
  // Chủ sân bóng có thể xem trang quản lý sân bóng của mình
  if (isOwnerUser(currentUser)) {
    return ROUTES.adminFields;
  }

  return ROUTES.home;
};
// Component route bảo vệ cho các trang chỉ dành cho admin hoặc owner
const ProtectedPortalRoute = ({
  authToken,
  currentUser,
  allowAdmin = false,
  allowOwner = false,
  children,
}) => {
  const location = useLocation();
  // Nếu chưa có token hoặc thông tin người dùng, chuyển hướng đến trang đăng nhập
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
    );
  }
  // Kiểm tra quyền truy cập dựa trên vai trò người dùng
  const isAllowed =
    (allowAdmin && isAdminUser(currentUser)) ||
    (allowOwner && isOwnerUser(currentUser));

  if (!isAllowed) {
    return <Navigate to={getRoleHomePath(currentUser)} replace />;
  }

  return children;
};
// Component chính của ứng dụng, quản lý routing và layout chung
const AppController = () => {
  const {
    authToken,
    currentUser,
    checkingAuth,
    handleLoginSuccess,
    handleLogout,
  } = useAppController();
  // Render layout chung với navbar, footer và nội dung trang dựa trên route
  return (
    <AppView
      navbar={
        <NavbarController currentUser={currentUser} onLogout={handleLogout} />
      }
      footer={<FooterController />}
      checkingAuth={checkingAuth}
      authMessage={getAuthCheckingMessage()}
    >
      // Định nghĩa các route cho ứng dụng, bao gồm cả route bảo vệ cho admin và
      owner
      <Routes>
        <Route path={ROUTES.home} element={<HomeController />} />
        <Route path={ROUTES.fields} element={<FieldsController />} />
        <Route
          path={`${ROUTES.fields}/:id`}
          element={<FieldDetailController />}
        />
        <Route
          path={ROUTES.booking}
          element={
            <BookingController
              authToken={authToken}
              currentUser={currentUser}
            />
          }
        />
        // Trang đặt sân yêu cầu token, nếu chưa đăng nhập sẽ chuyển hướng đến
        trang đăng nhập
        <Route
          path={`${ROUTES.booking}/:fieldSlug`}
          element={
            <BookingController
              authToken={authToken}
              currentUser={currentUser}
            />
          }
        />
        // Trang thanh toán đặt cọc yêu cầu token, nếu chưa đăng nhập sẽ chuyển
        hướng đến trang đăng nhập
        <Route
          path={`${ROUTES.depositPayment}/:bookingId`}
          element={
            <DepositPaymentController
              authToken={authToken}
              currentUser={currentUser}
            />
          }
        />
        // Trang đăng nhập không yêu cầu token, nhưng nếu đã đăng nhập thì sẽ
        chuyển hướng về trang chủ phù hợp với vai trò
        <Route
          path={ROUTES.login}
          element={<LoginController onLoginSuccess={handleLoginSuccess} />}
        />
        // Đăng ký không yêu cầu token, nhưng nếu đã đăng nhập thì sẽ chuyển
        hướng về trang chủ phù hợp với vai trò
        <Route path={ROUTES.register} element={<RegisterController />} />
        // Các trang quản lý dành cho admin và owner, yêu cầu token và kiểm tra
        quyền truy cập
        <Route
          path={ROUTES.adminFields}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowOwner
            >
              // Chủ sân bóng có thể xem và quản lý sân bóng của mình, admin có
              thể xem và quản lý tất cả sân bóng
              <AdminFieldsController
                authToken={authToken}
                currentUser={currentUser}
              />
            </ProtectedPortalRoute>
          }
        />
        // Trang quản lý đặt sân dành cho admin và owner, yêu cầu token và kiểm
        tra quyền truy cập
        <Route
          path={ROUTES.adminBookings}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowOwner
            >
              // Chủ sân bóng có thể xem và quản lý đặt sân của mình, admin có
              thể xem và quản lý tất cả đặt sân
              <AdminBookingsController
                authToken={authToken}
                currentUser={currentUser}
              />
            </ProtectedPortalRoute>
          }
        />
        // Trang quản lý sân bóng của chủ sân bóng, chỉ dành cho owner, yêu cầu
        token và kiểm tra quyền truy cập
        <Route
          path={ROUTES.adminOwnerFields}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowAdmin
            >
              // Chủ sân bóng có thể xem và quản lý sân bóng của mình, admin có
              thể xem và quản lý tất cả sân bóng
              <AdminOwnerFieldsController
                authToken={authToken}
                currentUser={currentUser}
              />
            </ProtectedPortalRoute>
          }
        />
        // Trang quản lý yêu cầu tạo sân bóng, dành cho admin, yêu cầu token và
        kiểm tra quyền truy cập
        <Route
          path={ROUTES.adminFieldRequests}
          element={
            // Chỉ admin mới có thể xem và quản lý yêu cầu tạo sân bóng, yêu cầu token và kiểm tra quyền truy cập
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowAdmin
            >
              // Chỉ admin mới có thể xem và quản lý yêu cầu tạo sân bóng
              <AdminFieldRequestsController
                authToken={authToken}
                currentUser={currentUser}
              />
            </ProtectedPortalRoute>
          }
        />
        // Trang quản lý yêu cầu tạo sân bóng của chủ sân bóng, chỉ dành cho
        owner, yêu cầu token và kiểm tra quyền truy cập
        <Route
          path={ROUTES.ownerFieldRequests}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowOwner
            >
              <OwnerFieldRequestsController
                authToken={authToken}
                currentUser={currentUser}
              />
            </ProtectedPortalRoute>
          }
        />
        // Trang quản lý người dùng dành cho admin, yêu cầu token và kiểm tra
        quyền truy cập
        <Route
          path={ROUTES.adminUsers}
          element={
            <ProtectedPortalRoute
              authToken={authToken}
              currentUser={currentUser}
              allowAdmin
            >
              // Chỉ admin mới có thể xem và quản lý người dùng
              <UsersController
                authToken={authToken}
                currentUser={currentUser}
              />
            </ProtectedPortalRoute>
          }
        />
        // Trang lịch sử thanh toán của người dùng, yêu cầu token, nếu chưa đăng
        nhập
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
  );
};

export default AppController;
