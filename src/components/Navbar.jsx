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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* LEFT: Official Corporate Brand Header */}
          <div className="space-y-1">
            {/* Line 1: Parent Corporation */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] sm:text-xs font-semibold text-blue-200/90 tracking-wider uppercase">
                TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP
              </span>
            </div>

            {/* Line 2: Member Airport */}
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide uppercase drop-shadow-xs">
              CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ
            </h1>

            {/* Line 3: Department & Software Name Pill */}
            <div className="pt-0.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-black/25 text-blue-100 border border-white/20 backdrop-blur-xs shadow-2xs">
                Phòng Tài chính - Kế hoạch | Phần mềm quản lý Kế hoạch
              </span>
            </div>
          </div>

          {/* RIGHT: Action Controls & User Account */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 self-start md:self-center">
            {/* Prominent Yellow/Gold Action Button (Identical to screenshot style) */}
            <button
              type="button"
              onClick={handleExportQuick}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer border border-amber-300"
              title="Xuất bảng báo cáo kế hoạch và chi phí ra file Excel / CSV"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>XUẤT BÁO CÁO (EXCEL / CSV)</span>
            </button>

            {/* User Profile Glass Pill */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-xs transition-colors">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <User className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/50 shadow-2xs transition-all cursor-pointer"
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
