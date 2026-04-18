/**
 * routeModel.js
 * =============
 * Model quản lý các đường dẫn (routes) của ứng dụng
 *
 * Chức năng:
 * - Định nghĩa tất cả đường dẫn (paths) của ứng dụng
 * - Tạo đường dẫn động (dynamic routes)
 * - Tạo đường dẫn với hash (#) cho các phần trong trang
 * - Định nghĩa các section trong admin dashboard
 *
 * Hằng số:
 * - ROUTES: Tất cả các đường dẫn chính
 * - STAFF_DASHBOARD_SECTIONS: Các section trong admin dashboard
 *
 * Hàm chính:
 * - createRouteWithHash(): Tạo đường dẫn với hash
 * - createAdminFieldsSectionRoute(): Tạo đường dẫn admin fields section
 * - createFieldDetailRoute(): Tạo đường dẫn chi tiết sân
 * - createBookingRoute(): Tạo đường dẫn đặt sân
 * - createDepositPaymentRoute(): Tạo đường dẫn thanh toán cọc
 */

export const ROUTES = Object.freeze({
  home: "/",
  users: "/users",
  adminUsers: "/quan-tri",
  login: "/dang-nhap",
  register: "/dang-ky",
  adminFields: "/quan-ly-san",
  adminBookings: "/quan-ly-dat-san",
  adminOwnerFields: "/quan-ly-san-chu-san",
  adminFieldRequests: "/duyet-yeu-cau-tao-san",
  ownerFieldRequests: "/yeu-cau-tao-san-cua-toi",
  fields: "/san-bong",
  booking: "/dat-san",
  depositPayment: "/thanh-toan-dat-coc",
  myPayments: "/thanh-toan-cua-toi",
});

export const STAFF_DASHBOARD_SECTIONS = Object.freeze({
  manageFields: "quan-ly-san",
  fieldList: "danh-sach-san",
  ownerBookings: "don-dat-khach",
  adminBookings: "quan-ly-tat-ca-dat-san",
  adminOwnerFields: "quan-ly-san-chu-san",
  adminFieldRequests: "duyet-yeu-cau-tao-san",
  ownerFieldRequests: "yeu-cau-tao-san-cua-toi",
});

export const createRouteWithHash = (path, hash = "") => {
  const normalizedHash = String(hash || "")
    .replace(/^#+/g, "")
    .trim();
  return normalizedHash ? `${path}#${normalizedHash}` : path;
};

export const createAdminFieldsSectionRoute = (section = "") => {
  const normalizedSection = String(section || "")
    .replace(/^#+/g, "")
    .trim();
  return !normalizedSection ||
    normalizedSection === STAFF_DASHBOARD_SECTIONS.manageFields
    ? ROUTES.adminFields
    : createRouteWithHash(ROUTES.adminFields, normalizedSection);
};

export const createFieldDetailRoute = (fieldId) =>
  `${ROUTES.fields}/${fieldId}`;
export const createBookingRoute = (fieldSlug = "", fieldId = "") => {
  const normalizedSlug = String(fieldSlug || "").trim();
  const normalizedFieldId = String(fieldId || "").trim();
  const basePath = normalizedSlug
    ? `${ROUTES.booking}/${normalizedSlug}`
    : ROUTES.booking;

  return normalizedFieldId
    ? `${basePath}?fieldId=${encodeURIComponent(normalizedFieldId)}`
    : basePath;
};
export const createDepositPaymentRoute = (bookingId) =>
  `${ROUTES.depositPayment}/${bookingId}`;
export const createPublicBookingUrl = (origin, fieldSlug = "", fieldId = "") =>
  `${String(origin || "").replace(/\/+$/g, "")}${createBookingRoute(fieldSlug, fieldId)}`;
