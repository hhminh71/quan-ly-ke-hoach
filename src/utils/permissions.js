/**
 * HỆ THỐNG PHÂN QUYỀN NGƯỜI DÙNG (ROLE-BASED ACCESS CONTROL)
 * 
 * 3 cấp độ vai trò:
 * 1. ADMIN (Quản trị viên): Toàn quyền (Thêm, Sửa, Xóa, Quản trị User, Cài đặt kết nối, Chỉnh sửa dự toán)
 * 2. EDITOR (Kế toán / Biên tập): Được thêm mới và sửa hạng mục chi phí, KHÔNG được xóa, KHÔNG quản trị user
 * 3. VIEWER (Chỉ xem): Chỉ xem, tìm kiếm, lọc, xuất báo cáo. KHÔNG được thêm, sửa, xóa
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
};

export const ROLE_INFO = {
  [ROLES.ADMIN]: {
    name: 'ADMIN',
    label: 'Quản trị viên (Admin)',
    shortLabel: 'Admin',
    description: 'Toàn quyền quản trị, thêm/sửa/xóa dữ liệu và phân quyền tài khoản',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-400/40',
    dotClass: 'bg-amber-400',
    iconColor: 'text-amber-400',
  },
  [ROLES.EDITOR]: {
    name: 'EDITOR',
    label: 'Kế toán / Biên tập (Editor)',
    shortLabel: 'Biên tập',
    description: 'Thêm mới và cập nhật hạng mục chi phí, không được xóa và không cài đặt',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-400/40',
    dotClass: 'bg-sky-400',
    iconColor: 'text-sky-400',
  },
  [ROLES.VIEWER]: {
    name: 'VIEWER',
    label: 'Người xem (Viewer)',
    shortLabel: 'Chỉ xem',
    description: 'Chỉ tra cứu số liệu, xem biểu đồ, đối chiếu Bravo và xuất báo cáo',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-400/30',
    dotClass: 'bg-slate-400',
    iconColor: 'text-slate-400',
  },
};

/**
 * Chuẩn hóa chuỗi vai trò về mã chuẩn: 'ADMIN' | 'EDITOR' | 'VIEWER'
 */
export const normalizeRole = (roleStr) => {
  if (!roleStr) return ROLES.VIEWER;
  const str = String(roleStr).toUpperCase().trim();
  if (str.includes('ADMIN') || str.includes('QUẢN TRỊ')) return ROLES.ADMIN;
  if (str.includes('EDIT') || str.includes('BIÊN TẬP') || str.includes('KẾ TOÁN') || str.includes('CHUYÊN VIÊN')) return ROLES.EDITOR;
  return ROLES.VIEWER;
};

/**
 * Kiểm tra quyền thao tác của user
 */
export const hasPermission = (user, permission) => {
  const role = normalizeRole(user?.role);

  switch (permission) {
    // 1. Quản lý phân quyền tài khoản người dùng
    case 'MANAGE_USERS':
      return role === ROLES.ADMIN;

    // 2. Cài đặt hệ thống, kết nối Webhook Google Sheets
    case 'SETTINGS':
      return role === ROLES.ADMIN;

    // 3. Xóa hạng mục / phiếu chi trong sổ cái
    case 'DELETE_TRANSACTION':
      return role === ROLES.ADMIN;

    // 4. Thêm năm kế hoạch mới / Sửa định mức ngân sách tổng thể
    case 'EDIT_BUDGET_PLANS':
      return role === ROLES.ADMIN;

    // 5. Thêm mới hạng mục / phiếu chi
    case 'ADD_TRANSACTION':
      return role === ROLES.ADMIN || role === ROLES.EDITOR;

    // 6. Chỉnh sửa hạng mục / phiếu chi
    case 'EDIT_TRANSACTION':
      return role === ROLES.ADMIN || role === ROLES.EDITOR;

    // 7. Đồng bộ thủ công dữ liệu từ Google Sheet / Bravo
    case 'SYNC_DATA':
      return role === ROLES.ADMIN || role === ROLES.EDITOR;

    // 8. Xem số liệu, Dashboard, Sổ cái, Đối soát, Giả lập điện thoại, Xuất báo cáo Excel
    case 'VIEW_DATA':
    case 'EXPORT_DATA':
    case 'VIEW_SIMULATOR':
      return true;

    default:
      return role === ROLES.ADMIN;
  }
};

export const canAdd = (user) => hasPermission(user, 'ADD_TRANSACTION');
export const canEdit = (user) => hasPermission(user, 'EDIT_TRANSACTION');
export const canDelete = (user) => hasPermission(user, 'DELETE_TRANSACTION');
export const canManageUsers = (user) => hasPermission(user, 'MANAGE_USERS');
export const canSettings = (user) => hasPermission(user, 'SETTINGS');
