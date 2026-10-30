import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import MobileSimulatorModal from './components/MobileSimulatorModal';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import { Smartphone } from 'lucide-react';
import { ROLES, normalizeRole } from './utils/permissions';
import {
  useAutoLogout,
  recordLoginTimestamp,
  recordActivityTimestamp,
  isSessionValid,
  setSessionExpiredMessage,
} from './hooks/useAutoLogout';

export default function App() {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Khởi tạo người dùng đăng nhập; kiểm tra hiệu lực phiên
  // (Admin: 8 giờ kể từ lúc đăng nhập • User thường: 30 phút không hoạt động)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('demo_user');
    if (!saved) return null;

    try {
      const u = JSON.parse(saved);
      if (!u) return null;

      // Kiểm tra tính hợp lệ của phiên làm việc
      if (!isSessionValid(u)) {
        localStorage.removeItem('demo_user');
        localStorage.removeItem('last_active_timestamp');
        localStorage.removeItem('session_login_timestamp');

        const isAdmin = normalizeRole(u.role) === ROLES.ADMIN;
        setSessionExpiredMessage(
          isAdmin
            ? 'Phiên làm việc 8 giờ của Quản trị viên (Admin) đã kết thúc. Vui lòng đăng nhập lại để tiếp tục.'
            : 'Phiên làm việc đã hết hạn do không có hoạt động trong 30 phút. Vui lòng đăng nhập lại để tiếp tục.'
        );
        return null;
      }

      const email = String(u.email || '').toLowerCase();
      if (email.includes('xaydung') && u.expenseScope !== 'XAY_DUNG') {
        u.expenseScope = 'XAY_DUNG';
      } else if (email.includes('kythuat') && u.expenseScope !== 'KY_THUAT') {
        u.expenseScope = 'KY_THUAT';
      } else if (email.includes('daotao') && u.expenseScope !== 'DAO_TAO') {
        u.expenseScope = 'DAO_TAO';
      }
      return u;
    } catch {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('demo_user', JSON.stringify(userData));
    recordLoginTimestamp();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('demo_user');
    localStorage.removeItem('last_active_timestamp');
    localStorage.removeItem('session_login_timestamp');
  };

  // Giám sát tự động đăng xuất: Admin (8 giờ tối đa) / User thường (30 phút không hoạt động)
  const { showWarning, remainingSeconds, isAdmin, extendSession, performTimeoutLogout } = useAutoLogout({
    user,
    onLogout: handleLogout,
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <ErrorBoundary>
          <Navbar
            user={user}
            onLogout={handleLogout}
            onOpenSimulator={() => setIsSimulatorOpen(true)}
          />
          <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
            <DashboardPage user={user} />
          </main>
          <footer className="border-t border-slate-200 bg-white/50 py-3 sm:py-5 text-center text-3xs sm:text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
              © 2026 Quản Lý Kế Hoạch • Cảng HKQT Cần Thơ
            </div>
          </footer>

          {/* Desktop Floating Shortcut Button */}
          {!isInIframe && (
            <div className="hidden lg:block fixed bottom-4 right-4 z-30">
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 hover:border-amber-400 backdrop-blur-md transition-all cursor-pointer group hover:scale-105 active:scale-95"
                title="Mở khung mô phỏng xem thử giao diện trên điện thoại di động"
              >
                <Smartphone className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>Xem Giả Lập Điện Thoại</span>
              </button>
            </div>
          )}

          {/* Mobile Simulator Modal */}
          <MobileSimulatorModal
            isOpen={isSimulatorOpen}
            onClose={() => setIsSimulatorOpen(false)}
          />

          {/* Cảnh báo tự động đăng xuất: Admin (8 giờ) / User thường (30 phút không hoạt động) */}
          <SessionTimeoutModal
            isOpen={showWarning}
            remainingSeconds={remainingSeconds}
            isAdmin={isAdmin}
            onExtend={extendSession}
            onLogout={performTimeoutLogout}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
