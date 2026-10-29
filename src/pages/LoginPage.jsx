import React, { useState } from 'react';
import {
  Mail,
  ArrowRight,
  Plane,
  ShieldCheck,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import aviationBg from '../assets/aviation-bg.jpg';
import {
  getSavedUsers,
  getSavedWebhookUrl,
  fetchFromGoogleSheet,
} from '../services/googleSheetService';
import { ROLES, normalizeRole, ROLE_INFO } from '../utils/permissions';

export default function LoginPage({ onLogin }) {
  const [emailInput, setEmailInput] = useState('admin@company.vn');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  // Xử lý Đăng nhập bằng Tài khoản & Mật khẩu
  const handleLogin = async (userEmail, userPass) => {
    setError('');
    setHint('');
    const cleanEmail = (userEmail || emailInput).trim().toLowerCase();
    const cleanPass = (userPass || password).trim();

    if (!cleanEmail) {
      setError('Vui lòng nhập Email hoặc Tên tài khoản.');
      return;
    }

    if (!cleanPass) {
      setError('Vui lòng nhập Mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      let userList = getSavedUsers();
      const webhookUrl = getSavedWebhookUrl();
      if (webhookUrl) {
        try {
          const sheetRes = await fetchFromGoogleSheet(webhookUrl);
          if (Array.isArray(sheetRes.users) && sheetRes.users.length > 0) {
            userList = sheetRes.users;
          }
        } catch (fetchErr) {
          // Bỏ qua lỗi mạng nếu không kết nối được sheet, tiếp tục với cache cục bộ
        }
      }

      const matched = userList.find((u) => u.email.toLowerCase() === cleanEmail);

      if (matched) {
        if (matched.status === 'KHOA') {
          setError('Tài khoản này đã bị KHÓA quyền truy cập.');
          setHint('Vui lòng liên hệ Quản trị viên hệ thống để mở khóa tài khoản.');
          setIsLoading(false);
          return;
        }

        // Kiểm tra mật khẩu
        const expectedPassword =
          matched.password ||
          (matched.email.includes('admin')
            ? 'admin123'
            : matched.email.includes('ketoan')
            ? 'ketoan123'
            : '123456');

        if (cleanPass !== expectedPassword) {
          setError('Mật khẩu không chính xác!');
          setHint(`Gợi ý mật khẩu mẫu: ${expectedPassword}`);
          setIsLoading(false);
          return;
        }

        const role = normalizeRole(matched.role);
        onLogin({
          name: matched.name || cleanEmail.split('@')[0],
          email: matched.email,
          role: role,
          expenseScope: matched.expenseScope || 'ALL',
          allowedCodes: matched.allowedCodes || [],
          department: matched.department || 'Phòng TC-KH',
          provider: 'credentials',
        });
      } else {
        // Fallback demo admin nếu chưa cấu hình sheet
        if (cleanEmail === 'admin@company.vn' || cleanEmail.includes('admin')) {
          if (cleanPass !== 'admin123') {
            setError('Mật khẩu Admin không chính xác!');
            setHint('Mật khẩu mặc định: admin123');
            setIsLoading(false);
            return;
          }
          onLogin({
            name: cleanEmail.split('@')[0].toUpperCase(),
            email: cleanEmail,
            role: ROLES.ADMIN,
            expenseScope: 'ALL',
            allowedCodes: [],
            department: 'Phòng TC-KH',
            provider: 'credentials',
          });
        } else {
          setError(`Tài khoản "${cleanEmail}" chưa được cấp quyền trong hệ thống.`);
          setHint('Vui lòng liên hệ Quản trị viên (Admin) để được thêm tài khoản vào Sheet QUAN_TRI_USER.');
        }
      }
    } catch (err) {
      setError('Có lỗi khi xác thực: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(emailInput, password);
  };

  const handleSelectRoleDemo = (email, pass) => {
    setEmailInput(email);
    setPassword(pass);
    handleLogin(email, pass);
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
              <span>Đăng nhập hệ thống</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-blue-200/70 mt-0.5">
              Phân quyền 3 cấp độ (Admin / Kế toán / Viewer) qua Google Sheet
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

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email / Username Field */}
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
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@company.vn hoặc email người dùng"
                  className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl bg-[#041a30]/85 border border-blue-400/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] sm:text-xs font-semibold text-blue-200">
                  Mật khẩu
                </label>
                <span className="text-[10px] text-amber-300/80 font-mono">
                  Mặc định: admin123
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu truy cập"
                  className="w-full pl-9 pr-10 py-2 sm:py-2.5 rounded-xl bg-[#041a30]/85 border border-blue-400/30 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-blue-300 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                  <span>Đang kiểm tra quyền truy cập...</span>
                </>
              ) : (
                <>
                  <span>Đăng Nhập</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Roles Selection */}
          <div className="mt-4 pt-3.5 border-t border-blue-400/20 space-y-2">
            <p className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Tài khoản thử nghiệm phân quyền (1 chạm):</span>
              <span className="text-amber-300/90 font-normal lowercase">(bấm vào ngay)</span>
            </p>

            {/* Row 1: Core Roles */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectRoleDemo('admin@company.vn', 'admin123')}
                className="p-1.5 rounded-xl bg-[#041a30]/80 hover:bg-amber-500/20 border border-amber-400/40 text-left transition-all cursor-pointer group"
                title="Email: admin@company.vn • Pass: admin123"
              >
                <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <span>👑 Admin</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Toàn quyền
                </div>
                <div className="text-[8px] font-mono text-amber-200/60 truncate">
                  Pass: admin123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('ketoan@company.vn', 'ketoan123')}
                className="p-1.5 rounded-xl bg-[#041a30]/80 hover:bg-sky-500/20 border border-sky-400/40 text-left transition-all cursor-pointer group"
                title="Email: ketoan@company.vn • Pass: ketoan123"
              >
                <div className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                  <span>✏️ Kế toán</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Thêm & Sửa
                </div>
                <div className="text-[8px] font-mono text-sky-200/60 truncate">
                  Pass: ketoan123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('viewer@company.vn', 'viewer123')}
                className="p-1.5 rounded-xl bg-[#041a30]/80 hover:bg-slate-500/20 border border-slate-400/40 text-left transition-all cursor-pointer group"
                title="Email: viewer@company.vn • Pass: viewer123"
              >
                <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <span>👁️ Giám Đốc</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Xem toàn cảng
                </div>
                <div className="text-[8px] font-mono text-slate-300/60 truncate">
                  Pass: viewer123
                </div>
              </button>
            </div>

            {/* Row 2: Department Expense Scopes */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectRoleDemo('kythuat@company.vn', 'kythuat123')}
                className="p-1.5 rounded-xl bg-[#041a30]/80 hover:bg-blue-500/20 border border-blue-400/40 text-left transition-all cursor-pointer group"
                title="Email: kythuat@company.vn • Pass: kythuat123 • SCTX Máy móc & Phương tiện"
              >
                <div className="text-[10px] font-bold text-blue-300 flex items-center gap-1">
                  <span>🛠️ Kỹ thuật</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Chỉ Máy & Xe
                </div>
                <div className="text-[8px] font-mono text-blue-200/60 truncate">
                  Pass: kythuat123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('xaydung@company.vn', 'xaydung123')}
                className="p-1.5 rounded-xl bg-[#041a30]/80 hover:bg-amber-500/20 border border-amber-400/40 text-left transition-all cursor-pointer group"
                title="Email: xaydung@company.vn • Pass: xaydung123 • SCTX Cơ sở hạ tầng"
              >
                <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <span>🏗️ Xây dựng</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Chỉ Hạ tầng
                </div>
                <div className="text-[8px] font-mono text-amber-200/60 truncate">
                  Pass: xaydung123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('daotao@company.vn', 'daotao123')}
                className="p-1.5 rounded-xl bg-[#041a30]/80 hover:bg-purple-500/20 border border-purple-400/40 text-left transition-all cursor-pointer group"
                title="Email: daotao@company.vn • Pass: daotao123 • Chi phí Đào tạo"
              >
                <div className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                  <span>🎓 Đào tạo</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Chỉ Đào tạo
                </div>
                <div className="text-[8px] font-mono text-purple-200/60 truncate">
                  Pass: daotao123
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
