import React from 'react';
import { Download, LogOut, User, Bell, Plane, ShieldCheck, FileSpreadsheet, Smartphone } from 'lucide-react';

export default function Navbar({ user, onLogout, onExportReport, onOpenSimulator }) {
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleExportQuick = () => {
    if (onExportReport) {
      onExportReport();
      return;
    }
    // Default export trigger
    window.dispatchEvent(new CustomEvent('app_export_csv'));
  };

  return (
    <header className="w-full bg-gradient-to-r from-[#074780] via-[#09579d] to-[#063c6d] text-white shadow-md border-b border-blue-900/40 sticky top-0 z-40">
      <div className="w-full px-2.5 sm:px-6 lg:px-8 py-1.5 sm:py-3">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4">
          
          {/* LEFT: Official Corporate Brand Header */}
          <div className="min-w-0 flex-1 pr-1">
            {/* Line 1: Parent Corporation */}
            <div className="flex items-center gap-1">
              <span className="text-[8px] sm:text-xs font-semibold text-blue-200/90 tracking-wider uppercase leading-none truncate block">
                TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP
              </span>
            </div>

            {/* Line 2: Member Airport */}
            <h1 className="text-[11px] sm:text-xl lg:text-2xl font-black text-white tracking-wide uppercase drop-shadow-xs leading-tight mt-0.5 truncate">
              CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ
            </h1>

            {/* Line 3: Department & Software Name Pill */}
            <div className="mt-0.5">
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/25 text-blue-100 border border-white/20 backdrop-blur-xs shadow-2xs">
                Phòng Tài chính - Kế hoạch | Phần mềm quản lý Kế hoạch
              </span>
              <span className="sm:hidden inline-flex items-center px-1.5 py-0.2 rounded-full text-[8.5px] font-medium bg-black/25 text-blue-100 border border-white/20">
                Phòng TC-KH • Quản lý Kế hoạch
              </span>
            </div>
          </div>

          {/* RIGHT: Action Controls & User Account - Ultra-slim on mobile */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Desktop Simulator Button */}
            {!isInIframe && onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title="Bật chế độ xem trước giả lập màn hình điện thoại iPhone/Android"
              >
                <Smartphone className="w-4 h-4 text-amber-300" />
                <span>Giả Lập Điện Thoại</span>
              </button>
            )}

            {/* Yellow Action Button: Compact Excel */}
            <button
              type="button"
              onClick={handleExportQuick}
              className="inline-flex items-center justify-center gap-1 h-7 sm:h-9 px-1.5 sm:px-3.5 rounded sm:rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[9px] sm:text-xs uppercase tracking-wider shadow-2xs transition-all active:scale-95 cursor-pointer border border-amber-300 shrink-0"
              title="Xuất bảng báo cáo kế hoạch và chi phí ra file Excel"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span className="hidden sm:inline font-black">XUẤT BÁO CÁO (EXCEL)</span>
              <span className="sm:hidden">Excel</span>
            </button>

            {/* User Profile Glass Pill: Square icon on mobile */}
            <div
              className="w-7 h-7 sm:w-auto sm:h-9 sm:px-3 rounded sm:rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 flex items-center justify-center gap-1.5 text-white shrink-0 transition-colors"
              title={`Đang đăng nhập: ${user?.name || 'Nguyễn Quản Trị'}`}
            >
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-white leading-tight">
                  {user?.name || 'Nguyễn Quản Trị'}
                </p>
                <p className="text-[10px] text-blue-200 leading-tight">
                  {user?.role || 'Phòng TC-KH'}
                </p>
              </div>
            </div>

            {/* Logout Button: Square icon on mobile */}
            <button
              type="button"
              onClick={onLogout}
              className="w-7 h-7 sm:w-auto sm:h-9 sm:px-3 rounded sm:rounded-xl text-xs font-semibold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/50 flex items-center justify-center gap-1 shadow-2xs transition-all cursor-pointer shrink-0"
              title="Đăng xuất khỏi tài khoản"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
