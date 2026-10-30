import React from 'react';
import { Clock, ShieldAlert, LogOut, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SessionTimeoutModal({
  isOpen,
  remainingSeconds,
  isAdmin = false,
  onExtend,
  onLogout,
}) {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0c2238] rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-500/40 p-6 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 animate-pulse" />

        <div className="flex flex-col items-center text-center">
          {/* Animated Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/50 flex items-center justify-center mb-4 text-amber-600 dark:text-amber-400 shadow-inner">
            <Clock className="w-8 h-8 animate-bounce" />
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-400/40">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Quản trị viên (Admin) • Phiên 8 Giờ</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-400/40">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>Tự động ngắt sau 30 phút không hoạt động</span>
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <span>{isAdmin ? 'Phiên làm việc Admin sắp hết hạn' : 'Sắp hết hạn phiên làm việc'}</span>
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {isAdmin ? (
              <>
                Phiên làm việc của Quản trị viên được quy định giới hạn tối đa <strong className="text-slate-900 dark:text-white font-bold">8 giờ</strong> kể từ lúc đăng nhập để bảo mật hệ thống. Phiên sẽ tự động đăng xuất sau:
              </>
            ) : (
              <>
                Hệ thống nhận thấy bạn không có thao tác trong gần <strong className="text-slate-900 dark:text-white font-bold">30 phút</strong>. Để bảo vệ dữ liệu kế hoạch, phiên sẽ tự động kết thúc sau:
              </>
            )}
          </p>

          {/* Countdown Clock Box */}
          <div className="my-5 px-6 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 shadow-xs">
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-amber-600 dark:text-amber-400 drop-shadow-xs">
              {formattedTime}
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/80 font-medium mt-0.5">
              Thời gian còn lại trước khi tự động đăng xuất
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={onExtend}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all duration-150 shadow-md shadow-amber-400/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{isAdmin ? 'Gia hạn thêm 8 giờ' : 'Tiếp tục làm việc'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
