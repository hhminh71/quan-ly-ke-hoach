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
      {!user ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <ErrorBoundary>
          <Navbar user={user} onLogout={handleLogout} />
          <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-6 lg:px-8 py-3 sm:py-6">
            <DashboardPage user={user} />
          </main>
          <footer className="border-t border-slate-200 bg-white/50 py-3 sm:py-5 text-center text-3xs sm:text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
              © 2026 Quản Lý Kế Hoạch • Cảng HKQT Cần Thơ
            </div>
          </footer>
        </ErrorBoundary>
      )}
    </div>
  );
}
