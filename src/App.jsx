import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import MobileSimulatorModal from './components/MobileSimulatorModal';
import { Smartphone } from 'lucide-react';

export default function App() {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Current logged in user; default to demo user for instant preview, or null to force login
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('demo_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('demo_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('demo_user');
  };

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
        </ErrorBoundary>
      )}
    </div>
  );
}
