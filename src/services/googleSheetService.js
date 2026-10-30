/**
 * Service kết nối và đồng bộ 2 chiều với Google Sheets qua Google Apps Script Webhook
 */

const STORAGE_KEY_WEBHOOK_URL = 'app_google_sheet_webhook_url';
const STORAGE_KEY_LAST_SYNC = 'app_last_sync_time';
const STORAGE_KEY_USERS = 'app_users_list_v3';

export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbypvdO6D1QW4K_PgKlIRAoUFfWnRyC4Wkn3oYU4Tbz5GOyX5gd3zpIhx93715PKUp8A/exec';

export const DEFAULT_USERS = [
  {
    email: 'admin@company.vn',
    password: 'admin123',
    name: 'Quản trị viên trưởng',
    department: 'Phòng TC-KH',
    role: 'ADMIN',
    expenseScope: 'ALL',
    allowedCodes: [],
    status: 'HOAT_DONG',
    createdAt: '29/10/2026 11:50',
    notes: 'Quản trị hệ thống toàn quyền',
  },
  {
    email: 'ketoan@company.vn',
    password: 'ketoan123',
    name: 'Nguyễn Thị Lan (Kế toán)',
    department: 'Tổ Kế toán chi phí',
    role: 'EDITOR',
    expenseScope: 'ALL',
    allowedCodes: [],
    status: 'HOAT_DONG',
    createdAt: '29/10/2026 11:50',
    notes: 'Biên tập & nhập số liệu chi phí toàn cảng',
  },
  {
    email: 'kythuat@company.vn',
    password: 'kythuat123',
    name: 'Kỹ sư Kỹ thuật (Máy móc & Xe)',
    department: 'Đội Kỹ thuật - TTB',
    role: 'VIEWER',
    expenseScope: 'KY_THUAT',
    allowedCodes: [],
    status: 'HOAT_DONG',
    createdAt: '29/10/2026 14:30',
    notes: 'Chỉ xem SCTX Máy móc thiết bị (627622) & Xe vận tải (627623)',
  },
  {
    email: 'xaydung@company.vn',
    password: 'xaydung123',
    name: 'Kỹ sư Xây dựng (Hạ tầng)',
    department: 'Đội Xây dựng - KCHTHK',
    role: 'VIEWER',
    expenseScope: 'XAY_DUNG',
    allowedCodes: [],
    status: 'HOAT_DONG',
    createdAt: '29/10/2026 14:30',
    notes: 'Chỉ xem SCTX Cơ sở hạ tầng, Nhà ga, Sân đường (627621)',
  },
  {
    email: 'daotao@company.vn',
    password: 'daotao123',
    name: 'Chuyên viên Đào tạo',
    department: 'Phòng TCHC - Tổ Đào tạo',
    role: 'VIEWER',
    expenseScope: 'DAO_TAO',
    allowedCodes: [],
    status: 'HOAT_DONG',
    createdAt: '29/10/2026 14:30',
    notes: 'Chỉ xem Chi phí Đào tạo, huấn luyện chuyên môn (627715)',
  },
  {
    email: 'viewer@company.vn',
    password: 'viewer123',
    name: 'Trần Văn Bình (Ban Giám Đốc)',
    department: 'Ban Giám Đốc Cảng',
    role: 'VIEWER',
    expenseScope: 'ALL',
    allowedCodes: [],
    status: 'HOAT_DONG',
    createdAt: '29/10/2026 11:50',
    notes: 'Tra cứu & xem báo cáo toàn cảng',
  },
];

export const getSavedWebhookUrl = () => {
  return localStorage.getItem(STORAGE_KEY_WEBHOOK_URL) || DEFAULT_WEBHOOK_URL;
};

export const saveWebhookUrl = (url) => {
  if (url) {
    localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_WEBHOOK_URL);
  }
};

export const getLastSyncTime = () => {
  return localStorage.getItem(STORAGE_KEY_LAST_SYNC) || null;
};

export const setLastSyncTime = (timestamp = new Date().toISOString()) => {
  localStorage.setItem(STORAGE_KEY_LAST_SYNC, timestamp);
};

export const getSavedUsers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u) => ({
          ...u,
          password: u.password || (u.email.includes('admin') ? 'admin123' : u.email.includes('ketoan') ? 'ketoan123' : '123456'),
          expenseScope: u.expenseScope || (u.email.includes('kythuat') ? 'KY_THUAT' : u.email.includes('xaydung') ? 'XAY_DUNG' : u.email.includes('daotao') ? 'DAO_TAO' : 'ALL'),
          allowedCodes: Array.isArray(u.allowedCodes) ? u.allowedCodes : (typeof u.allowedCodes === 'string' ? u.allowedCodes.split(',').map(s => s.trim()).filter(Boolean) : []),
        }));
      }
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_USERS;
};

export const saveSavedUsers = (users) => {
  if (Array.isArray(users)) {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }
};

/**
 * Lấy toàn bộ dữ liệu (Kế hoạch, Giao dịch & Danh sách User phân quyền) từ Google Sheet
 */
export const fetchFromGoogleSheet = async (webhookUrl) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) {
    throw new Error('Chưa thiết lập URL Webhook Google Sheet');
  }

  // Thêm timestamp để tránh cache trình duyệt
  const targetUrl = `${url}?action=getData&_t=${Date.now()}`;
  
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Lỗi kết nối Google Sheet: HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Lỗi khi đọc từ Google Sheet');
  }

  // Chuẩn hóa và làm sạch toàn bộ dữ liệu giao dịch từ Google Sheet
  if (Array.isArray(result.transactions)) {
    result.transactions = result.transactions.map((t, idx) => {
      const isShifted =
        /^\d{4}$/.test(String(t.date || '').trim()) &&
        (String(t.accountCode || '').includes('GMT') ||
          String(t.accountCode || '').includes(':') ||
          (isNaN(t.accountCode) && String(t.accountCode).length > 10));

      let rec = t;
      if (isShifted) {
        let cleanDate = '';
        try {
          const d = new Date(t.accountCode);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            cleanDate = `${y}-${m}-${day}`;
          } else {
            cleanDate = String(t.accountCode);
          }
        } catch (e) {
          cleanDate = String(t.accountCode);
        }

        rec = {
          id: t.id || idx + 1,
          date: cleanDate,
          accountCode: String(t.category || '').trim(),
          category: String(t.group || '').trim(),
          group: String(t.employeeName || '').trim(),
          employeeName: t.employeeName && t.employeeName !== 'SỬA CHỮA THƯỜNG XUYÊN' ? String(t.employeeName) : 'Cán bộ phụ trách',
          amount: Number(t.notes) || 0,
          notes: String(t.createdAt || ''),
          createdAt: '09:00',
          status: 'Đã thực hiện',
        };
      }

      // Đảm bảo mọi trường luôn có kiểu dữ liệu chuẩn, không bị crash bởi null/number
      return {
        id: rec.id || idx + 1,
        fiscalYear: String(rec.fiscalYear || (rec.date && rec.date.length >= 4 ? rec.date.substring(0, 4) : '')).trim(),
        date: String(rec.date || '').trim(),
        accountCode: String(rec.accountCode || '').trim(),
        category: String(rec.category || '').trim(),
        group: String(rec.group || '').trim(),
        employeeName: String(rec.employeeName || '').trim(),
        amount: Number(rec.amount) || 0,
        notes: String(rec.notes || '').trim(),
        createdAt: String(rec.createdAt || '09:00'),
        status: String(rec.status || 'Đã thực hiện'),
      };
    });
  }

  // Tự động kết nối và ánh xạ số liệu thực hiện Bravo từ sheet INFO vào từng khoản mục kế hoạch
  if (Array.isArray(result.budgets) && Array.isArray(result.bravoInfo)) {
    const bravoMap = {};
    result.bravoInfo.forEach((item) => {
      if (item && item.code) {
        bravoMap[String(item.code).trim()] = Number(item.bravoAmount) || 0;
      }
    });

    result.budgets = result.budgets.map((b) => {
      const codeKey = String(b.code || '').trim();
      const valFromBravo = bravoMap[codeKey];
      return {
        ...b,
        bravoActual:
          valFromBravo !== undefined
            ? valFromBravo
            : Number(b.bravoActual !== undefined ? b.bravoActual : b.bravoAmount) || 0,
      };
    });
  }

  // Tự động làm sạch và chuẩn hóa danh sách người dùng phân quyền từ sheet QUAN_TRI_USER
  if (Array.isArray(result.users) && result.users.length > 0) {
    result.users = result.users.map((u) => {
      const email = String(u.email || '').toLowerCase().trim();
      const defaultMatch = DEFAULT_USERS.find((d) => d.email.toLowerCase() === email);

      let scope = u.expenseScope;
      if (!scope || scope === 'ALL') {
        if (defaultMatch?.expenseScope && defaultMatch.expenseScope !== 'ALL') {
          scope = defaultMatch.expenseScope;
        } else if (email.includes('xaydung') || String(u.department || '').toLowerCase().includes('xây dựng') || String(u.name || '').toLowerCase().includes('xây dựng')) {
          scope = 'XAY_DUNG';
        } else if (email.includes('kythuat') || String(u.department || '').toLowerCase().includes('kỹ thuật') || String(u.name || '').toLowerCase().includes('kỹ thuật')) {
          scope = 'KY_THUAT';
        } else if (email.includes('daotao') || String(u.department || '').toLowerCase().includes('đào tạo') || String(u.name || '').toLowerCase().includes('đào tạo')) {
          scope = 'DAO_TAO';
        } else if (email.includes('hanhchinh') || String(u.department || '').toLowerCase().includes('hành chính')) {
          scope = 'HANH_CHINH';
        } else if (email.includes('anninh') || String(u.department || '').toLowerCase().includes('an ninh')) {
          scope = 'AN_NINH';
        } else {
          scope = 'ALL';
        }
      }

      let codes = [];
      if (Array.isArray(u.allowedCodes) && u.allowedCodes.length > 0) {
        codes = u.allowedCodes;
      } else if (typeof u.allowedCodes === 'string' && u.allowedCodes.trim()) {
        codes = u.allowedCodes.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
      } else if (typeof scope === 'string' && /\d{3,}/.test(scope)) {
        codes = scope.split(/[,;\s]+/).map((s) => s.trim()).filter((s) => /\d{3,}/.test(s));
      } else if (defaultMatch?.allowedCodes && defaultMatch.allowedCodes.length > 0) {
        codes = defaultMatch.allowedCodes;
      }

      return {
        ...u,
        email: email,
        password: u.password || defaultMatch?.password || '123456',
        expenseScope: scope,
        allowedCodes: codes,
      };
    });

    saveSavedUsers(result.users);
  }

  setLastSyncTime();
  return result; // { budgets: [...], transactions: [...], bravoInfo: [...], users: [...] }
};

/**
 * Ghi 1 phiếu chi mới vào Google Sheet
 */
export const addTransactionToGoogleSheet = async (webhookUrl, transaction) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'addTransaction',
        transaction: transaction,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Không thể đồng bộ phiếu lên Google Sheet:', error);
    return null;
  }
};

/**
 * Xóa 1 phiếu chi trên Google Sheet
 */
export const deleteTransactionFromGoogleSheet = async (webhookUrl, transactionId) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteTransaction',
        id: transactionId,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Không thể xóa phiếu trên Google Sheet:', error);
    return null;
  }
};

/**
 * Cập nhật trực tiếp nội dung 1 phiếu chi trên Google Sheet
 */
export const updateTransactionInGoogleSheet = async (webhookUrl, transaction) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'updateTransaction',
        transaction: transaction,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Không thể cập nhật phiếu trên Google Sheet:', error);
    return null;
  }
};

/**
 * Lưu hoặc cập nhật phân quyền 1 User lên Google Sheet (Sheet QUAN_TRI_USER)
 */
export const saveUserToGoogleSheet = async (webhookUrl, user) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'saveUser',
        user: user,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Không thể lưu user lên Google Sheet:', error);
    return null;
  }
};

/**
 * Xóa quyền của 1 User trên Google Sheet (Sheet QUAN_TRI_USER)
 */
export const deleteUserFromGoogleSheet = async (webhookUrl, email) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) return null;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'deleteUser',
        email: email,
      }),
    });

    return await response.json();
  } catch (error) {
    console.error('Không thể xóa user trên Google Sheet:', error);
    return null;
  }
};

/**
 * Gửi dữ liệu đối soát Bravo lên Google Sheet (Ghi đè tab INFO)
 */
export const syncBravoInfoToGoogleSheet = async (webhookUrl, items, updateTime) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) throw new Error('Chưa cấu hình URL Webhook Google Sheet');

  const timeStr = updateTime || new Date().toLocaleString('vi-VN');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'syncBravoInfo',
      updateTime: timeStr,
      items: items,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lỗi kết nối Webhook: HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Lỗi khi cập nhật tab INFO trên Google Sheet');
  }

  return result;
};

/**
 * Lấy file Excel Bravo mới nhất từ link hoặc ID thư mục Google Drive qua Webhook Apps Script
 * @param {string} webhookUrl
 * @param {string} driveUrl
 * @returns {Promise<{ status: string, fileName: string, folderName: string, lastUpdated: string, fileSize: number, base64: string }>}
 */
export const fetchBravoFromDrive = async (webhookUrl, driveUrl) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) {
    throw new Error('Chưa kết nối Webhook Google Sheet. Vui lòng vào "Cài đặt kết nối Google Sheet" để dán URL Webhook trước khi đồng bộ từ Google Drive.');
  }

  if (!driveUrl || !driveUrl.trim()) {
    throw new Error('Vui lòng nhập link hoặc ID thư mục Google Drive.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({
      action: 'fetchBravoFromDrive',
      driveUrl: driveUrl.trim(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Lỗi kết nối Webhook Google Apps Script: HTTP ${response.status}`);
  }

  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message || 'Lỗi khi tải file từ Google Drive');
  }

  return result;
};
