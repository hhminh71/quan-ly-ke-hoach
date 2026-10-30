import { useState, useEffect, useRef, useCallback } from 'react';
import { ROLES, normalizeRole } from '../utils/permissions';

// 1. Cấu hình User thường: 30 phút không hoạt động (Inactivity Timeout), cảnh báo trước 2 phút
export const USER_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút = 1.800.000 ms
export const USER_WARNING_BEFORE_MS = 2 * 60 * 1000;      // Cảnh báo trước 2 phút = 120.000 ms

// 2. Cấu hình Admin: 8 giờ đăng xuất 1 lần (kể cả có hoạt động hay không), cảnh báo trước 5 phút
export const ADMIN_SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 giờ = 28.800.000 ms
export const ADMIN_WARNING_BEFORE_MS = 5 * 60 * 1000;       // Cảnh báo trước 5 phút = 300.000 ms

// Backward-compatible exports
export const DEFAULT_TIMEOUT_MS = USER_INACTIVITY_TIMEOUT_MS;
export const WARNING_BEFORE_MS = USER_WARNING_BEFORE_MS;

const STORAGE_KEY_LAST_ACTIVE = 'last_active_timestamp';
const STORAGE_KEY_LOGIN_TIME = 'session_login_timestamp';
const STORAGE_KEY_EXPIRED_MSG = 'session_expired_message';

export const setSessionExpiredMessage = (msg) => {
  if (msg) {
    sessionStorage.setItem(STORAGE_KEY_EXPIRED_MSG, msg);
  } else {
    sessionStorage.removeItem(STORAGE_KEY_EXPIRED_MSG);
  }
};

export const getSessionExpiredMessage = () => {
  return sessionStorage.getItem(STORAGE_KEY_EXPIRED_MSG) || '';
};

export const clearSessionExpiredMessage = () => {
  sessionStorage.removeItem(STORAGE_KEY_EXPIRED_MSG);
};

export const recordLoginTimestamp = () => {
  const now = String(Date.now());
  localStorage.setItem(STORAGE_KEY_LOGIN_TIME, now);
  localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now);
};

export const getLoginTimestamp = () => {
  const val = localStorage.getItem(STORAGE_KEY_LOGIN_TIME);
  return val ? Number(val) : 0;
};

export const recordActivityTimestamp = () => {
  localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(Date.now()));
};

export const getLastActivityTimestamp = () => {
  const val = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
  return val ? Number(val) : 0;
};

/**
 * Kiểm tra xem phiên lưu trữ có còn hiệu lực hay không
 * - Admin: Giới hạn tối đa 8 giờ kể từ lúc đăng nhập (kể cả có hoạt động hay không)
 * - User thường: Giới hạn 30 phút không hoạt động
 */
export const isSessionValid = (user = null) => {
  const now = Date.now();
  const isAdmin = user && normalizeRole(user.role) === ROLES.ADMIN;

  if (isAdmin) {
    const loginTime = getLoginTimestamp() || getLastActivityTimestamp();
    if (!loginTime) return false;
    return now - loginTime < ADMIN_SESSION_TIMEOUT_MS;
  } else {
    const lastActive = getLastActivityTimestamp();
    if (!lastActive) return false;
    return now - lastActive < USER_INACTIVITY_TIMEOUT_MS;
  }
};

/**
 * Hook giám sát phiên làm việc:
 * - Admin: Đăng xuất 1 lần sau 8 giờ kể từ khi đăng nhập (kể cả có hoạt động hay không)
 * - User: Tự động đăng xuất sau 30 phút không có thao tác
 */
export function useAutoLogout({
  user,
  onLogout,
}) {
  const isAdmin = Boolean(user && normalizeRole(user.role) === ROLES.ADMIN);
  const timeoutMs = isAdmin ? ADMIN_SESSION_TIMEOUT_MS : USER_INACTIVITY_TIMEOUT_MS;
  const warningMs = isAdmin ? ADMIN_WARNING_BEFORE_MS : USER_WARNING_BEFORE_MS;

  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(warningMs / 1000));

  const lastActivityRef = useRef(Date.now());
  const lastStorageWriteRef = useRef(0);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  // Lắng nghe thao tác người dùng (chuột, phím, chạm)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Với User thường: Hoạt động chuột/phím sẽ cập nhật mốc hoạt động và ẩn cảnh báo
    if (!isAdmin) {
      if (now - lastStorageWriteRef.current > 10000) {
        lastStorageWriteRef.current = now;
        recordActivityTimestamp();
      }

      if (showWarning) {
        setShowWarning(false);
      }
    }
  }, [isAdmin, showWarning]);

  // Gia hạn phiên làm việc chủ động khi bấm nút trên modal cảnh báo
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastStorageWriteRef.current = now;
    recordActivityTimestamp();

    if (isAdmin) {
      // Khi Admin xác nhận gia hạn thì bắt đầu chu kỳ 8 giờ mới
      localStorage.setItem(STORAGE_KEY_LOGIN_TIME, String(now));
    }
    setShowWarning(false);
  }, [isAdmin]);

  // Thực hiện đăng xuất do hết hạn thời gian
  const performTimeoutLogout = useCallback(() => {
    setShowWarning(false);
    setSessionExpiredMessage(
      isAdmin
        ? 'Phiên làm việc 8 giờ của Quản trị viên (Admin) đã kết thúc. Vui lòng đăng nhập lại để tiếp tục.'
        : 'Phiên làm việc đã kết thúc do không có hoạt động trong 30 phút. Vui lòng đăng nhập lại để tiếp tục.'
    );
    if (onLogoutRef.current) {
      onLogoutRef.current();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    const now = Date.now();
    lastActivityRef.current = now;
    if (!getLoginTimestamp()) {
      recordLoginTimestamp();
    }

    // Danh sách các sự kiện tương tác của người dùng
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    // Đồng bộ đa tab: nếu đăng nhập hoặc gia hạn ở tab khác
    const handleStorageChange = (e) => {
      if (isAdmin) {
        if (e.key === STORAGE_KEY_LOGIN_TIME && e.newValue) {
          setShowWarning(false);
        }
      } else {
        if (e.key === STORAGE_KEY_LAST_ACTIVE && e.newValue) {
          const remoteTime = Number(e.newValue);
          if (remoteTime > lastActivityRef.current) {
            lastActivityRef.current = remoteTime;
            if (showWarning) {
              setShowWarning(false);
            }
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Vòng lặp kiểm tra mỗi 1 giây
    const intervalId = setInterval(() => {
      const currentNow = Date.now();
      let elapsed = 0;

      if (isAdmin) {
        // Với Admin: Đếm thời gian kể từ lúc đăng nhập (kể cả có hoạt động hay không)
        const loginTime = getLoginTimestamp() || now;
        elapsed = currentNow - loginTime;
      } else {
        // Với User thường: Đếm thời gian không hoạt động
        const localLast = lastActivityRef.current;
        const storageLast = getLastActivityTimestamp();
        const effectiveLast = Math.max(localLast, storageLast);
        elapsed = currentNow - effectiveLast;
      }

      // 1. Nếu đã vượt quá thời gian timeout (Admin: 8 giờ; User: 30 phút)
      if (elapsed >= timeoutMs) {
        performTimeoutLogout();
        return;
      }

      // 2. Nếu nằm trong khoảng cảnh báo trước khi hết hạn
      const warningThreshold = timeoutMs - warningMs;
      if (elapsed >= warningThreshold) {
        const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        setRemainingSeconds(remaining);
        setShowWarning(true);
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [user, isAdmin, timeoutMs, warningMs, handleUserActivity, showWarning, performTimeoutLogout]);

  return {
    showWarning,
    remainingSeconds,
    isAdmin,
    extendSession,
    performTimeoutLogout,
  };
}
