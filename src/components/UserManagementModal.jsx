import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
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
} from 'lucide-react';
import { useModalBackHandler } from '../hooks/useModalBackHandler';
import {
  ROLES,
  ROLE_INFO,
  normalizeRole,
} from '../utils/permissions';
import {
  getSavedUsers,
  saveSavedUsers,
  saveUserToGoogleSheet,
  deleteUserFromGoogleSheet,
  fetchFromGoogleSheet,
  getSavedWebhookUrl,
} from '../services/googleSheetService';

export default function UserManagementModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState(getSavedUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form states for Add / Edit
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formDept, setFormDept] = useState('Phòng TC-KH');
  const [formRole, setFormRole] = useState(ROLES.VIEWER);
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

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormEmail('');
    setFormName('');
    setFormDept('Phòng TC-KH');
    setFormRole(ROLES.VIEWER);
    setFormNotes('');
    setFormStatus('HOAT_DONG');
    setFormError('');
    setIsAddUserOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormEmail(u.email);
    setFormName(u.name || '');
    setFormDept(u.department || 'Phòng TC-KH');
    setFormRole(normalizeRole(u.role));
    setFormNotes(u.notes || '');
    setFormStatus(u.status || 'HOAT_DONG');
    setFormError('');
    setIsAddUserOpen(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanEmail = formEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setFormError('Vui lòng nhập địa chỉ Email Google.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setFormError('Email Google không hợp lệ.');
      return;
    }

    // Check duplicate if adding new
    if (!editingUser) {
      const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        setFormError('Email này đã được cấp quyền trong hệ thống. Bạn có thể chọn Chỉnh sửa.');
        return;
      }
    }

    const userData = {
      email: cleanEmail,
      name: formName.trim() || cleanEmail.split('@')[0],
      department: formDept.trim() || 'Phòng TC-KH',
      role: formRole,
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
    const updated = { ...u, status: newStatus };
    const updatedList = users.map((item) => (item.email.toLowerCase() === u.email.toLowerCase() ? updated : item));
    setUsers(updatedList);
    saveSavedUsers(updatedList);
    showToast(newStatus === 'KHOA' ? `Đã khóa quyền truy cập của ${u.email}` : `Đã mở khóa tài khoản ${u.email}`);

    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      saveUserToGoogleSheet(webhookUrl, updated);
    }
  };

  const handleDeleteUser = (email) => {
    if (email.toLowerCase() === currentUser?.email?.toLowerCase()) {
      alert('Bạn không thể tự xóa tài khoản của chính mình.');
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa quyền truy cập của tài khoản ${email}?`)) {
      const updatedList = users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
      setUsers(updatedList);
      saveSavedUsers(updatedList);
      showToast(`Đã xóa tài khoản ${email}`);

      const webhookUrl = getSavedWebhookUrl();
      if (webhookUrl) {
        deleteUserFromGoogleSheet(webhookUrl, email);
      }
    }
  };

  const handleSyncFromSheet = async () => {
    setIsSyncing(true);
    try {
      const webhookUrl = getSavedWebhookUrl();
      const res = await fetchFromGoogleSheet(webhookUrl);
      if (Array.isArray(res.users) && res.users.length > 0) {
        setUsers(res.users);
        showToast(`Đã đồng bộ thành công ${res.users.length} tài khoản từ Sheet QUAN_TRI_USER!`);
      } else {
        showToast('Đã kết nối với Sheet thành công!');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể nạp danh sách từ Google Sheet: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#074780] via-[#09579d] to-[#074780] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Quản Trị Người Dùng & Phân Quyền</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                  Google Workspace
                </span>
              </h2>
              <p className="text-[11px] text-blue-200/80">
                Quản lý danh sách tài khoản Google và quyền hạn (Admin / Kế toán / Viewer)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncFromSheet}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer disabled:opacity-50"
              title="Lấy lại danh sách User mới nhất từ Google Sheet QUAN_TRI_USER"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới từ Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo email, họ tên, phòng ban..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value={ROLES.ADMIN}>Quản trị viên (Admin)</option>
              <option value={ROLES.EDITOR}>Kế toán / Biên tập</option>
              <option value={ROLES.VIEWER}>Chỉ xem (Viewer)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm User Mới</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="py-2.5 px-3 text-center w-10">STT</th>
                  <th className="py-2.5 px-3">Tài Khoản Google / Họ Tên</th>
                  <th className="py-2.5 px-3">Phòng Ban / Chức Vụ</th>
                  <th className="py-2.5 px-3 text-center">Vai Trò (Quyền Hạn)</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const normRole = normalizeRole(u.role);
                    const roleMeta = ROLE_INFO[normRole] || ROLE_INFO[ROLES.VIEWER];
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
                              <p className="text-[11px] font-mono text-slate-500 truncate">{u.email}</p>
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
                            <span>{roleMeta.label}</span>
                          </span>
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
                              title="Sửa phân quyền"
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

        {/* Footer info & Rules summary */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-700 font-semibold">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Quy tắc:</span>
            </span>
            <span>👑 <strong>Admin</strong>: Làm tất cả</span>
            <span>✏️ <strong>Biên tập</strong>: Thêm & Sửa (không xóa)</span>
            <span>👁️ <strong>Viewer</strong>: Chỉ xem</span>
          </div>

          <span className="text-slate-400">
            Tự động đồng bộ với Sheet <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">QUAN_TRI_USER</code>
          </span>
        </div>
      </div>

      {/* Modal Add / Edit User Form */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{editingUser ? 'Chỉnh Sửa Phân Quyền' : 'Thêm Người Dùng Google Mới'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Google của người dùng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={Boolean(editingUser)}
                  placeholder="ví dụ: nhanvien@gmail.com hoặc user@acv.vn"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>

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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phòng ban / Chức vụ
                </label>
                <input
                  type="text"
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  placeholder="ví dụ: Phòng TC-KH, Ban Giám Đốc..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò (Quyền hạn) <span className="text-rose-500">*</span>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái
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

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Thêm Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
