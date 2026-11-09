/**
 * TIỆN ÍCH XUẤT BÁO CÁO EXCEL CHUẨN DOANH NGHIỆP (.XLSX)
 * (Chuẩn định dạng bảng Google Sheet / MS Excel hỗ trợ tiếng Việt có dấu, kẻ bảng, phân cách hàng nghìn bằng dấu chấm,
 * chuẩn nén OpenXML .xlsx tương thích 100% không báo lỗi định dạng)
 */

export const formatVndNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const val = Math.round(Number(num));
  return val.toLocaleString('vi-VN');
};

const formatDateNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatDateShort = (d) => {
  if (!d) return '';
  const str = String(d).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return str;
};

/**
 * Đảm bảo nạp thư viện XLSX có hỗ trợ styles (xlsx-js-style)
 */
export const ensureXLSX = async () => {
  if (typeof window !== 'undefined' && window.XLSX && window.XLSX.style_version) {
    return window.XLSX;
  }

  return new Promise((resolve, reject) => {
    // 1. Thử nạp từ static nội bộ (public/xlsx.full.min.js đã tích hợp xlsx-js-style)
    const script = document.createElement('script');
    script.src = '/xlsx.full.min.js';
    script.async = true;

    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
      } else {
        reject(new Error('Thư viện XLSX không khả dụng'));
      }
    };

    script.onerror = () => {
      // 2. Fallback CDN nếu cần
      console.warn('Không tải được /xlsx.full.min.js, chuyển sang CDN xlsx-js-style...');
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js';
      cdnScript.async = true;
      cdnScript.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error('Không thể tải thư viện XLSX từ CDN'));
      };
      cdnScript.onerror = (err) => reject(new Error('Lỗi nạp thư viện Excel: ' + err.message));
      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });
};

/**
 * Tải workbook xuống trình duyệt với định dạng chuẩn .xlsx (MIME OpenXML)
 */
export const downloadXLSX = (XLSX, wb, filename) => {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ==================== BẢNG STYLE TIÊU CHUẨN ====================
const borderThin = {
  top: { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

const borderTotal = {
  top: { style: 'thin', color: { rgb: '0F172A' } },
  bottom: { style: 'double', color: { rgb: '0F172A' } },
  left: { style: 'thin', color: { rgb: 'CBD5E1' } },
  right: { style: 'thin', color: { rgb: 'CBD5E1' } }
};

const fontHeader = { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } };
const fontData = { name: 'Arial', sz: 9.5 };
const fontBold = { name: 'Arial', sz: 9.5, bold: true };

const stHeader = {
  fill: { fgColor: { rgb: '15803D' } }, // Màu xanh lá chuẩn Google Sheet
  font: fontHeader,
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: borderThin
};

const stCenter = {
  font: fontData,
  alignment: { horizontal: 'center', vertical: 'center' },
  border: borderThin
};

const stCenterBold = {
  font: fontBold,
  alignment: { horizontal: 'center', vertical: 'center' },
  border: borderThin
};

const stLeft = {
  font: fontData,
  alignment: { horizontal: 'left', vertical: 'center' },
  border: borderThin
};

const stLeftBold = {
  font: fontBold,
  alignment: { horizontal: 'left', vertical: 'center' },
  border: borderThin
};

const stRight = {
  font: fontData,
  alignment: { horizontal: 'right', vertical: 'center' },
  border: borderThin
};

const stRightBold = {
  font: fontBold,
  alignment: { horizontal: 'right', vertical: 'center' },
  border: borderThin
};

const stTotalCenter = {
  fill: { fgColor: { rgb: 'E2E8F0' } },
  font: { name: 'Arial', sz: 10, bold: true },
  alignment: { horizontal: 'center', vertical: 'center' },
  border: borderTotal
};

const stTotalLeft = {
  fill: { fgColor: { rgb: 'E2E8F0' } },
  font: { name: 'Arial', sz: 10, bold: true },
  alignment: { horizontal: 'left', vertical: 'center' },
  border: borderTotal
};

const stTotalRight = {
  fill: { fgColor: { rgb: 'E2E8F0' } },
  font: { name: 'Arial', sz: 10, bold: true },
  alignment: { horizontal: 'right', vertical: 'center' },
  border: borderTotal
};

// Helper gán cell an toàn
function setCell(ws, r, c, val, type = 's', numFmt = undefined, style = undefined) {
  const colLetter = (typeof window !== 'undefined' && window.XLSX)
    ? window.XLSX.utils.encode_col(c)
    : String.fromCharCode(65 + c);
  const cellRef = `${colLetter}${r + 1}`;
  const cell = { t: type, v: val };
  if (numFmt) cell.z = numFmt;
  if (style) cell.s = style;
  ws[cellRef] = cell;
}

/**
 * 1. XUẤT BÁO CÁO TIẾN ĐỘ KẾ HOẠCH NGÂN SÁCH THEO NĂM (.XLSX)
 * - File chuẩn .xlsx
 * - Cột STT căn giữa
 * - Đã ẩn cột "Nhóm chi phí"
 * - Cột có chi phí bóp gọn theo số (không bóp theo chiều dài tên cột)
 * - Cột tiến độ căn giữa
 * - Cột trạng thái căn giữa
 */
export const exportProgressReportExcel = async ({
  items = [],
  summary = {},
  selectedYear = '2026',
  user = null,
  scopeInfo = null,
}) => {
  const XLSX = await ensureXLSX();
  const exportTime = formatDateNow();
  const userName = user?.name || user?.email || 'Quản trị viên';
  const scopeLabel = scopeInfo?.label || 'Toàn cảng (76 khoản mục)';

  const totalApproved = summary.totalApproved || items.reduce((s, b) => s + (Number(b.selectedYearApproved) || 0), 0);
  const totalBravo = summary.totalBravo || items.reduce((s, b) => s + (Number(b.bravoVal) || 0), 0);
  const totalActual = summary.totalLiveActual || items.reduce((s, b) => s + (Number(b.liveActual) || 0), 0);
  const totalReport = summary.totalReportActual || items.reduce((s, b) => s + (Number(b.reportActual) || 0), 0);
  const totalRemaining = totalApproved - totalReport;
  const avgPercent = totalApproved > 0 ? (totalReport / totalApproved) : 0;

  const ws = {};
  const merges = [];
  let row = 0;

  // HEADER CƠ QUAN / ĐƠN VỊ (11 cột: 0-4 và 5-10)
  setCell(ws, row, 0, 'TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP', 's', null, {
    font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, 5, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 4 } });
  merges.push({ s: { r: row, c: 5 }, e: { r: row, c: 10 } });
  row++;

  setCell(ws, row, 0, 'CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TC-KH', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, 5, 'Độc lập - Tự do - Hạnh phúc', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 4 } });
  merges.push({ s: { r: row, c: 5 }, e: { r: row, c: 10 } });
  row++;

  // Dòng trống
  row++;

  // TIÊU ĐỀ BÁO CÁO
  setCell(ws, row, 0, `BÁO CÁO TIẾN ĐỘ THỰC HIỆN KẾ HOẠCH NGÂN SÁCH NĂM ${selectedYear}`, 's', null, {
    font: { name: 'Arial', sz: 15, bold: true, color: { rgb: '0F4C81' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 10 } });
  row++;

  setCell(ws, row, 0, `(Phạm vi: ${scopeLabel} • Xuất lúc: ${exportTime} • Người xuất: ${userName})`, 's', null, {
    font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 10 } });
  row++;

  setCell(ws, row, 10, 'Đơn vị tính: Đồng Việt Nam (VNĐ)', 's', null, {
    font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'right', vertical: 'center' }
  });
  row++;

  // TIÊU ĐỀ BẢNG (ĐÃ ẨN CỘT NHÓM CHI PHÍ)
  const headers = [
    'STT',
    'MÃ KH',
    'TÊN HẠNG MỤC / KHOẢN MỤC',
    `HẠN MỨC DUYỆT (${selectedYear})`,
    'THEO BRAVO',
    'THEO THỰC TẾ',
    'CHI PHÍ BÁO CÁO (MAX)',
    'CÒN LẠI KHẢ DỤNG',
    'TIẾN ĐỘ (%)',
    'TRẠNG THÁI',
    'QUY MÔ / DIỄN GIẢI CHI TIẾT'
  ];

  headers.forEach((h, c) => {
    setCell(ws, row, c, h, 's', null, stHeader);
  });
  row++;

  // DỮ LIỆU CÁC KHOẢN MỤC
  items.forEach((item, index) => {
    const approved = Number(item.selectedYearApproved) || 0;
    const bravo = Number(item.bravoVal) || 0;
    const actual = Number(item.liveActual) || 0;
    const report = Number(item.reportActual) || 0;
    const remaining = Number(item.liveRemaining) || (approved - report);
    const pct = approved > 0 ? (report / approved) : 0;
    const pctNumber = pct * 100;

    let statusText = 'An toàn';
    let statusColor = '166534';
    if (pctNumber >= 100) {
      statusText = 'Vượt mức';
      statusColor = 'B91C1C';
    } else if (pctNumber >= 80) {
      statusText = 'Cảnh báo';
      statusColor = 'B45309';
    }

    // 0. STT: Canh giữa
    setCell(ws, row, 0, index + 1, 'n', null, stCenter);
    // 1. Mã KH: Canh giữa, bold
    setCell(ws, row, 1, item.code || '', 's', null, stCenterBold);
    // 2. Tên hạng mục: Canh trái, bold
    setCell(ws, row, 2, item.name || '', 's', null, stLeftBold);
    // 3. Hạn mức duyệt (bóp gọn theo số)
    setCell(ws, row, 3, approved, 'n', '#,##0', stRightBold);
    // 4. Theo Bravo (bóp gọn theo số)
    setCell(ws, row, 4, bravo, 'n', '#,##0', stRight);
    // 5. Theo Thực tế (bóp gọn theo số)
    setCell(ws, row, 5, actual, 'n', '#,##0', stRight);
    // 6. Chi phí Báo cáo MAX (bóp gọn theo số)
    setCell(ws, row, 6, report, 'n', '#,##0', {
      ...stRightBold,
      font: { ...fontBold, color: { rgb: '0D9488' } }
    });
    // 7. Còn lại khả dụng (bóp gọn theo số)
    setCell(ws, row, 7, remaining, 'n', '#,##0', {
      ...stRightBold,
      font: { ...fontBold, color: { rgb: remaining < 0 ? 'B91C1C' : '15803D' } }
    });
    // 8. Tiến độ (%): Canh giữa
    setCell(ws, row, 8, pct, 'n', '0.0%', stCenterBold);
    // 9. Trạng thái: Canh giữa
    setCell(ws, row, 9, statusText, 's', null, {
      ...stCenterBold,
      font: { ...fontBold, color: { rgb: statusColor } }
    });
    // 10. Quy mô / Diễn giải
    setCell(ws, row, 10, item.scope || item.notes || '', 's', null, stLeft);

    row++;
  });

  // DÒNG TỔNG CỘNG
  setCell(ws, row, 0, 'TỔNG CỘNG', 's', null, stTotalCenter);
  setCell(ws, row, 1, '', 's', null, stTotalCenter);
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });

  setCell(ws, row, 2, `${items.length} KHOẢN MỤC CHI PHÍ`, 's', null, stTotalLeft);

  setCell(ws, row, 3, totalApproved, 'n', '#,##0', stTotalRight);
  setCell(ws, row, 4, totalBravo, 'n', '#,##0', stTotalRight);
  setCell(ws, row, 5, totalActual, 'n', '#,##0', stTotalRight);
  setCell(ws, row, 6, totalReport, 'n', '#,##0', {
    ...stTotalRight,
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '0D9488' } }
  });
  setCell(ws, row, 7, totalRemaining, 'n', '#,##0', {
    ...stTotalRight,
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: totalRemaining < 0 ? 'B91C1C' : '15803D' } }
  });

  // Tiến độ tổng cộng canh giữa
  setCell(ws, row, 8, avgPercent, 'n', '0.0%', {
    ...stTotalCenter,
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '4F46E5' } }
  });

  // Trạng thái tổng cộng canh giữa
  const totalStatusText = avgPercent >= 1 ? 'VƯỢT KẾ HOẠCH' : avgPercent >= 0.8 ? 'CẢNH BÁO CAO' : 'TIẾN ĐỘ AN TOÀN';
  setCell(ws, row, 9, totalStatusText, 's', null, stTotalCenter);
  setCell(ws, row, 10, '', 's', null, stTotalCenter);
  merges.push({ s: { r: row, c: 9 }, e: { r: row, c: 10 } });
  row++;

  // Dòng trống
  row++;

  // KHỐI CHỮ KÝ XÁC NHẬN CHUẨN KẾ TOÁN (11 CỘT)
  setCell(ws, row, 6, 'Cần Thơ, ngày ..... tháng ..... năm 2026', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 6 }, e: { r: row, c: 10 } });
  row++;

  setCell(ws, row, 0, 'NGƯỜI LẬP BIỂU', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 3, 'KẾ TOÁN CHI PHÍ', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 6, 'TRƯỞNG PHÒNG TC-KH', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 8, 'GIÁM ĐỐC CẢNG', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });
  merges.push({ s: { r: row, c: 3 }, e: { r: row, c: 5 } });
  merges.push({ s: { r: row, c: 6 }, e: { r: row, c: 7 } });
  merges.push({ s: { r: row, c: 8 }, e: { r: row, c: 10 } });
  row++;

  setCell(ws, row, 0, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 3, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 6, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 8, '(Ký, đóng dấu)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });
  merges.push({ s: { r: row, c: 3 }, e: { r: row, c: 5 } });
  merges.push({ s: { r: row, c: 6 }, e: { r: row, c: 7 } });
  merges.push({ s: { r: row, c: 8 }, e: { r: row, c: 10 } });
  row += 3;

  setCell(ws, row, 0, userName, 's', null, { font: { name: 'Arial', sz: 10, bold: true }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });

  // THIẾT LẬP ĐỘ RỘNG CỘT (Cột chi phí bóp gọn theo số ~15-16ch)
  ws['!cols'] = [
    { wch: 6 },   // STT
    { wch: 12 },  // MÃ KH
    { wch: 38 },  // TÊN HẠNG MỤC
    { wch: 16 },  // HẠN MỨC DUYỆT (bóp gọn theo số)
    { wch: 15 },  // THEO BRAVO (bóp gọn theo số)
    { wch: 15 },  // THEO THỰC TẾ (bóp gọn theo số)
    { wch: 16 },  // CHI PHÍ BÁO CÁO (MAX) (bóp gọn theo số)
    { wch: 16 },  // CÒN LẠI KHẢ DỤNG (bóp gọn theo số)
    { wch: 12 },  // TIẾN ĐỘ (%)
    { wch: 14 },  // TRẠNG THÁI
    { wch: 35 }   // QUY MÔ / DIỄN GIẢI
  ];
  ws['!merges'] = merges;
  ws['!ref'] = `A1:K${row + 1}`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `TienDo_${selectedYear}`);

  const fileName = `Bao_Cao_Tien_Do_Ngan_Sach_${selectedYear}_${new Date().toISOString().substring(0, 10)}.xlsx`;
  downloadXLSX(XLSX, wb, fileName);
};

/**
 * 2. XUẤT BẢNG KẾ HOẠCH NGÂN SÁCH ĐA NĂM (.XLSX)
 * - File chuẩn .xlsx
 * - Cột STT căn giữa
 * - Đã ẩn cột "Nhóm chi phí"
 * - Cột chi phí các năm bóp gọn theo số (~15-16ch)
 */
export const exportMatrixReportExcel = async ({
  items = [],
  matrixYears = ['2024', '2025', '2026', '2027'],
  user = null,
  scopeInfo = null,
}) => {
  const XLSX = await ensureXLSX();
  const exportTime = formatDateNow();
  const userName = user?.name || user?.email || 'Quản trị viên';
  const scopeLabel = scopeInfo?.label || 'Toàn cảng';

  const yearTotals = {};
  matrixYears.forEach((yr) => {
    yearTotals[yr] = items.reduce((sum, b) => {
      const val = (b.yearlyApproved && b.yearlyApproved[yr]) !== undefined ? b.yearlyApproved[yr] : (yr === '2026' ? b.approvedAmount : 0);
      return sum + (Number(val) || 0);
    }, 0);
  });

  const totalCols = 3 + matrixYears.length + 1; // STT, MA KH, TEN, [YEARS], QUY MO
  const ws = {};
  const merges = [];
  let row = 0;

  // Header cơ quan
  const midCol = Math.floor(totalCols / 2);
  setCell(ws, row, 0, 'TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP', 's', null, {
    font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, midCol, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: midCol - 1 } });
  merges.push({ s: { r: row, c: midCol }, e: { r: row, c: totalCols - 1 } });
  row++;

  setCell(ws, row, 0, 'CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TC-KH', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, midCol, 'Độc lập - Tự do - Hạnh phúc', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: midCol - 1 } });
  merges.push({ s: { r: row, c: midCol }, e: { r: row, c: totalCols - 1 } });
  row++;

  // Dòng trống
  row++;

  // Tiêu đề
  setCell(ws, row, 0, `BẢNG KẾ HOẠCH NGÂN SÁCH GIAI ĐOẠN (${matrixYears.join(' - ')})`, 's', null, {
    font: { name: 'Arial', sz: 15, bold: true, color: { rgb: '0F4C81' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
  row++;

  setCell(ws, row, 0, `(Chuẩn mẫu trang tính Google Sheet KE_HOACH_NGAN_SACH • Phạm vi: ${scopeLabel} • Xuất lúc: ${exportTime})`, 's', null, {
    font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: totalCols - 1 } });
  row++;

  setCell(ws, row, totalCols - 1, 'Đơn vị tính: Đồng Việt Nam (VNĐ)', 's', null, {
    font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'right', vertical: 'center' }
  });
  row++;

  // Tiêu đề bảng (ẨN CỘT NHÓM CHI PHÍ)
  const matrixHeaders = [
    'STT',
    'MÃ KẾ HOẠCH',
    'TÊN HẠNG MỤC / KHOẢN MỤC',
    ...matrixYears.map((yr) => `KẾ HOẠCH ${yr}`),
    'QUY MÔ / DIỄN GIẢI KẾ HOẠCH'
  ];

  matrixHeaders.forEach((h, c) => {
    const isCurrentYear = h.includes('2026');
    const customHeaderStyle = isCurrentYear
      ? { ...stHeader, fill: { fgColor: { rgb: '047857' } } }
      : stHeader;
    setCell(ws, row, c, h, 's', null, customHeaderStyle);
  });
  row++;

  // Dữ liệu
  items.forEach((item, index) => {
    // 0. STT: Canh giữa
    setCell(ws, row, 0, index + 1, 'n', null, stCenter);
    // 1. Mã KH: Canh giữa, bold
    setCell(ws, row, 1, item.code || '', 's', null, stCenterBold);
    // 2. Tên: Canh trái, bold
    setCell(ws, row, 2, item.name || '', 's', null, stLeftBold);

    // Các cột năm: Canh phải, bold, bóp gọn theo số
    let c = 3;
    matrixYears.forEach((yr) => {
      const val = (item.yearlyApproved && item.yearlyApproved[yr]) !== undefined ? item.yearlyApproved[yr] : (yr === '2026' ? item.approvedAmount : 0);
      setCell(ws, row, c, Number(val) || 0, 'n', '#,##0', stRightBold);
      c++;
    });

    // Cột diễn giải
    setCell(ws, row, c, item.scope || item.notes || '', 's', null, stLeft);
    row++;
  });

  // DÒNG TỔNG CỘNG
  setCell(ws, row, 0, 'TỔNG CỘNG', 's', null, stTotalCenter);
  setCell(ws, row, 1, '', 's', null, stTotalCenter);
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });

  setCell(ws, row, 2, `${items.length} KHOẢN MỤC KẾ HOẠCH`, 's', null, stTotalLeft);

  let cTot = 3;
  matrixYears.forEach((yr) => {
    setCell(ws, row, cTot, yearTotals[yr] || 0, 'n', '#,##0', {
      ...stTotalRight,
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '047857' } }
    });
    cTot++;
  });

  setCell(ws, row, cTot, 'TOÀN BỘ DANH MỤC ĐƯỢC DUYỆT', 's', null, stTotalCenter);
  row++;

  // Dòng trống
  row++;

  // Khối chữ ký
  const sigCol = Math.floor(totalCols / 3);
  setCell(ws, row, totalCols - sigCol, 'Cần Thơ, ngày ..... tháng ..... năm 2026', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: totalCols - sigCol }, e: { r: row, c: totalCols - 1 } });
  row++;

  setCell(ws, row, 0, 'NGƯỜI LẬP BIỂU', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, sigCol, 'TRƯỞNG PHÒNG TC-KH', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, totalCols - sigCol, 'GIÁM ĐỐC CẢNG', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: sigCol - 1 } });
  merges.push({ s: { r: row, c: sigCol }, e: { r: row, c: totalCols - sigCol - 1 } });
  merges.push({ s: { r: row, c: totalCols - sigCol }, e: { r: row, c: totalCols - 1 } });
  row++;

  setCell(ws, row, 0, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, sigCol, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, totalCols - sigCol, '(Ký, đóng dấu)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: sigCol - 1 } });
  merges.push({ s: { r: row, c: sigCol }, e: { r: row, c: totalCols - sigCol - 1 } });
  merges.push({ s: { r: row, c: totalCols - sigCol }, e: { r: row, c: totalCols - 1 } });
  row += 3;

  setCell(ws, row, 0, userName, 's', null, { font: { name: 'Arial', sz: 10, bold: true }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: sigCol - 1 } });

  // ĐỘ RỘNG CỘT (Cột chi phí các năm bóp gọn theo số ~16ch)
  ws['!cols'] = [
    { wch: 6 },   // STT
    { wch: 13 },  // MÃ KẾ HOẠCH
    { wch: 40 },  // TÊN HẠNG MỤC
    ...matrixYears.map(() => ({ wch: 16 })), // Cột KẾ HOẠCH {yr} bóp gọn theo số
    { wch: 35 }   // QUY MÔ / DIỄN GIẢI
  ];
  ws['!merges'] = merges;
  ws['!ref'] = `A1:${String.fromCharCode(65 + totalCols - 1)}${row + 1}`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'KeHoachNganSach');

  const fileName = `Bang_Ke_Hoach_Ngan_Sach_${matrixYears.join('_')}_${new Date().toISOString().substring(0, 10)}.xlsx`;
  downloadXLSX(XLSX, wb, fileName);
};

/**
 * 3. XUẤT CSV TIẾN ĐỘ (Chuẩn UTF-8 có BOM)
 */
export const exportProgressReportCSV = ({
  items = [],
  selectedYear = '2026',
}) => {
  // Đã ẩn cột Nhóm chi phí
  const headers = [
    'STT',
    'MaKhoanMuc',
    'TenHangMuc',
    `HanMucDuyet_${selectedYear}`,
    'TheoBravo',
    'TheoThucTe',
    'ChiPhiBaoCaoMax',
    'ConLaiKhaDung',
    'TienDoPercent',
    'TrangThai',
    'GhiChuQuyMo',
  ].join(',');

  const rows = items.map((item, index) => {
    const approved = Number(item.selectedYearApproved) || 0;
    const bravo = Number(item.bravoVal) || 0;
    const actual = Number(item.liveActual) || 0;
    const report = Number(item.reportActual) || 0;
    const remaining = Number(item.liveRemaining) || (approved - report);
    const percent = approved > 0 ? ((report / approved) * 100).toFixed(1) : '0.0';

    return [
      index + 1,
      `"${item.code || ''}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${formatVndNumber(approved)}"`,
      `"${formatVndNumber(bravo)}"`,
      `"${formatVndNumber(actual)}"`,
      `"${formatVndNumber(report)}"`,
      `"${formatVndNumber(remaining)}"`,
      `"${percent}%"`,
      `"${item.status || 'SAFE'}"`,
      `"${(item.scope || item.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const content = '\uFEFF' + headers + '\n' + rows.join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Bao_Cao_Tien_Do_${selectedYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 4. XUẤT BÁO CÁO SỔ CÁI CHI TIẾT CHO RIÊNG MỘT MÃ KHOẢN MỤC (.XLSX)
 * - File chuẩn .xlsx
 * - BỎ PHẦN DASHBOARD PHÍA TRÊN HÀNG TIÊU ĐỀ (GIỐNG BẢNG BÁO CÁO TỔNG)
 * - Cột STT căn giữa
 * - Cột trạng thái căn giữa ("Đã BCMS" / "Dự Kiến")
 * - Cột có chi phí bóp gọn theo số (~16ch)
 */
export const exportAccountLedgerExcel = async ({
  account = {},
  transactions = [],
  selectedYear = '2026',
  approved = 0,
  bravoVal = 0,
  spent = 0,
  reportActual = 0,
  remaining = 0,
  isSeparated = false,
  user = null,
  showExpectedTotal = false,
}) => {
  const XLSX = await ensureXLSX();
  const exportTime = formatDateNow();
  const userName = user?.name || user?.email || 'Quản trị viên';
  const accCode = String(account.code || '').trim();
  const accName = String(account.name || '').trim();
  const accScope = String(account.scope || account.group || '').trim();

  const totalDoneCount = transactions.filter((t) => !t.chuaBcms).length;
  const totalPendingCount = transactions.filter((t) => t.chuaBcms).length;
  const totalDoneAmount = transactions
    .filter((t) => !t.chuaBcms)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalPendingAmount = transactions
    .filter((t) => t.chuaBcms)
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const totalAmount = totalDoneAmount + totalPendingAmount;

  const ws = {};
  const merges = [];
  let row = 0;

  // HEADER CƠ QUAN / ĐƠN VỊ (8 cột: 0-3 và 4-7)
  setCell(ws, row, 0, 'TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP', 's', null, {
    font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, 4, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 0, 'CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TC-KH', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, 4, 'Độc lập - Tự do - Hạnh phúc', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 7 } });
  row++;

  // Dòng trống
  row++;

  // TIÊU ĐỀ BÁO CÁO SỔ CÁI
  setCell(ws, row, 0, `BÁO CÁO SỔ CÁI CHI TIẾT HẠNG MỤC PHÁT SINH NĂM ${selectedYear}`, 's', null, {
    font: { name: 'Arial', sz: 15, bold: true, color: { rgb: '0F4C81' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
  row++;

  // DÒNG MÃ KHOẢN MỤC & TÊN
  setCell(ws, row, 0, `MÃ KHOẢN MỤC: [${accCode}] ${accName}`, 's', null, {
    font: { name: 'Arial', sz: 12.5, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 0, `(Nội dung: ${accScope || 'Theo dõi chi tiết'} • Xuất lúc: ${exportTime} • Người xuất: ${userName})`, 's', null, {
    font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 7, 'Đơn vị tính: Đồng Việt Nam (VNĐ)', 's', null, {
    font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'right', vertical: 'center' }
  });
  row++;

  // BỎ HOÀN TOÀN KHỐI DASHBOARD KPI! VÀO THẲNG BẢNG CHI TIẾT CÁC HẠNG MỤC
  const ledgerHeaders = [
    'STT',
    'NGÀY',
    'TRẠNG THÁI',
    'NỘI DUNG DIỄN GIẢI HẠNG MỤC',
    'SỐ TIỀN (VNĐ)',
    'GHI CHÚ',
    'NGƯỜI THỰC HIỆN',
    'MÃ KH'
  ];

  ledgerHeaders.forEach((h, c) => {
    setCell(ws, row, c, h, 's', null, stHeader);
  });
  row++;

  // RENDER TỪNG HẠNG MỤC / CHỨNG TỪ
  transactions.forEach((t, idx) => {
    const isPending = Boolean(t.chuaBcms);
    const amountNum = Number(t.amount) || 0;
    const dateFormatted = formatDateShort(t.date);
    const statusLabel = isPending ? 'Dự Kiến' : 'Đã BCMS';
    const statusColor = isPending ? 'B45309' : '15803D';
    const rowBg = isPending ? { fgColor: { rgb: 'FFFBEB' } } : undefined;

    // 0. STT: Canh giữa
    setCell(ws, row, 0, idx + 1, 'n', null, {
      ...stCenter,
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 1. NGÀY: Canh giữa
    setCell(ws, row, 1, dateFormatted, 's', null, {
      ...stCenter,
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 2. TRẠNG THÁI: Canh giữa, bold
    setCell(ws, row, 2, statusLabel, 's', null, {
      ...stCenterBold,
      font: { ...fontBold, color: { rgb: statusColor } },
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 3. NỘI DUNG DIỄN GIẢI: Canh trái, bold
    setCell(ws, row, 3, t.notes || t.description || '', 's', null, {
      ...stLeftBold,
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 4. SỐ TIỀN (VNĐ): Canh phải, bold, bóp gọn theo số
    setCell(ws, row, 4, amountNum, 'n', '#,##0', {
      ...stRightBold,
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 5. GHI CHÚ: Canh trái
    setCell(ws, row, 5, t.remark || t.ghiChu || '', 's', null, {
      ...stLeft,
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 6. NGƯỜI THỰC HIỆN: Canh giữa
    setCell(ws, row, 6, t.employeeName || '', 's', null, {
      ...stCenter,
      ...(rowBg ? { fill: rowBg } : {})
    });

    // 7. MÃ KH: Canh giữa, bold
    setCell(ws, row, 7, accCode, 's', null, {
      ...stCenterBold,
      font: { ...fontBold, color: { rgb: '1E3A8A' } },
      ...(rowBg ? { fill: rowBg } : {})
    });

    row++;
  });

  // DÒNG ĐỐI CHIẾU HỆ THỐNG BRAVO NẾU CÓ
  if (bravoVal > 0) {
    const bravoDiff = spent - bravoVal;
    const bgBravo = { fgColor: { rgb: 'FEF3C7' } };
    const fontBravo = { name: 'Arial', sz: 9.5, bold: true, color: { rgb: '92400E' } };

    setCell(ws, row, 0, 'BRAVO', 's', null, {
      ...stCenterBold,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 1, `Năm ${selectedYear}`, 's', null, {
      ...stCenterBold,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 2, 'Hệ thống BRAVO', 's', null, {
      ...stCenterBold,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 3, `Số liệu hạch toán hệ thống BRAVO ${bravoDiff !== 0 ? `(Chênh lệch thực tế: ${bravoDiff > 0 ? '+' : ''}${formatVndNumber(bravoDiff)} đ)` : '(Khớp 100%)'}`, 's', null, {
      ...stLeftBold,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 4, Number(bravoVal) || 0, 'n', '#,##0', {
      ...stRightBold,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 5, 'Số liệu từ phần mềm kế toán Bravo', 's', null, {
      ...stLeft,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 6, 'Hệ thống BRAVO', 's', null, {
      ...stCenter,
      font: fontBravo,
      fill: bgBravo
    });
    setCell(ws, row, 7, accCode, 's', null, {
      ...stCenterBold,
      font: fontBravo,
      fill: bgBravo
    });
    row++;
  }

  // DÒNG TỔNG CỘNG PHÁT SINH
  setCell(ws, row, 0, 'TỔNG CỘNG PHÁT SINH', 's', null, stTotalCenter);
  setCell(ws, row, 1, '', 's', null, stTotalCenter);
  setCell(ws, row, 2, '', 's', null, stTotalCenter);
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });

  setCell(ws, row, 3, `${transactions.length} HẠNG MỤC (${totalDoneCount} Đã BCMS${totalPendingCount > 0 ? ` • ${totalPendingCount} Dự Kiến` : ''})`, 's', null, stTotalLeft);

  // Số tiền tổng cộng: size 10.5, màu xanh đậm, canh phải
  setCell(ws, row, 4, totalAmount, 'n', '#,##0', {
    ...stTotalRight,
    font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } }
  });

  const detailSummaryText = totalPendingCount > 0
    ? `Đã BCMS: ${formatVndNumber(totalDoneAmount)} đ | Dự kiến: ${formatVndNumber(totalPendingAmount)} đ`
    : 'Toàn bộ đã hoàn tất BCMS';
  setCell(ws, row, 5, detailSummaryText, 's', null, stTotalLeft);
  setCell(ws, row, 6, '', 's', null, stTotalLeft);
  setCell(ws, row, 7, '', 's', null, stTotalLeft);
  merges.push({ s: { r: row, c: 5 }, e: { r: row, c: 7 } });
  row++;

  // Dòng trống
  row++;

  // KHỐI CHỮ KÝ XÁC NHẬN CHUẨN KẾ TOÁN (8 CỘT)
  setCell(ws, row, 4, 'Cần Thơ, ngày ..... tháng ..... năm 2026', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 0, 'NGƯỜI LẬP BIỂU', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 2, 'KẾ TOÁN CHI PHÍ', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 4, 'TRƯỞNG PHÒNG TC-KH', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 6, 'GIÁM ĐỐC CẢNG', 's', null, { font: { name: 'Arial', sz: 10.5, bold: true }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
  merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 3 } });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 5 } });
  merges.push({ s: { r: row, c: 6 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 0, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 2, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 4, '(Ký, ghi rõ họ tên)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  setCell(ws, row, 6, '(Ký, đóng dấu)', 's', null, { font: { name: 'Arial', sz: 9, italic: true, color: { rgb: '64748B' } }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });
  merges.push({ s: { r: row, c: 2 }, e: { r: row, c: 3 } });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 5 } });
  merges.push({ s: { r: row, c: 6 }, e: { r: row, c: 7 } });
  row += 3;

  setCell(ws, row, 0, userName, 's', null, { font: { name: 'Arial', sz: 10, bold: true }, alignment: { horizontal: 'center' } });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 1 } });

  // ĐỘ RỘNG CỘT (Cột tiền bóp gọn theo số ~16ch)
  ws['!cols'] = [
    { wch: 6 },   // STT (Canh giữa)
    { wch: 12 },  // NGÀY (Canh giữa)
    { wch: 14 },  // TRẠNG THÁI (Canh giữa)
    { wch: 38 },  // NỘI DUNG DIỄN GIẢI
    { wch: 16 },  // SỐ TIỀN (VNĐ) (Bóp gọn theo số)
    { wch: 25 },  // GHI CHÚ
    { wch: 16 },  // NGƯỜI THỰC HIỆN
    { wch: 12 }   // MÃ KH (Canh giữa)
  ];
  ws['!merges'] = merges;
  ws['!ref'] = `A1:H${row + 1}`;

  const cleanCode = accCode.replace(/[^a-zA-Z0-9]/g, '_');
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `SoCai_${cleanCode}`);

  const filename = `SoCai_${cleanCode}_${selectedYear}_${Date.now()}.xlsx`;
  downloadXLSX(XLSX, wb, filename);
};

/**
 * 5. XUẤT SỔ CÁI CHO RIÊNG MỘT MÃ KHOẢN MỤC DẠNG CSV (UTF-8 có BOM)
 */
export const exportAccountLedgerCSV = ({
  account = {},
  transactions = [],
  selectedYear = '2026',
}) => {
  const accCode = String(account.code || '').trim();
  const accName = String(account.name || '').trim();

  const headers = [
    'STT',
    'Mã Khoản Mục',
    'Tên Khoản Mục',
    'Ngày Phát Sinh',
    'Trạng Thái',
    'Nội Dung Diễn Giải',
    'Số Tiền (VNĐ)',
    'Ghi Chú',
    'Người Thực Hiện',
  ];

  const escapeCSV = (str) => {
    const val = String(str || '').replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = transactions.map((t, idx) => {
    const formattedDate = formatDateShort(t.date);
    const statusLabel = t.chuaBcms ? 'Dự Kiến' : 'Đã BCMS';
    return [
      idx + 1,
      escapeCSV(accCode),
      escapeCSV(accName),
      escapeCSV(formattedDate),
      escapeCSV(statusLabel),
      escapeCSV(t.notes || t.description || ''),
      Math.round(Number(t.amount) || 0),
      escapeCSV(t.remark || t.ghiChu || ''),
      escapeCSV(t.employeeName || ''),
    ].join(',');
  });

  const content = '\uFEFF' + headers.join(',') + '\r\n' + rows.join('\r\n');
  const cleanCode = accCode.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `SoCai_${cleanCode}_${selectedYear}.csv`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


/**
 * 6. XUẤT DANH SÁCH PHÂN QUYỀN NGƯỜI DÙNG (.XLSX)
 */
export const exportUsersListExcel = async ({ users = [], currentUser = null }) => {
  const XLSX = await ensureXLSX();
  const exportTime = formatDateNow();
  const userName = currentUser?.name || currentUser?.email || 'Quản trị viên';

  const ws = {};
  const merges = [];
  let row = 0;

  // Header cơ quan
  setCell(ws, row, 0, 'TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP', 's', null, {
    font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, 4, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 0, 'CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TC-KH', 's', null, {
    font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  });
  setCell(ws, row, 4, 'Độc lập - Tự do - Hạnh phúc', 's', null, {
    font: { name: 'Arial', sz: 10, italic: true },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
  merges.push({ s: { r: row, c: 4 }, e: { r: row, c: 7 } });
  row++;

  // Dòng trống
  row++;

  // Tiêu đề
  setCell(ws, row, 0, 'DANH SÁCH PHÂN QUYỀN NGƯỜI DÙNG & PHẠM VI CHI PHÍ', 's', null, {
    font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '0F4C81' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
  row++;

  setCell(ws, row, 0, `(Xuất lúc: ${exportTime} • Người xuất: ${userName})`, 's', null, {
    font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  });
  merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 7 } });
  row++;

  // Headers
  const userHeaders = [
    'STT',
    'HỌ VÀ TÊN',
    'TÀI KHOẢN (EMAIL)',
    'MẬT KHẨU',
    'PHÒNG BAN / CHỨC VỤ',
    'VAI TRÒ',
    'PHẠM VI CHI PHÍ',
    'TRẠNG THÁI'
  ];

  userHeaders.forEach((h, c) => {
    setCell(ws, row, c, h, 's', null, stHeader);
  });
  row++;

  // Data rows
  users.forEach((u, idx) => {
    const roleLabel = u.role === 'ADMIN' ? 'Quản trị viên' : u.role === 'EDITOR' ? 'Biên tập' : 'Chỉ xem';
    const statusLabel = u.status === 'KHOA' ? 'Đã khóa' : 'Hoạt động';

    setCell(ws, row, 0, idx + 1, 'n', null, stCenter);
    setCell(ws, row, 1, u.name || '', 's', null, stLeftBold);
    setCell(ws, row, 2, u.email || '', 's', null, stLeft);
    setCell(ws, row, 3, u.password || '', 's', null, stCenter);
    setCell(ws, row, 4, u.department || '', 's', null, stLeft);
    setCell(ws, row, 5, roleLabel, 's', null, stCenter);
    setCell(ws, row, 6, u.expenseScope || 'Toàn cảng', 's', null, stLeft);
    setCell(ws, row, 7, statusLabel, 's', null, stCenter);
    row++;
  });

  ws['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 22 },
    { wch: 14 },
    { wch: 24 },
    { wch: 15 },
    { wch: 20 },
    { wch: 14 }
  ];
  ws['!merges'] = merges;
  ws['!ref'] = `A1:H${row}`;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PhanQuyenUsers');
  const filename = `Danh_Sach_Phan_Quyen_User_${new Date().toISOString().substring(0, 10)}.xlsx`;
  downloadXLSX(XLSX, wb, filename);
};
