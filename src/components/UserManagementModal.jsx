import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  X,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import {
  ROLES,
  ROLE_INFO,
  normalizeRole,
  EXPENSE_SCOPES,
  getUserScopeInfo,
  normalizeExpenseScope,
} from '../utils/permissions';
import {
  getSavedUsers,
  saveSavedUsers,
  saveUserToGoogleSheet,
  deleteUserFromGoogleSheet,
  fetchFromGoogleSheet,
  getSavedWebhookUrl,
} from '../services/googleSheetService';
import initialBudgets from '../data/budgets.json';

export default function UserManagementModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState(getSavedUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form states for Add / Edit
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('123456');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('Phòng TC-KH');
  const [formRole, setFormRole] = useState(ROLES.VIEWER);
  const [formScope, setFormScope] = useState('ALL');
  const [formAllowedCodes, setFormAllowedCodes] = useState([]);
  const [customSearch, setCustomSearch] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('HOAT_DONG');
  const [formError, setFormError] = useState('');

  useModalBackHandler(isOpen, onClose, 'user-management');

  useEffect(() => {
    if (isOpen) {
      setUsers(getSavedUsers());
    }
  }, [isOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !searchTerm.trim() ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole =
        roleFilter === 'ALL' || normalizeRole(u.role) === roleFilter;

      const userScope = normalizeExpenseScope(u.expenseScope);
      const matchScope =
        scopeFilter === 'ALL' || userScope === scopeFilter;

      return matchSearch && matchRole && matchScope;
    });
  }, [users, searchTerm, roleFilter, scopeFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormPassword('123456');
    setFormName('');
    setFormDept('Phòng TC-KH');
    setFormRole(ROLES.VIEWER);
    setFormScope('ALL');
    setFormAllowedCodes([]);
    setCustomSearch('');
    setFormNotes('');
    setFormStatus('HOAT_DONG');
    setFormError('');
    setIsAddUserOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormPassword(u.password || '123456');
    setFormName(u.name || '');
    setFormDept(u.department || 'Phòng TC-KH');
    setFormRole(normalizeRole(u.role));
    setFormScope(normalizeExpenseScope(u.expenseScope));
    const rawCodes = u.allowedCodes;
    const parsedCodes = Array.isArray(rawCodes)
      ? rawCodes
      : typeof rawCodes === 'string'
      ? rawCodes.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    setFormAllowedCodes(parsedCodes);
    setCustomSearch('');
    setFormNotes(u.notes || '');
    setFormStatus(u.status || 'HOAT_DONG');
    setFormError('');
    setIsAddUserOpen(true);
  };

  const handleToggleCode = (code) => {
    setFormAllowedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllCustom = (codesToSelect) => {
    setFormAllowedCodes((prev) => {
      const set = new Set([...prev, ...codesToSelect]);
      return Array.from(set);
    });
  };

  const handleDeselectAllCustom = (codesToDeselect) => {
    setFormAllowedCodes((prev) =>
      prev.filter((c) => !codesToDeselect.includes(c))
    );
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = formEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Vui lòng nhập Email hoặc Tên tài khoản.');
      return;
    }

    // Check duplicate if adding new
    if (!editingUser) {
      const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        setFormError('Tài khoản này đã tồn tại trong hệ thống. Bạn có thể chọn Chỉnh sửa.');
        return;
      }
    }

    const userData = {
      email: cleanEmail,
      password: formPassword.trim() || '123456',
      name: formName.trim() || cleanEmail.split('@')[0],
      department: formDept.trim() || 'Phòng TC-KH',
      role: formRole,
      expenseScope: formScope,
      allowedCodes: formScope === 'CUSTOM' ? formAllowedCodes : [],
      status: formStatus,
      createdAt: editingUser?.createdAt || new Date().toLocaleDateString('vi-VN'),
      notes: formNotes.trim(),
    };

    let updatedList;
    if (editingUser) {
      updatedList = users.map((u) => (u.email.toLowerCase() === editingUser.email.toLowerCase() ? userData : u));
    } else {
      updatedList = [userData, ...users];
    }

    setUsers(updatedList);
    saveSavedUsers(updatedList);
    setIsAddUserOpen(false);
    showToast(editingUser ? 'Đã cập nhật phân quyền người dùng!' : 'Đã thêm người dùng mới thành công!');

    // Đồng bộ lên Google Sheet ngầm
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      saveUserToGoogleSheet(webhookUrl, userData);
    }
  };

  const handleToggleStatus = (u) => {
    const newStatus = u.status === 'KHOA' ? 'HOAT_DONG' : 'KHOA';
    const updatedUser = { ...u, status: newStatus };
    const updatedList = users.map((item) => (item.email.toLowerCase() === u.email.toLowerCase() ? updatedUser : item));
    setUsers(updatedList);
    saveSavedUsers(updatedList);
    showToast(newStatus === 'KHOA' ? `Đã khóa tài khoản ${u.email}` : `Đã mở khóa tài khoản ${u.email}`);

    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      saveUserToGoogleSheet(webhookUrl, updatedUser);
    }
  };

  const handleDeleteUser = (emailToDelete) => {
    if (emailToDelete.toLowerCase() === currentUser?.email?.toLowerCase()) {
      alert('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa quyền tài khoản "${emailToDelete}"?`)) {
      const updatedList = users.filter((u) => u.email.toLowerCase() !== emailToDelete.toLowerCase());
      setUsers(updatedList);
      saveSavedUsers(updatedList);
      showToast(`Đã xóa tài khoản ${emailToDelete}!`);

      const webhookUrl = getSavedWebhookUrl();
      if (webhookUrl) {
        deleteUserFromGoogleSheet(webhookUrl, emailToDelete);
      }
    }
  };

  const handleSyncFromSheet = async () => {
    const webhookUrl = getSavedWebhookUrl();
    if (!webhookUrl) {
      alert('Chưa có cấu hình Webhook Google Sheet. Vui lòng cấu hình Webhook trước.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetchFromGoogleSheet(webhookUrl);
      if (Array.isArray(res.users) && res.users.length > 0) {
        setUsers(res.users);
        saveSavedUsers(res.users);
        showToast(`Đồng bộ thành công! Đã nạp ${res.users.length} tài khoản từ Sheet QUAN_TRI_USER.`);
      } else {
        showToast('Sheet QUAN_TRI_USER chưa có dữ liệu mới.');
      }
    } catch (err) {
      alert('Lỗi đồng bộ: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter budgets for custom selection
  const filteredBudgetOptions = useMemo(() => {
    if (!customSearch.trim()) return initialBudgets;
    const term = customSearch.toLowerCase();
    return initialBudgets.filter(
      (b) =>
        b.code.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        (b.group && b.group.toLowerCase().includes(term))
    );
  }, [customSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                <span>Quản Lý Phân Quyền Người Dùng & Phạm Vi Chi Phí</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {users.length} tài khoản
                </span>
              </h2>
              <p className="text-[10.5px] sm:text-xs text-blue-200/70">
                Phân quyền vai trò (Admin / Biên tập / Chỉ xem) và phạm vi chuyên môn (Kỹ thuật, Xây dựng, Đào tạo...)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncFromSheet}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer disabled:opacity-50"
              title="Đồng bộ danh sách tài khoản từ Sheet QUAN_TRI_USER trên Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Toolbar: Search, Filters & Add button */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 bg-slate-50/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, tài khoản, phòng ban..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value={ROLES.ADMIN}>👑 Quản trị viên (Admin)</option>
              <option value={ROLES.EDITOR}>✏️ Biên tập / Kế toán</option>
              <option value={ROLES.VIEWER}>👁️ Người xem (Viewer)</option>
            </select>

            {/* Scope Filter */}
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả phạm vi</option>
              <option value="KY_THUAT">🛠️ Kỹ thuật (Máy & Xe)</option>
              <option value="XAY_DUNG">🏗️ Xây dựng (Hạ tầng)</option>
              <option value="DAO_TAO">🎓 Đào tạo & Huấn luyện</option>
              <option value="HANH_CHINH">🏢 Hành chính VP</option>
              <option value="AN_NINH">🛡️ An ninh & PCCC</option>
              <option value="CUSTOM">⚙️ Tùy chọn linh hoạt</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm User Mới</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="py-2.5 px-3 text-center w-10">STT</th>
                  <th className="py-2.5 px-3">Tài Khoản / Họ Tên</th>
                  <th className="py-2.5 px-3">Phòng Ban / Chức Vụ</th>
                  <th className="py-2.5 px-3 text-center">Vai Trò</th>
                  <th className="py-2.5 px-3">Phạm Vi Chi Phí</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const normRole = normalizeRole(u.role);
                    const roleMeta = ROLE_INFO[normRole] || ROLE_INFO[ROLES.VIEWER];
                    const scopeMeta = getUserScopeInfo(u);
                    const isCurrentUser = u.email.toLowerCase() === currentUser?.email?.toLowerCase();
                    const isLocked = u.status === 'KHOA';

                    return (
                      <tr
                        key={u.email}
                        className={`hover:bg-slate-50 transition-colors ${
                          isLocked ? 'bg-slate-50/60 opacity-70' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] border border-slate-200 shrink-0">
                              {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className="truncate">{u.name || u.email.split('@')[0]}</span>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-100 text-blue-700 font-semibold border border-blue-200">
                                    Bạn
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
                                <span>{u.email}</span>
                                {u.password && (
                                  <span className="text-[9.5px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" title="Mật khẩu">
                                    Pass: {u.password}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 font-medium">
                          {u.department || 'Phòng TC-KH'}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleMeta.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${roleMeta.dotClass}`} />
                            <span>{roleMeta.shortLabel}</span>
                          </span>
                        </td>

                        {/* Expense Scope Badge */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col items-start gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${scopeMeta.badgeClass}`}
                              title={scopeMeta.description}
                            >
                              <span>{scopeMeta.iconText}</span>
                              <span>{scopeMeta.shortLabel}</span>
                            </span>
                            {u.expenseScope === 'CUSTOM' && Array.isArray(u.allowedCodes) && u.allowedCodes.length > 0 && (
                              <span className="text-[9.5px] font-mono text-slate-400">
                                ({u.allowedCodes.length} mã được chọn)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <Lock className="w-3 h-3" />
                              <span>Đã khóa</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Unlock className="w-3 h-3" />
                              <span>Hoạt động</span>
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              disabled={isCurrentUser}
                              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                isLocked
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              }`}
                              title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            >
                              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              title="Sửa quyền hạn & phạm vi chi phí"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.email)}
                              disabled={isCurrentUser}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Xóa quyền truy cập"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-slate-500 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span>👑 <strong>Admin</strong>: Làm tất cả</span>
            <span>✏️ <strong>Biên tập</strong>: Thêm & Sửa (không xóa)</span>
            <span>👁️ <strong>Viewer</strong>: Chỉ xem theo phạm vi</span>
          </div>

          <span className="text-slate-400">
            Tự động đồng bộ với Sheet <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">QUAN_TRI_USER</code>
          </span>
        </div>
      </div>

      {/* Submodal Add / Edit User Form */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{editingUser ? 'Chỉnh Sửa Quyền Hạn & Phạm Vi' : 'Thêm Người Dùng Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Username / Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tài khoản / Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={Boolean(editingUser)}
                  placeholder="ví dụ: kythuat@company.vn hoặc username"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Mật khẩu truy cập (mặc định: 123456)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
                  required
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phòng ban / Chức vụ
                </label>
                <input
                  type="text"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  placeholder="ví dụ: Đội Kỹ thuật - TTB, Phòng TC-KH..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Role Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò (Quyền hạn chức năng) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: ROLES.ADMIN, label: 'Admin', desc: 'Toàn quyền' },
                    { id: ROLES.EDITOR, label: 'Biên tập', desc: 'Thêm & Sửa' },
                    { id: ROLES.VIEWER, label: 'Chỉ xem', desc: 'Tra cứu' },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        formRole === r.id
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                      }`}
                    >
                      <input
                        type="radio"
                        name="userRole"
                        value={r.id}
                        checked={formRole === r.id}
                        onChange={() => setFormRole(r.id)}
                        className="sr-only"
                      />
                      <div className="text-xs">{r.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{r.desc}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* EXPENSE SCOPE (Phạm vi chi phí chuyên môn) */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-900">
                    Phạm vi chi phí được phép xem <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10.5px] text-blue-600 font-medium">
                    (Phân hệ theo chuyên môn)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(EXPENSE_SCOPES).map((scope) => (
                    <label
                      key={scope.id}
                      className={`p-2 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                        formScope === scope.id
                          ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="expenseScope"
                        value={scope.id}
                        checked={formScope === scope.id}
                        onChange={() => setFormScope(scope.id)}
                        className="sr-only"
                      />
                      <span className="text-base leading-none shrink-0 mt-0.5">{scope.iconText}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11.5px] leading-tight font-bold">{scope.label}</div>
                        <div className="text-[9.5px] text-slate-500 font-normal leading-tight mt-0.5 line-clamp-2">
                          {scope.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* If CUSTOM is selected: Show searchable budget item checklist */}
                {formScope === 'CUSTOM' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-teal-600" />
                        <span>Tùy chọn mã khoản mục ({formAllowedCodes.length} đã chọn):</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectAllCustom(initialBudgets.map((b) => b.code))}
                          className="px-2 py-0.5 text-[10px] rounded bg-white border border-slate-200 text-blue-700 font-bold hover:bg-blue-50 cursor-pointer"
                        >
                          Chọn tất cả (76)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormAllowedCodes([])}
                          className="px-2 py-0.5 text-[10px] rounded bg-white border border-slate-200 text-rose-700 font-bold hover:bg-rose-50 cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={customSearch}
                        onChange={(e) => setCustomSearch(e.target.value)}
                        placeholder="Tìm mã hoặc tên khoản mục..."
                        className="w-full pl-7 pr-3 py-1 rounded-lg border border-slate-200 bg-white text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg bg-white">
                      {filteredBudgetOptions.map((item) => {
                        const isChecked = formAllowedCodes.includes(item.code);
                        return (
                          <label
                            key={item.code}
                            className={`flex items-center gap-2 p-2 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                              isChecked ? 'bg-teal-50/50' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCode(item.code)}
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="font-mono font-bold text-slate-700 shrink-0 text-[11px]">
                              {item.code}
                            </span>
                            <span className="text-slate-800 text-[11px] truncate flex-1 font-medium">
                              {item.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái tài khoản
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="HOAT_DONG">Hoạt động (Được đăng nhập)</option>
                  <option value="KHOA">Khóa quyền (Không thể đăng nhập)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú nhiệm vụ, phân công..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {editingUser ? 'Cập Nhật Quyền Hạn' : 'Lưu Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
