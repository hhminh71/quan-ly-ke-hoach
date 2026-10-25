/**
 * GOOGLE APPS SCRIPT CHO HỆ THỐNG QUẢN LÝ KẾ HOẠCH & CHI PHÍ
 * 
 * Hướng dẫn cài đặt nhanh:
 * 1. Mở file Google Sheets trên trình duyệt: https://sheets.google.com
 * 2. Vào menu: Tiện ích mở rộng (Extensions) -> Apps Script
 * 3. Xóa hết code mặc định và dán toàn bộ nội dung file này vào.
 * 4. Bấm nút "Lưu" (biểu tượng đĩa mềm 💾 hoặc Ctrl + S).
 * 5. Bấm nút màu xanh "Triển khai" (Deploy) -> Chọn "Tùy chọn triển khai mới" (New deployment).
 * 6. Chọn loại triển khai: "Ứng dụng web" (Web app).
 * 7. Thiết lập cấu hình:
 *    - Mô tả: "API Quản Lý Kế Hoạch V1"
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me - tài khoản Google của bạn)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone) -> (Bắt buộc để Web App gửi dữ liệu được).
 * 8. Bấm "Triển khai" (Deploy) -> Cấp quyền cho script -> Sao chép URL ứng dụng web (Web App URL).
 * 9. Dán URL này vào mục "Cấu hình Google Sheet" trên Web App.
 */

const SHEET_TRANSACTIONS = 'SO_CAI_PHIEU_CHI';
const SHEET_BUDGETS = 'KE_HOACH_NGAN_SACH';

/**
 * Xử lý yêu cầu GET: Đọc toàn bộ dữ liệu trả về cho Web App
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getData';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Tự động khởi tạo bảng nếu chưa có
    ensureSheetsInitialized(ss);

    if (action === 'getData') {
      const transactions = getTransactionsFromSheet(ss);
      const budgets = getBudgetsFromSheet(ss);

      return createJsonResponse({
        status: 'success',
        transactions: transactions,
        budgets: budgets,
        serverTime: new Date().toISOString()
      });
    }

    return createJsonResponse({ status: 'error', message: 'Action không hợp lệ' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Xử lý yêu cầu POST: Thêm mới, cập nhật hoặc xóa phiếu từ Web App
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSheetsInitialized(ss);

    let data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    const action = data.action;

    // 1. Thêm 1 phiếu mới
    if (action === 'addTransaction') {
      const t = data.transaction;
      if (!t) throw new Error('Không có dữ liệu phiếu chi');

      const sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
      sheet.appendRow([
        t.id || Date.now(),
        t.date || new Date().toISOString().split('T')[0],
        t.accountCode || '',
        t.category || '',
        t.group || '',
        t.employeeName || '',
        Number(t.amount) || 0,
        t.notes || '',
        t.createdAt || Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm')
      ]);

      return createJsonResponse({
        status: 'success',
        message: 'Đã thêm phiếu vào Google Sheet thành công',
        id: t.id
      });
    }

    // 2. Xóa 1 phiếu theo ID
    if (action === 'deleteTransaction') {
      const idToDelete = String(data.id);
      const sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
      const values = sheet.getDataRange().getValues();

      let deleted = false;
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === idToDelete) {
          sheet.deleteRow(i + 1);
          deleted = true;
          break;
        }
      }

      return createJsonResponse({
        status: 'success',
        message: deleted ? 'Đã xóa phiếu thành công' : 'Không tìm thấy ID để xóa'
      });
    }

    return createJsonResponse({ status: 'error', message: 'Hành động POST không hợp lệ' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Hàm lấy danh sách giao dịch từ sheet SO_CAI_PHIEU_CHI
 */
function getTransactionsFromSheet(ss) {
  const sheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[6]) continue; // Bỏ qua dòng trống

    list.push({
      id: r[0],
      date: formatDate(r[1]),
      accountCode: String(r[2] || ''),
      category: String(r[3] || ''),
      group: String(r[4] || ''),
      employeeName: String(r[5] || ''),
      amount: Number(r[6]) || 0,
      notes: String(r[7] || ''),
      createdAt: String(r[8] || '09:00'),
      status: 'Đã thực hiện'
    });
  }
  return list;
}

/**
 * Hàm lấy danh sách 76 khoản mục từ sheet KE_HOACH_NGAN_SACH
 */
function getBudgetsFromSheet(ss) {
  const sheet = ss.getSheetByName(SHEET_BUDGETS);
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;

    list.push({
      code: String(r[0]),
      name: String(r[1] || ''),
      group: String(r[2] || ''),
      approvedAmount: Number(r[3]) || 0,
      bravoAmount: Number(r[4]) || 0,
      scope: String(r[5] || '')
    });
  }
  return list;
}

/**
 * Đảm bảo 2 sheet cần thiết luôn tồn tại và có tiêu đề
 */
function ensureSheetsInitialized(ss) {
  // 1. Sheet sổ cái giao dịch
  let txSheet = ss.getSheetByName(SHEET_TRANSACTIONS);
  if (!txSheet) {
    txSheet = ss.insertSheet(SHEET_TRANSACTIONS);
    txSheet.appendRow([
      'ID Phiếu',
      'Ngày',
      'Mã Khoản Mục',
      'Tên Khoản Mục',
      'Nhóm Chi Phí',
      'Người Thực Hiện',
      'Số Tiền (VNĐ)',
      'Nội Dung Ghi Chú',
      'Thời Gian Ghi'
    ]);
    txSheet.getRange('1:1').setFontWeight('bold').setBackground('#eff6ff');
    txSheet.setFrozenRows(1);
  }

  // 2. Sheet ngân sách kế hoạch
  let bgSheet = ss.getSheetByName(SHEET_BUDGETS);
  if (!bgSheet) {
    bgSheet = ss.insertSheet(SHEET_BUDGETS);
    bgSheet.appendRow([
      'Mã Kế Hoạch',
      'Tên Hạng Mục',
      'Nhóm Chi Phí',
      'Được Duyệt (VNĐ)',
      'Số Liệu Bravo (VNĐ)',
      'Quy Mô / Diễn Giải'
    ]);
    bgSheet.getRange('1:1').setFontWeight('bold').setBackground('#f0fdf4');
    bgSheet.setFrozenRows(1);
  }
}

/**
 * Trợ giúp format ngày tháng YYYY-MM-DD
 */
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'GMT+7', 'yyyy-MM-dd');
  }
  return String(val);
}

/**
 * Tạo phản hồi JSON chuẩn CORS cho Web App
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
