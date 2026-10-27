import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  LogOut,
  User,
  Smartphone,
  RefreshCw,
  Settings,
  RotateCcw,
  Cloud,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

export default function Navbar({ user, onLogout, onExportReport, onOpenSimulator }) {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleExportQuick = () => {
    if (onExportReport) {
      onExportReport();
      return;
    }
    window.dispatchEvent(new CustomEvent('app_export_csv'));
  };

  return (
    <header className="w-full bg-gradient-to-r from-[#074780] via-[#09579d] to-[#063c6d] text-white shadow-md border-b border-blue-900/40 sticky top-0 z-40">
      <div className="w-full px-2.5 sm:px-6 lg:px-8 py-1.5 sm:py-2.5">
        <div className="flex items-center justify-between gap-2">
          
          {/* LEFT: Official Corporate Brand Header - ALWAYS FULLY VISIBLE IN ALL MODES */}
          <div className="min-w-0 flex-1 pr-1">
            {/* Line 1: Parent Corporation */}
            <div className="text-[8px] sm:text-[10px] font-semibold text-blue-200/90 tracking-wider uppercase leading-none truncate block">
              TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP
            </div>

            {/* Line 2: Member Airport - Never truncated, crisp and prominent */}
            <h1 className="text-[11px] sm:text-base lg:text-lg font-black text-white tracking-wide uppercase leading-tight mt-0.5 whitespace-nowrap">
              CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ
            </h1>

            {/* Line 3: Department & Software Name */}
            <div className="text-[8.5px] sm:text-[10px] text-blue-200 font-medium leading-none mt-0.5 truncate">
              Phòng TC-KH • Quản lý Kế hoạch
            </div>
          </div>

          {/* RIGHT: Minimalist Icon Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Desktop Simulator Button */}
            {!isInIframe && onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="hidden md:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 items-center justify-center shadow-2xs transition-all cursor-pointer"
                title="Bật khung xem trước giả lập màn hình điện thoại iPhone/Android"
              >
                <Smartphone className="w-4 h-4 text-amber-300" />
              </button>
            )}

            {/* Minimal Export Button: Just clean icon */}
            <button
              type="button"
              onClick={handleExportQuick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer border border-amber-300 shrink-0"
              title="Xuất bảng báo cáo kế hoạch và chi phí ra file Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>

            {/* User Profile Area: ONLY Person Icon with Interactive Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0 ${
                  isUserMenuOpen
                    ? 'bg-white text-blue-900 border-white'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
                title="Quản trị viên & Menu cài đặt hệ thống"
              >
                <User className="w-3.5 h-3.5" />
              </button>

              {/* Administrator Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  {/* User Profile Header */}
                  <div className="p-2.5 bg-blue-50/70 rounded-xl mb-1 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user?.name || 'Quản trị viên'}
                      </p>
                      <p className="text-[10px] text-blue-700 font-medium truncate">
                        {user?.role || 'Phòng TC-KH'}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Integration Tools (Hidden from main toolbar into here) */}
                  <div className="py-1 border-t border-slate-100 space-y-0.5 text-xs">
                    <div className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Tiện ích & Đồng bộ
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('app_sync_sheet'));
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đồng bộ lại từ Google Sheet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('app_open_sheet_settings'));
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-blue-600" />
                      <span>Cài đặt kết nối Google Sheet</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('app_reset_data'));
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nạp lại dữ liệu gốc từ Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleExportQuick();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Xuất bảng báo cáo (Excel / CSV)</span>
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
