import { useEffect, useRef } from 'react';

// Biến cờ toàn cục ngăn chặn vòng lặp popstate khi gọi history.back() có chủ đích
let isProgrammaticBack = false;

/**
 * Hook tự động đồng bộ trạng thái mở Modal với Browser History (nút Back trên điện thoại).
 * 
 * - Khi Modal mở (isOpen = true): Đẩy một mục vào window.history sau microtask (tránh StrictMode double-fire).
 * - Khi người dùng bấm nút Back (vật lý, cử chỉ vuốt, hoặc nút trình duyệt):
 *   Modal tự động đóng lại thay vì thoát khỏi ứng dụng hay quay về trang trước của trình duyệt.
 * - Khi người dùng đóng modal bằng nút bấm (X, Hủy, Lưu):
 *   Tự động dọn dẹp entry trong history mà không gây ra hiện tượng modal chớp tắt tự đóng.
 *
 * @param {boolean} isOpen - Trạng thái mở của modal
 * @param {Function} onClose - Hàm đóng modal
 * @param {string} modalId - Mã định danh của modal
 */
export function useModalBackHandler(isOpen, onClose, modalId = 'modal') {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isPushedRef = useRef(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      if (isPushedRef.current && !isClosingRef.current) {
        isPushedRef.current = false;
        if (window.history.state?.isAppModal && window.history.state?.modalId === modalId) {
          isProgrammaticBack = true;
          window.history.back();
          setTimeout(() => {
            isProgrammaticBack = false;
          }, 150);
        }
      }
      isClosingRef.current = false;
      return;
    }

    // Modal đang MỞ: Trì hoãn 1 tick để tránh xung đột StrictMode double-mount trong React
    const timerId = setTimeout(() => {
      if (!isPushedRef.current) {
        const stateObj = { isAppModal: true, modalId, timestamp: Date.now() };
        window.history.pushState(stateObj, '');
        isPushedRef.current = true;
      }
    }, 0);

    const handlePopState = (event) => {
      if (isProgrammaticBack) {
        return;
      }
      // Người dùng bấm nút Back vật lý / trình duyệt
      if (isPushedRef.current) {
        isPushedRef.current = false;
        isClosingRef.current = true;
        if (onCloseRef.current) {
          onCloseRef.current();
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener('popstate', handlePopState);

      // Dọn dẹp khi unmount (nếu modal bị đóng do click bên ngoài/nút X)
      if (isPushedRef.current && !isClosingRef.current) {
        isPushedRef.current = false;
        if (window.history.state?.isAppModal && window.history.state?.modalId === modalId) {
          isProgrammaticBack = true;
          window.history.back();
          setTimeout(() => {
            isProgrammaticBack = false;
          }, 150);
        }
      }
    };
  }, [isOpen, modalId]);
}
