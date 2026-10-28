/**
 * Service kết nối và đồng bộ 2 chiều với Google Sheets qua Google Apps Script Webhook
 */

const STORAGE_KEY_WEBHOOK_URL = 'app_google_sheet_webhook_url';
const STORAGE_KEY_LAST_SYNC = 'app_last_sync_time';

export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbypvdO6D1QW4K_PgKlIRAoUFfWnRyC4Wkn3oYU4Tbz5GOyX5gd3zpIhx93715PKUp8A/exec';

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

/**
 * Lấy toàn bộ dữ liệu (Kế hoạch & Giao dịch) từ Google Sheet
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
            cleanDate = String(t.accountCode).split('T')[0];
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

  setLastSyncTime();
  return result; // { budgets: [...], transactions: [...], bravoInfo: [...] }
};

/**
 * Ghi 1 phiếu chi mới vào Google Sheet
 */
export const addTransactionToGoogleSheet = async (webhookUrl, transaction) => {
  const url = webhookUrl || getSavedWebhookUrl();
  if (!url) return null; // Nếu chưa cấu hình, bỏ qua không báo lỗi

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // text/plain để tránh CORS preflight check của Google Apps Script
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
    // Vẫn trả về null để Web App không bị gián đoạn hoạt động offline
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
 * Cập nhật trực tiếp nội dung 1 phiếu chi trên Google Sheet (Đồng bộ tức thì)
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
