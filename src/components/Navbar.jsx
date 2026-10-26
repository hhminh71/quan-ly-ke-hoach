import React from 'react';
import { Download, LogOut, User, Bell, Plane, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function Navbar({ user, onLogout, onExportReport }) {
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
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LEFT: Official Corporate Brand Header */}
          <div className="min-w-0 flex-1">
            {/* Line 1: Parent Corporation */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-xs font-semibold text-blue-200/90 tracking-wider uppercase leading-none truncate">
                TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP
              </span>
            </div>

            {/* Line 2: Member Airport */}
            <h1 className="text-xs sm:text-xl lg:text-2xl font-black text-white tracking-wide uppercase drop-shadow-xs leading-tight mt-0.5 truncate">
              CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ
            </h1>

            {/* Line 3: Department & Software Name Pill */}
            <div className="mt-0.5">
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/25 text-blue-100 border border-white/20 backdrop-blur-xs shadow-2xs">
                Phòng Tài chính - Kế hoạch | Phần mềm quản lý Kế hoạch
              </span>
              <span className="sm:hidden inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-black/25 text-blue-100 border border-white/20">
                Phòng TC-KH • Quản lý Kế hoạch
              </span>
            </div>
          </div>

          {/* RIGHT: Action Controls & User Account */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Prominent Yellow/Gold Action Button */}
            <button
              type="button"
              onClick={handleExportQuick}
              className="inline-flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-98 cursor-pointer border border-amber-300"
              title="Xuất bảng báo cáo kế hoạch và chi phí ra file Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">XUẤT BÁO CÁO (EXCEL / CSV)</span>
              <span className="sm:hidden">Xuất Excel</span>
            </button>

            {/* User Profile Glass Pill */}
            <div className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-xs transition-colors">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-white/20 flex items-center justify-center text-white">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-white leading-tight">
                  {user?.name || 'Nguyễn Quản Trị'}
                </p>
                <p className="text-[10px] text-blue-200 leading-tight">
                  {user?.role || 'Phòng TC-KH'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 p-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/50 shadow-2xs transition-all cursor-pointer"
              title="Đăng xuất khỏi tài khoản"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
