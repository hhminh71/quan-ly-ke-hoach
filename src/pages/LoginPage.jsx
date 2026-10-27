import React, { useState } from 'react';
import { Lock, Mail, Eye, EyeOff, ArrowRight, Sparkles, Plane } from 'lucide-react';
import aviationBg from '../assets/aviation-bg.jpg';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@company.vn');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ email/tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: email.includes('admin') ? 'Quản trị viên' : email.split('@')[0],
        email: email,
        role: 'Quản trị viên (Admin)',
      });
    }, 600);
  };

  const handleFillDemo = () => {
    setEmail('admin@company.vn');
    setPassword('123456');
    setError('');
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
      {/* Deep aviation twilight overlay for crisp contrast and official ACV palette */}
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

          {/* Line 1: Parent Corporation - 100% ONE LINE, NO WRAPPING */}
          <p className="text-[8.5px] min-[360px]:text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-wider whitespace-nowrap leading-none mb-1">
            TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP
          </p>

          {/* Line 2: Member Airport - 100% ONE LINE, NO WRAPPING */}
          <h1 className="text-[13px] min-[360px]:text-[15px] min-[400px]:text-lg sm:text-2xl font-black text-white uppercase tracking-wide whitespace-nowrap leading-tight drop-shadow-md">
            CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ
          </h1>

          {/* Line 3: Department badge - 100% ONE LINE, NO WRAPPING */}
          <div className="mt-2 inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1 rounded-full bg-blue-900/70 border border-blue-400/35 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="text-[9.5px] min-[360px]:text-[11px] sm:text-xs font-semibold text-blue-100 whitespace-nowrap leading-none">
              Phòng Tài chính - Kế hoạch • Phần mềm Quản lý Kế hoạch
            </span>
          </div>
        </div>

        {/* Login Card with Glassmorphism */}
        <div className="bg-[#09294a]/85 backdrop-blur-xl border border-blue-300/25 rounded-2xl p-5 sm:p-7 shadow-2xl shadow-slate-950/70">
          <div className="mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Đăng nhập hệ thống</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-200/70 mt-0.5">
              Vui lòng nhập thông tin xác thực để tiếp tục
            </p>
          </div>

          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-blue-200 mb-1">
                Tài khoản / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.vn"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl bg-[#041a30]/85 border border-blue-400/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-blue-200 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-xl bg-[#041a30]/85 border border-blue-400/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs pt-0.5">
              <label className="flex items-center gap-1.5 text-blue-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-blue-400/40 bg-[#041a30] text-blue-600 focus:ring-blue-500/20"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  alert('Vui lòng liên hệ quản trị viên IT (Phòng TC-KH) để được cấp lại mật khẩu.');
                }}
                className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
              >
                Quên mật khẩu?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] transition-all duration-150 shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-4 pt-4 border-t border-blue-400/20">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#041a30]/70 border border-blue-400/20 flex items-center justify-between gap-2">
              <div className="text-[11px] sm:text-xs min-w-0 flex-1">
                <p className="text-blue-300/80 leading-none">Tài khoản dùng thử:</p>
                <p className="font-mono text-blue-100 font-semibold mt-1 truncate">
                  admin@company.vn / 123456
                </p>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 transition-all shrink-0 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tự điền</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer: 100% Single Line, NO WRAPPING */}
        <p className="text-center text-[9.5px] min-[360px]:text-[11px] sm:text-xs text-blue-200/60 whitespace-nowrap mt-4 sm:mt-5">
          © 2026 Quản Lý Kế Hoạch • Cảng HKQT Cần Thơ
        </p>
      </div>
    </div>
  );
}
