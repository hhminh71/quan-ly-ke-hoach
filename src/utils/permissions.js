/**
 * HỆ THỐNG PHÂN QUYỀN NGƯỜI DÙNG & PHẠM VI CHI PHÍ
 * (ROLE-BASED & EXPENSE SCOPE ACCESS CONTROL)
 * 
 * 1. Vai trò (Role level):
 * - ADMIN: Toàn quyền (Thêm, Sửa, Xóa, Quản lý User, Cài đặt hệ thống, Phê duyệt ngân sách)
 * - EDITOR: Thêm mới & Sửa phiếu chi trong phạm vi được giao, Không xóa, Không quản lý user
 * - VIEWER: Chỉ xem, tra cứu, đối soát và xuất báo cáo trong phạm vi được giao
 * 
 * 2. Phạm vi chi phí được phép xem (Expense Scope):
 * - ALL: Xem toàn bộ chi phí toàn cảng (Admin / Lãnh đạo / Kế toán tổng hợp)
 * - KY_THUAT: Chi phí SCTX Máy móc thiết bị, Phương tiện vận tải, CCDC sửa chữa
 * - XAY_DUNG: Chi phí SCTX Cơ sở hạ tầng, Nhà ga, Sân đường, Mương thoát nước
 * - DAO_TAO: Chi phí Đào tạo, huấn luyện chuyên môn, sát hạch cấp phép
 * - HANH_CHINH: Văn phòng phẩm, điện nước, thông tin liên lạc, tiếp khách, công tác phí
 * - AN_NINH: An ninh hàng không, PCCC, máy soi, bảo vệ, tem nhãn
 * - CUSTOM: Tùy chọn linh hoạt từng mã khoản mục cụ thể
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
 * Danh mục Phạm vi chi phí phân hệ (Expense Scopes)
 */
export const EXPENSE_SCOPES = {
  ALL: {
    id: 'ALL',
    label: 'Tất cả chi phí (Toàn cảng)',
    shortLabel: 'Toàn cảng',
    iconText: '🌐',
    description: 'Xem toàn bộ 76 khoản mục chi phí và toàn bộ phiếu chi',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700/50',
    dotClass: 'bg-emerald-500',
    prefixes: [], // Mảng rỗng nghĩa là không giới hạn
  },
  KY_THUAT: {
    id: 'KY_THUAT',
    label: 'Kỹ thuật (Máy móc, Thiết bị & Xe vận tải)',
    shortLabel: 'Kỹ thuật (Máy & Xe)',
    iconText: '🛠️',
    description: 'Chi phí SCTX Máy móc thiết bị (627622) & Phương tiện vận tải (627623)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700/50',
    dotClass: 'bg-blue-500',
    prefixes: [
      '627622', // SCTX Máy móc thiết bị (18 khoản mục: băng chuyền, thang máy, camera, máy lạnh, CCTV...)
      '627623', // SCTX Phương tiện vận tải (5 khoản mục: xe cứu hỏa, xe chuyên dùng bay, ô tô...)
      '627321', // Chi phí sửa chữa CCDC
      '627322', // Chi phí sửa chữa CCDC gián tiếp
      '62725',  // Hóa chất hệ thống lạnh, vật liệu xử lý
      '6416',   // Chi phí bảo dưỡng, sửa chữa
    ],
  },
  XAY_DUNG: {
    id: 'XAY_DUNG',
    label: 'Xây dựng (Cơ sở hạ tầng & Nhà ga)',
    shortLabel: 'Xây dựng (Hạ tầng)',
    iconText: '🏗️',
    description: 'Chi phí SCTX Nhà cửa, Vật kiến trúc, Đường cất hạ cánh, Sân đỗ, Mương nước (627621)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700/50',
    dotClass: 'bg-amber-500',
    prefixes: [
      '627621', // SCTX Cơ sở hạ tầng (8 khoản mục: nhà ga quốc nội, bến bãi, mương nước, cắt cỏ, sân đậu...)
      '627816', // Chăm sóc cây cảnh và trang trí nhà ga, văn phòng
    ],
  },
  DAO_TAO: {
    id: 'DAO_TAO',
    label: 'Đào tạo & Huấn luyện nghiệp vụ',
    shortLabel: 'Đào tạo & Huấn luyện',
    iconText: '🎓',
    description: 'Chi phí Đào tạo, bồi dưỡng nghiệp vụ chuyên ngành hàng không, cấp phép vận hành (627715)',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700/50',
    dotClass: 'bg-purple-500',
    prefixes: [
      '627715', // Đào tạo, huấn luyện
      '627817', // Chi phí cấp phép an ninh, vận hành trang thiết bị
    ],
  },
  HANH_CHINH: {
    id: 'HANH_CHINH',
    label: 'Hành chính - Quản trị - Văn phòng',
    shortLabel: 'Hành chính VP',
    iconText: '🏢',
    description: 'Văn phòng phẩm, điện nước, thông tin liên lạc, tiếp khách, công tác phí',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700/50',
    dotClass: 'bg-indigo-500',
    prefixes: [
      '627701', // Thuê dịch vụ vệ sinh
      '627708', // Thông tin liên lạc
      '627709', // Tiền điện
      '627710', // Tiền nước
      '627801', // Trang phục ngành
      '627804', // Bảo hộ lao động
      '627806', // Văn phòng phẩm
      '627807', // Giấy, mực in, mực photo
      '627808', // Mua, in ấn chứng từ tài liệu
      '627809', // Hội nghị, khánh thành
      '627810', // Chi phí giao dịch
      '627812', // Công tác phí trong nước
      '627813', // Lệ phí giao thông cầu đường, đăng kiểm
      '627312', // Trang thiết bị văn phòng
      '627314', // Bàn ghế, tủ quầy
    ],
  },
  AN_NINH: {
    id: 'AN_NINH',
    label: 'An ninh hàng không & PCCC',
    shortLabel: 'An ninh & PCCC',
    iconText: '🛡️',
    description: 'Công tác an ninh, an toàn hàng không, PCCC, máy soi, tem nhãn an ninh',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700/50',
    dotClass: 'bg-rose-500',
    prefixes: [
      '627826',   // Công tác an ninh, an toàn hàng không
      '627818',   // Công tác PCCC
      '62762208', // Máy móc thiết bị kiểm tra an ninh
      '62762211', // Thiết bị PCCC
      '62723',    // Tem nhãn kiểm tra an ninh
      '627702',   // Thuê dịch vụ bảo vệ
    ],
  },
  CUSTOM: {
    id: 'CUSTOM',
    label: 'Tùy chọn danh mục chi phí (Custom)',
    shortLabel: 'Tùy chọn linh hoạt',
    iconText: '⚙️',
    description: 'Tùy chọn các mã khoản mục chi phí cụ thể do Admin thiết lập',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700/50',
    dotClass: 'bg-teal-500',
    prefixes: [],
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
 * Chuẩn hóa mã phạm vi chi phí
 */
export const normalizeExpenseScope = (scopeStr) => {
  if (!scopeStr) return 'ALL';
  const str = String(scopeStr).toUpperCase().trim();
  if (EXPENSE_SCOPES[str]) return str;
  if (str.includes('KỸ THUẬT') || str.includes('KY_THUAT') || str.includes('MÁY MÓC') || str.includes('PHƯƠNG TIỆN') || str.includes('THIẾT BỊ')) return 'KY_THUAT';
  if (str.includes('XÂY DỰNG') || str.includes('XAY_DUNG') || str.includes('HẠ TẦNG') || str.includes('KCHTHK')) return 'XAY_DUNG';
  if (str.includes('ĐÀO TẠO') || str.includes('DAO_TAO') || str.includes('HUẤN LUYỆN')) return 'DAO_TAO';
  if (str.includes('HÀNH CHÍNH') || str.includes('HANH_CHINH') || str.includes('VĂN PHÒNG')) return 'HANH_CHINH';
  if (str.includes('AN NINH') || str.includes('AN_NINH') || str.includes('PCCC')) return 'AN_NINH';
  if (str.includes('CUSTOM') || str.includes('TÙY CHỌN')) return 'CUSTOM';
  return 'ALL';
};

/**
 * Tự động nhận diện phạm vi chi phí chuẩn xác nhất của User
 * (Kể cả khi Google Sheet chưa có cột Scope hoặc khi bị thiếu dữ liệu)
 */
export const resolveUserScope = (user) => {
  if (!user) return 'ALL';
  if (normalizeRole(user.role) === ROLES.ADMIN) return 'ALL';

  const explicit = user.expenseScope;
  if (explicit && explicit !== 'ALL' && explicit !== '*') {
    return normalizeExpenseScope(explicit);
  }

  // Tự động nhận diện thông minh theo email, tên hoặc phòng ban
  const email = String(user.email || '').toLowerCase();
  const dept = String(user.department || '').toLowerCase();
  const name = String(user.name || '').toLowerCase();
  const notes = String(user.notes || '').toLowerCase();

  if (email.includes('xaydung') || dept.includes('xây dựng') || dept.includes('hạ tầng') || name.includes('xây dựng') || notes.includes('hạ tầng')) {
    return 'XAY_DUNG';
  }
  if (email.includes('kythuat') || dept.includes('kỹ thuật') || dept.includes('máy móc') || name.includes('kỹ thuật') || notes.includes('máy móc')) {
    return 'KY_THUAT';
  }
  if (email.includes('daotao') || dept.includes('đào tạo') || dept.includes('huấn luyện') || name.includes('đào tạo') || notes.includes('đào tạo')) {
    return 'DAO_TAO';
  }
  if (email.includes('hanhchinh') || dept.includes('hành chính') || dept.includes('văn phòng')) {
    return 'HANH_CHINH';
  }
  if (email.includes('anninh') || dept.includes('an ninh') || dept.includes('pccc')) {
    return 'AN_NINH';
  }

  return normalizeExpenseScope(explicit);
};

/**
 * Lấy thông tin hiển thị phạm vi chi phí của User
 */
export const getUserScopeInfo = (user) => {
  if (!user || normalizeRole(user.role) === ROLES.ADMIN) {
    return EXPENSE_SCOPES.ALL;
  }
  const scopeKey = resolveUserScope(user);
  return EXPENSE_SCOPES[scopeKey] || EXPENSE_SCOPES.ALL;
};

/**
 * Kiểm tra 1 mã khoản mục chi phí có nằm trong phạm vi được phép của User hay không
 */
export const isAccountCodeAllowedForUser = (accountCode, user) => {
  if (!user) return true;
  // Admin luôn có toàn quyền xem tất cả
  if (normalizeRole(user.role) === ROLES.ADMIN) return true;

  const scopeKey = resolveUserScope(user);
  // Nếu là ALL thì xem được toàn bộ
  if (scopeKey === 'ALL') return true;

  const cleanCode = String(accountCode || '').trim();
  if (!cleanCode) return true;

  // 1. Kiểm tra nếu có danh sách mã tùy chọn cụ thể (allowedCodes)
  if (user.allowedCodes) {
    let allowedList = [];
    if (Array.isArray(user.allowedCodes)) {
      allowedList = user.allowedCodes;
    } else if (typeof user.allowedCodes === 'string') {
      allowedList = user.allowedCodes.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (allowedList.length > 0) {
      const matched = allowedList.some((allowed) => {
        const a = String(allowed).trim();
        return cleanCode === a || cleanCode.startsWith(a) || a.startsWith(cleanCode);
      });
      if (matched) return true;
    }
  }

  // 2. Kiểm tra theo tiền tố cấu hình của phạm vi
  const scopeConfig = EXPENSE_SCOPES[scopeKey];
  if (scopeConfig && scopeConfig.prefixes && scopeConfig.prefixes.length > 0) {
    return scopeConfig.prefixes.some((prefix) => cleanCode.startsWith(prefix) || prefix.startsWith(cleanCode));
  }

  // Mặc định nếu là CUSTOM nhưng chưa gán mã nào thì từ chối
  if (scopeKey === 'CUSTOM') return false;

  return false;
};

/**
 * Lọc danh sách Ngân sách (budgets) theo phạm vi của User
 */
export const filterBudgetsForUser = (budgets, user) => {
  if (!Array.isArray(budgets)) return [];
  if (!user || normalizeRole(user.role) === ROLES.ADMIN) return budgets;
  if (resolveUserScope(user) === 'ALL') return budgets;

  return budgets.filter((b) => isAccountCodeAllowedForUser(b.code, user));
};

/**
 * Lọc danh sách Phiếu chi Sổ Cái (transactions) theo phạm vi của User
 */
export const filterTransactionsForUser = (transactions, user) => {
  if (!Array.isArray(transactions)) return [];
  if (!user || normalizeRole(user.role) === ROLES.ADMIN) return transactions;
  if (resolveUserScope(user) === 'ALL') return transactions;

  return transactions.filter((t) => isAccountCodeAllowedForUser(t.accountCode, user));
};

/**
 * Lọc danh sách Đối soát Bravo (bravoInfo) theo phạm vi của User
 */
export const filterBravoInfoForUser = (bravoInfo, user) => {
  if (!Array.isArray(bravoInfo)) return [];
  if (!user || normalizeRole(user.role) === ROLES.ADMIN) return bravoInfo;
  if (resolveUserScope(user) === 'ALL') return bravoInfo;

  return bravoInfo.filter((item) => {
    if (!item.code) return true; // Giữ lại tiêu đề nhóm cha
    return isAccountCodeAllowedForUser(item.code, user);
  });
};

/**
 * Kiểm tra quyền thao tác chức năng của user
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
