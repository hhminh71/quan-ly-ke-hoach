import { useState, useEffect, useRef, useCallback } from 'react';

// Cấu hình thời gian mặc định: 30 phút tự động đăng xuất
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút = 1.800.000 ms
export const WARNING_BEFORE_MS = 2 * 60 * 1000;    // Cảnh báo trước 2 phút = 120.000 ms

const STORAGE_KEY_LAST_ACTIVE = 'last_active_timestamp';
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

export const recordActivityTimestamp = () => {
  localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, String(Date.now()));
};

export const getLastActivityTimestamp = () => {
  const val = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
  return val ? Number(val) : 0;
};

/**
 * Kiểm tra xem phiên lưu trữ có còn hiệu lực trong 30 phút hay không
 */
export const isSessionValid = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const last = getLastActivityTimestamp();
  if (!last) return false;
  return Date.now() - last < timeoutMs;
};

/**
 * Hook giám sát hoạt động người dùng và tự động đăng xuất sau 30 phút không hoạt động
 */
export function useAutoLogout({
  user,
  onLogout,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  warningMs = WARNING_BEFORE_MS,
}) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(warningMs / 1000));

  const lastActivityRef = useRef(Date.now());
  const lastStorageWriteRef = useRef(0);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  // Cập nhật mốc hoạt động (Throttle ghi vào localStorage mỗi 10 giây để tối ưu hiệu năng)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    if (now - lastStorageWriteRef.current > 10000) {
      lastStorageWriteRef.current = now;
      recordActivityTimestamp();
    }

    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Gia hạn phiên làm việc chủ động khi người dùng bấm nút trên modal cảnh báo
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastStorageWriteRef.current = now;
    recordActivityTimestamp();
    setShowWarning(false);
  }, []);

  // Thực hiện đăng xuất do hết hạn thời gian chờ
  const performTimeoutLogout = useCallback(() => {
    setShowWarning(false);
    setSessionExpiredMessage(
      'Phiên làm việc đã kết thúc do không có hoạt động trong 30 phút. Vui lòng đăng nhập lại để tiếp tục.'
    );
    if (onLogoutRef.current) {
      onLogoutRef.current();
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    // Đánh dấu thời điểm đăng nhập hoặc mở tab
    const now = Date.now();
    lastActivityRef.current = now;
    recordActivityTimestamp();

    // Danh sách các sự kiện tương tác của người dùng
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

    // Lắng nghe sự kiện để cập nhật mốc hoạt động
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    // Đồng bộ đa tab: nếu người dùng thao tác ở tab khác thì cập nhật lại mốc thời gian
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_LAST_ACTIVE && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (remoteTime > lastActivityRef.current) {
          lastActivityRef.current = remoteTime;
          if (showWarning) {
            setShowWarning(false);
          }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Vòng lặp kiểm tra thời gian không hoạt động mỗi 1 giây (để hiển thị đếm ngược mượt mà khi cảnh báo)
    const intervalId = setInterval(() => {
      const currentNow = Date.now();
      const localLast = lastActivityRef.current;
      const storageLast = getLastActivityTimestamp();
      const effectiveLast = Math.max(localLast, storageLast);

      const elapsed = currentNow - effectiveLast;

      // 1. Nếu đã vượt quá thời gian timeout (30 phút)
      if (elapsed >= timeoutMs) {
        performTimeoutLogout();
        return;
      }

      // 2. Nếu nằm trong khoảng cảnh báo (28 phút - 30 phút)
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
  }, [user, timeoutMs, warningMs, handleUserActivity, showWarning, performTimeoutLogout]);

  return {
    showWarning,
    remainingSeconds,
    extendSession,
    performTimeoutLogout,
  };
}
