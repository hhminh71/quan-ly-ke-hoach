import { useEffect, useRef } from 'react';

/**
 * Hook tự động đồng bộ trạng thái mở Modal với Browser History (nút Back trên điện thoại).
 * 
 * - Khi Modal mở (isOpen = true): Đẩy một mục vào window.history.
 * - Khi người dùng bấm nút Back (vật lý, cử chỉ vuốt, hoặc nút trình duyệt):
 *   Modal tự động đóng lại thay vì thoát khỏi ứng dụng hay quay về trang trước của trình duyệt.
 * - Khi người dùng đóng modal bằng nút bấm (X, Hủy, Lưu):
 *   Tự động dọn dẹp entry trong history để không tạo ra lịch sử duyệt rác.
 *
 * @param {boolean} isOpen - Trạng thái mở của modal
 * @param {Function} onClose - Hàm đóng modal
 * @param {string} modalId - Mã định danh của modal
 */
export function useModalBackHandler(isOpen, onClose, modalId = 'modal') {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isPushedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      isPushedRef.current = false;
      return;
    }

    const stateObj = { isAppModal: true, modalId, timestamp: Date.now() };
    window.history.pushState(stateObj, '');
    isPushedRef.current = true;

    const handlePopState = (event) => {
      // Khi người dùng bấm nút Back trên điện thoại
      isPushedRef.current = false;
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Nếu modal bị đóng do người dùng bấm nút (X) hoặc bên ngoài (chứ không phải nút Back)
      // thì lùi history lại 1 bước để dọn dẹp
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.history.state?.isAppModal && window.history.state?.modalId === modalId) {
          window.history.back();
        }
      }
    };
  }, [isOpen, modalId]);
}
