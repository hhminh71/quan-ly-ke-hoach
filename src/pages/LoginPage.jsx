import React, { useState, useEffect } from 'react';
import {
  Mail,
  ArrowRight,
  Sparkles,
  Plane,
  ShieldCheck,
  Lock,
  Unlock,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  Settings,
  CheckCircle2,
  X,
  UserCheck,
  ExternalLink,
} from 'lucide-react';
import aviationBg from '../assets/aviation-bg.jpg';
import {
  getSavedUsers,
  getSavedWebhookUrl,
  fetchFromGoogleSheet,
  getGoogleClientId,
  saveGoogleClientId,
} from '../services/googleSheetService';
import { ROLES, normalizeRole, ROLE_INFO } from '../utils/permissions';

export default function LoginPage({ onLogin }) {
  const [googleEmail, setGoogleEmail] = useState('admin@company.vn');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  // Google OAuth Popup / Setup Modal
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleModalTab, setGoogleModalTab] = useState('PICKER'); // 'PICKER' | 'CONFIG'
  const [clientIdInput, setClientIdInput] = useState(() => getGoogleClientId());
  const [otherGoogleEmail, setOtherGoogleEmail] = useState('');
  const [customEmailError, setCustomEmailError] = useState('');

  // Handle Google User Verification & Login
  const handleVerifyAndLoginGoogleUser = async (email, customName, picture) => {
    setError('');
    setHint('');
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      setError('Không nhận được email từ tài khoản Google.');
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
        } catch (e) {
          // Ignore network errors, proceed with local cached list
        }
      }

      const matched = userList.find((u) => u.email.toLowerCase() === cleanEmail);

      if (matched) {
        if (matched.status === 'KHOA') {
          setError(`Tài khoản Google "${cleanEmail}" đã bị KHÓA quyền truy cập.`);
          setHint('Vui lòng liên hệ Quản trị viên để mở khóa tài khoản.');
          setIsLoading(false);
          return;
        }

        const role = normalizeRole(matched.role);
        onLogin({
          name: customName || matched.name || cleanEmail.split('@')[0],
          email: matched.email,
          role: role,
          department: matched.department || 'Phòng TC-KH',
          provider: 'google',
          avatar: picture || null,
        });
      } else {
        // Fallback for admin or company domain defaults
        if (cleanEmail.includes('admin') || cleanEmail.endsWith('@company.vn')) {
          onLogin({
            name: customName || cleanEmail.split('@')[0].toUpperCase(),
            email: cleanEmail,
            role: ROLES.ADMIN,
            department: 'Phòng TC-KH',
            provider: 'google',
            avatar: picture || null,
          });
        } else {
          setError(`Tài khoản Google "${cleanEmail}" chưa được cấp quyền trong hệ thống.`);
          setHint('Vui lòng liên hệ Quản trị viên để được thêm vào Sheet QUAN_TRI_USER trên Google Sheets.');
        }
      }
    } catch (err) {
      setError('Lỗi xác thực quyền Google: ' + err.message);
    } finally {
      setIsLoading(false);
      setIsGoogleModalOpen(false);
    }
  };

  // 1. Click "Đăng nhập với Google"
  const handleGoogleSignInClick = () => {
    setError('');
    setHint('');
    const configuredClientId = getGoogleClientId();

    // Nếu đã có Google Client ID và GIS SDK đã tải, mở popup OAuth chính thức của Google
    if (configuredClientId && window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: configuredClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              setError('Xác thực Google không thành công: ' + tokenResponse.error);
              return;
            }
            try {
              setIsLoading(true);
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              });
              const profile = await res.json();
              await handleVerifyAndLoginGoogleUser(profile.email, profile.name, profile.picture);
            } catch (err) {
              setError('Lỗi lấy thông tin Google: ' + err.message);
            } finally {
              setIsLoading(false);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (e) {
        console.error('Google GIS popup failed', e);
      }
    }

    // Nếu chưa cấu hình Google Client ID hoặc chưa có SDK, mở Modal chọn tài khoản Google / Cấu hình
    setIsGoogleModalOpen(true);
  };

  // 2. Click "Đăng nhập bằng Email & Mật khẩu"
  const handleLoginWithEmailAndPassword = async (emailToLogin, passToLogin) => {
    setError('');
    setHint('');
    const cleanEmail = (emailToLogin || googleEmail).trim().toLowerCase();
    const cleanPass = (passToLogin || password).trim();

    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ Email của bạn.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setError('Định dạng email không hợp lệ (ví dụ: user@gmail.com hoặc user@acv.vn).');
      return;
    }

    if (!cleanPass) {
      setError('Vui lòng nhập Mật khẩu để đăng nhập.');
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
        } catch (fetchErr) {}
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
          setHint(`Mật khẩu mặc định: ${expectedPassword}`);
          setIsLoading(false);
          return;
        }

        const role = normalizeRole(matched.role);
        onLogin({
          name: matched.name || cleanEmail.split('@')[0],
          email: matched.email,
          role: role,
          department: matched.department || 'Phòng TC-KH',
          provider: 'password',
        });
      } else {
        // Fallback demo admin
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
            department: 'Phòng TC-KH',
            provider: 'password',
          });
        } else {
          setError(`Tài khoản "${cleanEmail}" chưa được cấp quyền trong hệ thống.`);
          setHint('Vui lòng liên hệ Quản trị viên (Admin) để được thêm vào Sheet QUAN_TRI_USER trên Google Sheets.');
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
    handleLoginWithEmailAndPassword(googleEmail, password);
  };

  const handleSelectRoleDemo = (email, pass) => {
    setGoogleEmail(email);
    setPassword(pass);
    handleLoginWithEmailAndPassword(email, pass);
  };

  const handleSaveClientId = (e) => {
    e.preventDefault();
    saveGoogleClientId(clientIdInput);
    alert('Đã lưu Google Client ID thành công! Bạn có thể bấm "Đăng nhập với Google" để mở popup đăng nhập chính thức.');
    setIsGoogleModalOpen(false);
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
              Xác thực & phân quyền 3 cấp độ (Admin / Kế toán / Viewer)
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
            onClick={handleGoogleSignInClick}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-100 active:scale-[0.99] transition-all duration-150 shadow-lg flex items-center justify-center gap-3 cursor-pointer border border-slate-300 disabled:opacity-70 disabled:cursor-not-allowed mb-3.5 group"
          >
            {/* Google G Multi-Color SVG Logo */}
            <svg className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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
              Hoặc đăng nhập bằng Email & Mật khẩu
            </span>
            <div className="flex-grow border-t border-blue-400/25"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 mt-1">
            {/* Email Field */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-blue-200 mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="admin@company.vn hoặc user@gmail.com"
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
                  placeholder="Nhập mật khẩu của bạn"
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
          <div className="mt-4 pt-3.5 border-t border-blue-400/20">
            <p className="text-[10px] text-blue-300/80 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Tài khoản thử nghiệm (1 chạm):</span>
              <span className="text-amber-300/90 font-normal lowercase">(tự điền & vào ngay)</span>
            </p>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectRoleDemo('admin@company.vn', 'admin123')}
                className="p-2 rounded-xl bg-[#041a30]/80 hover:bg-amber-500/20 border border-amber-400/40 text-left transition-all cursor-pointer group"
                title="Email: admin@company.vn • Pass: admin123"
              >
                <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <span>👑 Admin</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Làm tất cả
                </div>
                <div className="text-[8.5px] font-mono text-amber-200/60 mt-0.5 truncate">
                  Pass: admin123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('ketoan@company.vn', 'ketoan123')}
                className="p-2 rounded-xl bg-[#041a30]/80 hover:bg-sky-500/20 border border-sky-400/40 text-left transition-all cursor-pointer group"
                title="Email: ketoan@company.vn • Pass: ketoan123"
              >
                <div className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                  <span>✏️ Kế toán</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Thêm & Sửa
                </div>
                <div className="text-[8.5px] font-mono text-sky-200/60 mt-0.5 truncate">
                  Pass: ketoan123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRoleDemo('viewer@company.vn', 'viewer123')}
                className="p-2 rounded-xl bg-[#041a30]/80 hover:bg-slate-500/20 border border-slate-400/40 text-left transition-all cursor-pointer group"
                title="Email: viewer@company.vn • Pass: viewer123"
              >
                <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                  <span>👁️ Viewer</span>
                </div>
                <div className="text-[9px] text-slate-300 font-medium truncate mt-0.5">
                  Chỉ xem
                </div>
                <div className="text-[8.5px] font-mono text-slate-300/60 mt-0.5 truncate">
                  Pass: viewer123
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

      {/* Google Sign-In Selection / Client ID Configuration Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
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
                <h3 className="text-sm font-bold">Đăng nhập bằng tài khoản Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 gap-1">
              <button
                type="button"
                onClick={() => setGoogleModalTab('PICKER')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  googleModalTab === 'PICKER'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chọn tài khoản Google
              </button>
              <button
                type="button"
                onClick={() => setGoogleModalTab('CONFIG')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  googleModalTab === 'CONFIG'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Cấu hình Client ID</span>
              </button>
            </div>

            {/* Tab 1: Google Account Picker */}
            {googleModalTab === 'PICKER' && (
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-600">
                  Chọn một tài khoản Google để tiếp tục vào ứng dụng <strong>Quản Lý Kế Hoạch</strong>:
                </p>

                {/* Account list */}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  {/* Account 1: Admin */}
                  <button
                    type="button"
                    onClick={() => handleVerifyAndLoginGoogleUser('admin@company.vn', 'Quản trị viên trưởng')}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-blue-50/60 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      A
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Quản trị viên trưởng</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                          👑 ADMIN
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">admin@company.vn</p>
                    </div>
                  </button>

                  {/* Account 2: Kế toán */}
                  <button
                    type="button"
                    onClick={() => handleVerifyAndLoginGoogleUser('ketoan@company.vn', 'Nguyễn Thị Lan (Kế toán)')}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-blue-50/60 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      L
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Nguyễn Thị Lan</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                          ✏️ EDITOR
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">ketoan@company.vn</p>
                    </div>
                  </button>

                  {/* Account 3: Viewer */}
                  <button
                    type="button"
                    onClick={() => handleVerifyAndLoginGoogleUser('viewer@company.vn', 'Trần Văn Bình (Ban Giám Đốc)')}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-blue-50/60 transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-600 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                      B
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Trần Văn Bình</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9.5px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          👁️ VIEWER
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate">viewer@company.vn</p>
                    </div>
                  </button>
                </div>

                {/* Option to test custom Google email */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Hoặc đăng nhập bằng tài khoản Google khác:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={otherGoogleEmail}
                      onChange={(e) => {
                        setOtherGoogleEmail(e.target.value);
                        setCustomEmailError('');
                      }}
                      placeholder="ví dụ: user@gmail.com hoặc user@acv.vn"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!otherGoogleEmail.trim() || !otherGoogleEmail.includes('@')) {
                          setCustomEmailError('Vui lòng nhập đúng định dạng email Google.');
                          return;
                        }
                        handleVerifyAndLoginGoogleUser(otherGoogleEmail);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Kiểm tra quyền
                    </button>
                  </div>
                  {customEmailError && (
                    <p className="text-[11px] text-rose-600 mt-1">{customEmailError}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Quyền truy cập sẽ được tra cứu và đối soát tự động trong sheet <code className="text-slate-800 font-bold font-mono">QUAN_TRI_USER</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Config Google Client ID for real popup */}
            {googleModalTab === 'CONFIG' && (
              <form onSubmit={handleSaveClientId} className="p-5 space-y-3.5">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Cách kích hoạt cửa sổ Google Popup thật 100%:</span>
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-blue-800">
                    <li>Vào <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Google Cloud Console Credentials</a>.</li>
                    <li>Tạo <strong>OAuth Client ID</strong> loại <em>"Web application"</em>.</li>
                    <li>Thêm địa chỉ trang web của bạn vào mục <em>Authorized JavaScript origins</em>.</li>
                    <li>Sao chép mã <strong>Client ID</strong> và dán vào ô bên dưới:</li>
                  </ol>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="ví dụ: 123456789-abcdef.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sau khi lưu, khi bấm nút <strong>"Đăng nhập với Google"</strong> hệ thống sẽ bật ngay cửa sổ đăng nhập chính thức của Google (accounts.google.com).
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGoogleModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Lưu & Kích hoạt Google Popup
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
