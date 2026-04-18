/**
 * useAppController.js
 * ====================
 * Hook quản lý trạng thái xác thực và thông tin người dùng toàn bộ app
 *
 * Chức năng:
 * - Quản lý token xác thực (lưu/lấy từ localStorage)
 * - Quản lý thông tin người dùng hiện tại
 * - Tải dữ liệu người dùng từ API khi có token
 * - Xử lý lỗi xác thực (token hết hạn, không hợp lệ)
 * - Theo dõi trạng thái đang kiểm tra xác thực
 *
 * Trả về:
 * - authToken: Token xác thực
 * - currentUser: Thông tin người dùng hiện tại
 * - checkingAuth: Trạng thái đang kiểm tra xác thực
 * - Các hàm để cập nhật token và thông tin người dùng
 */

import { useEffect, useState } from "react";
import { getMe } from "../models/api";
import {
  attachLoginAccountType,
  clearStoredAuthToken,
  clearStoredLoginAccountType,
  getStoredAuthToken,
  getStoredLoginAccountType,
  persistAuthToken,
  persistLoginAccountType,
} from "../models/authModel";

export const useAppController = () => {
  const [authToken, setAuthToken] = useState(() => getStoredAuthToken());
  const [loginAccountType, setLoginAccountType] = useState(() =>
    getStoredLoginAccountType(),
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      setCheckingAuth(false);

      if (loginAccountType) {
        setLoginAccountType("");
        clearStoredLoginAccountType();
      }

      return;
    }

    let mounted = true;

    const loadUser = async () => {
      try {
        const data = await getMe(authToken);
        if (mounted) {
          setCurrentUser(attachLoginAccountType(data.user, loginAccountType));
        }
      } catch (error) {
        if (mounted) {
          setAuthToken("");
          setLoginAccountType("");
          setCurrentUser(null);
          clearStoredAuthToken();
          clearStoredLoginAccountType();
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [authToken, loginAccountType]);

  const handleLoginSuccess = (token, user, accountType) => {
    const nextUser = attachLoginAccountType(user, accountType);
    const nextAccountType = String(nextUser?.loginAccountType || "")
      .trim()
      .toLowerCase();

    setAuthToken(token);
    setLoginAccountType(nextAccountType);
    setCurrentUser(nextUser || null);
    persistAuthToken(token);
    persistLoginAccountType(nextAccountType);
    setCheckingAuth(false);
  };

  const handleLogout = () => {
    setAuthToken("");
    setLoginAccountType("");
    setCurrentUser(null);
    clearStoredAuthToken();
    clearStoredLoginAccountType();
    setCheckingAuth(false);
  };

  return {
    authToken,
    currentUser,
    checkingAuth,
    handleLoginSuccess,
    handleLogout,
  };
};
