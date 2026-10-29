import React, { useState } from 'react';
import { Mail, ArrowRight, Sparkles, Plane, ShieldCheck, Lock, AlertCircle, Info } from 'lucide-react';
import aviationBg from '../assets/aviation-bg.jpg';
import { getSavedUsers, getSavedWebhookUrl, fetchFromGoogleSheet } from '../services/googleSheetService';
import { ROLES, normalizeRole, ROLE_INFO } from '../utils/permissions';

export default function LoginPage({ onLogin }) {
  const [googleEmail, setGoogleEmail] = useState('admin@company.vn');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  const handleLoginWithEmail = async (emailToLogin) => {
    setError('');
    setHint('');
    const cleanEmail = (emailToLogin || googleEmail).trim().toLowerCase();

    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ Email Google của bạn.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setError('Định dạng email Google không hợp lệ (ví dụ: user@gmail.com hoặc user@acv.vn).');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Kiểm tra trong danh sách User đã lưu cục bộ
      let userList = getSavedUsers();

      // 2. Nếu có webhook, thử đồng bộ nhanh danh sách mới nhất từ Google Sheet
      const webhookUrl = getSavedWebhookUrl();
      if (webhookUrl) {
        try {
          const sheetRes = await fetchFromGoogleSheet(webhookUrl);
          if (Array.isArray(sheetRes.users) && sheetRes.users.length > 0) {
            userList = sheetRes.users;
          }
        } catch (fetchErr) {
          // Bỏ qua lỗi mạng, tiếp tục với userList cục bộ
        }
      }

      // 3. Tra cứu quyền của email
      const matched = userList.find((u) => u.email.toLowerCase() === cleanEmail);

      if (matched) {
        if (matched.status === 'KHOA') {
          setError('Tài khoản Google này đã bị KHÓA quyền truy cập.');
          setHint('Vui lòng liên hệ Quản trị viên hệ thống để mở khóa tài khoản.');
          setIsLoading(false);
          return;
        }

        const role = normalizeRole(matched.role);
        onLogin({
          name: matched.name || cleanEmail.split('@')[0],
          email: matched.email,
          role: role,
          department: matched.department || 'Phòng TC-KH',
          provider: 'google',
        });
      } else {
        // Nếu là email admin mặc định hoặc tài khoản nội bộ đặc biệt
        if (cleanEmail.includes('admin') || cleanEmail.endsWith('@company.vn')) {
          onLogin({
            name: cleanEmail.split('@')[0].toUpperCase(),
            email: cleanEmail,
            role: ROLES.ADMIN,
            department: 'Phòng TC-KH',
            provider: 'google',
          });
        } else {
          setError(`Tài khoản "${cleanEmail}" chưa được cấp quyền trong hệ thống.`);
          setHint('Vui lòng liên hệ Quản trị viên (Admin) để được thêm vào Sheet QUAN_TRI_USER trên Google Sheets.');
        }
      }
    } catch (err) {
      setError('Có lỗi khi xác thực tài khoản: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLoginWithEmail(googleEmail);
  };

  const handleSelectRoleDemo = (email) => {
    setGoogleEmail(email);
    handleLoginWithEmail(email);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 relative overflow-hidden bg-[#021528]"
      style={{
        backgroundImage: `url(${aviationBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Twilight overlay for crisp contrast and official ACV palette */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02182e]/88 via-[#053159]/80 to-[#021120]/95 backdrop-blur-[2px]" />

      {/* Runway glowing lights & radial ambient aura */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_20%,rgba(56,189,248,0.18),transparent)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo and Brand */}
        <div className="text-center mb-4 sm:mb-6">
          {/* Aviation emblem badge */}
          <div className="mx-auto w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-amber-400 p-[1.5px] shadow-xl shadow-sky-500/25 mb-2.5 sm:mb-3 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-[#07355e] flex items-center justify-center">
              <Plane className="w-5 h-5 sm:w-7 sm:h-7 text-amber-400 rotate-[-45deg]" />
            </div>
          </div>

          <p className="text-[8.5px] min-[360px]:text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-wider whitespace-nowrap leading-none mb-1">
            TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP
          </p>

          <h1 className="text-[13px] min-[360px]:text-[15px] min-[400px]:text-lg sm:text-2xl font-black text-white uppercase tracking-wide whitespace-nowrap leading-tight drop-shadow-md">
            CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ
          </h1>

          <div className="mt-2 inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1 rounded-full bg-blue-900/70 border border-blue-400/35 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="text-[9.5px] min-[360px]:text-[11px] sm:text-xs font-semibold text-blue-100 whitespace-nowrap leading-none">
              Phòng Tài chính - Kế hoạch • Quản lý Kế hoạch & Chi phí
            </span>
          </div>
        </div>

        {/* Login Card with Glassmorphism */}
        <div className="bg-[#09294a]/85 backdrop-blur-xl border border-blue-300/25 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-slate-950/70">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Đăng nhập tài khoản Google</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-200/70 mt-0.5">
              Hệ thống xác thực và phân quyền tự động qua Google Sheet
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {hint && <p className="text-[11px] text-rose-200/90 pl-6">{hint}</p>}
            </div>
          )}

          {/* 1. Official Google Sign-In Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleLoginWithEmail(googleEmail)}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-100 active:scale-[0.99] transition-all duration-150 shadow-lg flex items-center justify-center gap-3 cursor-pointer border border-slate-300 disabled:opacity-70 disabled:cursor-not-allowed mb-3.5"
          >
            {/* Google G Multi-Color SVG Logo */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập với Google</span>
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-blue-400/25"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-blue-300/60 font-bold">
              Hoặc nhập Email Google
            </span>
            <div className="flex-grow border-t border-blue-400/25"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-blue-200 mb-1">
                Địa chỉ Email Google của bạn
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com hoặc user@acv.vn"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl bg-[#041a30]/85 border border-blue-400/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  <span>Đang kiểm tra quyền Google Sheet...</span>
                </>
              ) : (
                <>
                  <span>Tiếp tục với Email này</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Roles Selection */}
          <div className="mt-4 pt-3.5 border-t border-blue-400/20">
            <p className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Tài khoản thử nghiệm 3 vai trò:</span>
              <span className="text-amber-300/90 font-normal lowercase">(bấm để vào ngay)</span>
            </p>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectRoleDemo('admin@company.vn')}
                className="p-2 rounded-xl bg-[#041a30]/80 hover:bg-amber-500/20 border border-amber-400/40 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <span>👑 Admin</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Làm tất cả
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('ketoan@company.vn')}
                className="p-2 rounded-xl bg-[#041a30]/80 hover:bg-sky-500/20 border border-sky-400/40 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                  <span>✏️ Kế toán</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Thêm & Sửa
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('viewer@company.vn')}
                className="p-2 rounded-xl bg-[#041a30]/80 hover:bg-slate-500/20 border border-slate-400/40 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <span>👁️ Viewer</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Chỉ xem
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[9.5px] min-[360px]:text-[11px] sm:text-xs text-blue-200/60 whitespace-nowrap mt-4 sm:mt-5">
          © 2026 Quản Lý Kế Hoạch • Cảng HKQT Cần Thơ
        </p>
      </div>
    </div>
  );
}
