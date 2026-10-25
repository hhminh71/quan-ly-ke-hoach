/**
 * Service kết nối và đồng bộ 2 chiều với Google Sheets qua Google Apps Script Webhook
 */

const STORAGE_KEY_WEBHOOK_URL = 'app_google_sheet_webhook_url';
const STORAGE_KEY_LAST_SYNC = 'app_last_sync_time';

export const getSavedWebhookUrl = () => {
  return localStorage.getItem(STORAGE_KEY_WEBHOOK_URL) || '';
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

  // Chuẩn hóa dữ liệu nếu bản triển khai Apps Script cũ bị lệch cột do mới thêm cột Năm
  if (Array.isArray(result.transactions)) {
    result.transactions = result.transactions.map((t) => {
      const isShifted =
        /^\d{4}$/.test(String(t.date || '').trim()) &&
        (String(t.accountCode || '').includes('GMT') ||
          String(t.accountCode || '').includes(':') ||
          (isNaN(t.accountCode) && String(t.accountCode).length > 10));

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

        return {
          id: t.id,
          date: cleanDate,
          accountCode: String(t.category || '').trim(),
          category: String(t.group || '').trim(),
          group: String(t.employeeName || '').trim(),
          employeeName: t.employeeName && t.employeeName !== 'SỬA CHỮA THƯỜNG XUYÊN' ? t.employeeName : 'Cán bộ phụ trách',
          amount: Number(t.notes) || 0,
          notes: String(t.createdAt || ''),
          createdAt: '09:00',
          status: 'Đã thực hiện',
        };
      }
      return t;
    });
  }

  setLastSyncTime();
  return result; // { budgets: [...], transactions: [...] }
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
