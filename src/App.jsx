import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { LayoutDashboard, LogIn } from 'lucide-react';

export default function App() {
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
      {/* Dev Switcher Banner / Quick Test bar at top right */}
      <div className="fixed bottom-4 right-4 z-50 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 rounded-full shadow-xl border border-slate-700/60 flex items-center gap-2 text-xs">
        <span className="text-slate-400">Xem nhanh:</span>
        <button
          onClick={() => {
            if (user) {
              handleLogout();
            } else {
              handleLogin({ name: 'Quản trị viên', email: 'admin@company.vn', role: 'Quản trị viên (Admin)' });
            }
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all"
        >
          {user ? (
            <>
              <LogIn className="w-3.5 h-3.5" />
              <span>Chuyển sang trang Login</span>
            </>
          ) : (
            <>
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Chuyển sang trang Dashboard</span>
            </>
          )}
        </button>
      </div>

      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <ErrorBoundary>
          <Navbar user={user} onLogout={handleLogout} />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <DashboardPage user={user} />
          </main>
          <footer className="border-t border-slate-200 bg-white/50 py-5 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              © 2026 Quản Lý Kế Hoạch • Phát triển trên nền tảng React (Vite) & Tailwind CSS
            </div>
          </footer>
        </ErrorBoundary>
      )}
    </div>
  );
}
