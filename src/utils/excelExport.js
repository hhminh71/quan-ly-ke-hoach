/**
 * TIỆN ÍCH XUẤT BÁO CÁO EXCEL CHUẨN DOANH NGHIỆP
 * (Chuẩn định dạng bảng Google Sheet / MS Excel hỗ trợ tiếng Việt có dấu, kẻ bảng, màu sắc & công thức)
 */

const formatNumber = (num) => {
  return Number(num || 0).toLocaleString('vi-VN');
};

const formatDateNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const getExcelHtmlWrapper = (sheetName, bodyHtml) => {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${sheetName || 'BaoCao'}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Times New Roman', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    .header-corp {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #1e3a8a;
      text-align: left;
    }
    .header-dept {
      font-size: 10pt;
      font-weight: bold;
      color: #334155;
      text-align: left;
    }
    .header-motto {
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
    }
    .title-report {
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #0f4c81;
      text-align: center;
      padding: 10px 0 2px 0;
    }
    .subtitle-report {
      font-size: 10.5pt;
      font-style: italic;
      color: #475569;
      text-align: center;
      padding-bottom: 8px;
    }
    .kpi-table {
      margin-bottom: 15px;
      border: 1.5pt solid #0f4c81;
    }
    .kpi-th {
      background-color: #0f4c81;
      color: #ffffff;
      font-size: 9.5pt;
      font-weight: bold;
      text-align: center;
      padding: 6px;
      border: 0.5pt solid #cbd5e1;
    }
    .kpi-td {
      background-color: #f8fafc;
      font-size: 11pt;
      font-weight: bold;
      text-align: center;
      padding: 6px;
      border: 0.5pt solid #cbd5e1;
    }
    th.table-th {
      background-color: #15803d; /* Màu xanh lá chuẩn Google Sheet */
      color: #ffffff;
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      border: 0.5pt solid #0f5132;
      padding: 8px 6px;
    }
    td.table-td {
      border: 0.5pt solid #cbd5e1;
      padding: 6px 7px;
      font-size: 9.5pt;
      vertical-align: middle;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .num-currency {
      mso-number-format: "\\#\\,\\#\\#0";
      text-align: right;
    }
    .num-percent {
      mso-number-format: "0\\.0\\%";
      text-align: center;
      font-weight: bold;
    }
    .row-total {
      background-color: #e2e8f0;
      font-weight: bold;
      border-top: 1.5pt solid #0f172a;
      border-bottom: 1.5pt solid #0f172a;
    }
    .status-safe { color: #166534; font-weight: bold; }
    .status-warning { color: #b45309; font-weight: bold; }
    .status-over { color: #b91c1c; font-weight: bold; }
    .signature-title {
      font-weight: bold;
      font-size: 10.5pt;
      text-align: center;
      padding-top: 15px;
    }
    .signature-note {
      font-style: italic;
      font-size: 9pt;
      color: #64748b;
      text-align: center;
      padding-bottom: 50px;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
};

const triggerDownload = (content, filename, mimeType = 'application/vnd.ms-excel;charset=utf-8;') => {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
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
 * 1. XUẤT BÁO CÁO TIẾN ĐỘ KẾ HOẠCH NGÂN SÁCH THEO NĂM (DẠNG EXCEL .XLS ĐẦY ĐỦ ĐỊNH DẠNG)
 */
export const exportProgressReportExcel = ({
  items = [],
  summary = {},
  selectedYear = '2026',
  user = null,
  scopeInfo = null,
}) => {
  const exportTime = formatDateNow();
  const userName = user?.name || user?.email || 'Quản trị viên';
  const scopeLabel = scopeInfo?.label || 'Toàn cảng (76 khoản mục)';
  const totalItems = items.length;

  const totalApproved = summary.totalApproved || items.reduce((s, b) => s + (Number(b.selectedYearApproved) || 0), 0);
  const totalBravo = summary.totalBravo || items.reduce((s, b) => s + (Number(b.bravoVal) || 0), 0);
  const totalActual = summary.totalLiveActual || items.reduce((s, b) => s + (Number(b.liveActual) || 0), 0);
  const totalReport = summary.totalReportActual || items.reduce((s, b) => s + (Number(b.reportActual) || 0), 0);
  const totalRemaining = totalApproved - totalReport;
  const avgPercent = totalApproved > 0 ? (totalReport / totalApproved) * 100 : 0;

  let bodyHtml = `
  <!-- HEADER CƠ QUAN / ĐƠN VỊ -->
  <table>
    <tr>
      <td colspan="4" class="header-corp">TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP</td>
      <td colspan="4" class="header-motto">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</td>
    </tr>
    <tr>
      <td colspan="4" class="header-dept">CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TC-KH</td>
      <td colspan="4" class="header-motto" style="font-weight: normal; font-style: italic;">Độc lập - Tự do - Hạnh phúc</td>
    </tr>
    <tr><td colspan="8">&nbsp;</td></tr>

    <!-- TIÊU ĐỀ BÁO CÁO -->
    <tr>
      <td colspan="8" class="title-report">BÁO CÁO TIẾN ĐỘ THỰC HIỆN KẾ HOẠCH NGÂN SÁCH NĂM ${selectedYear}</td>
    </tr>
    <tr>
      <td colspan="8" class="subtitle-report">
        (Phạm vi: ${scopeLabel} • Xuất lúc: ${exportTime} • Người xuất: ${userName})
      </td>
    </tr>
    <tr>
      <td colspan="8" class="text-right" style="font-size: 9pt; font-style: italic; padding-bottom: 6px;">
        Đơn vị tính: Đồng Việt Nam (VNĐ)
      </td>
    </tr>
  </table>

  <!-- KHỐI TỔNG HỢP NHANH (KPI METRICS) -->
  <table class="kpi-table" style="margin-bottom: 12px;">
    <tr>
      <th class="kpi-th" style="background-color: #1e3a8a;">1. TỔNG HẠN MỨC ĐƯỢC DUYỆT</th>
      <th class="kpi-th" style="background-color: #b45309;">2. THEO PHẦN MỀM BRAVO</th>
      <th class="kpi-th" style="background-color: #0284c7;">3. THEO THỰC TẾ NHẬP LIỆU</th>
      <th class="kpi-th" style="background-color: #0d9488;">4. CHI PHÍ BÁO CÁO (MAX)</th>
      <th class="kpi-th" style="background-color: #15803d;">5. CÒN LẠI (KHẢ DỤNG)</th>
      <th class="kpi-th" style="background-color: #4f46e5;">6. TỶ LỆ TIẾN ĐỘ</th>
    </tr>
    <tr>
      <td class="kpi-td" style="color: #1e3a8a;">${formatNumber(totalApproved)} đ</td>
      <td class="kpi-td" style="color: #b45309;">${formatNumber(totalBravo)} đ</td>
      <td class="kpi-td" style="color: #0284c7;">${formatNumber(totalActual)} đ</td>
      <td class="kpi-td" style="color: #0d9488;">${formatNumber(totalReport)} đ</td>
      <td class="kpi-td" style="color: #15803d;">${formatNumber(totalRemaining)} đ</td>
      <td class="kpi-td" style="color: #4f46e5;">${avgPercent.toFixed(1)}%</td>
    </tr>
  </table>

  <!-- BẢNG CHI TIẾT CÁC KHOẢN MỤC -->
  <table>
    <thead>
      <tr>
        <th class="table-th" style="width: 40px;">STT</th>
        <th class="table-th" style="width: 90px;">MÃ KH</th>
        <th class="table-th" style="width: 280px;">TÊN HẠNG MỤC / KHOẢN MỤC</th>
        <th class="table-th" style="width: 160px;">NHÓM CHI PHÍ</th>
        <th class="table-th" style="width: 130px;">HẠN MỨC DUYỆT (${selectedYear})</th>
        <th class="table-th" style="width: 125px;">THEO BRAVO</th>
        <th class="table-th" style="width: 125px;">THEO THỰC TẾ</th>
        <th class="table-th" style="width: 135px;">CHI PHÍ BÁO CÁO (MAX)</th>
        <th class="table-th" style="width: 125px;">CÒN LẠI KHẢ DỤNG</th>
        <th class="table-th" style="width: 80px;">TIẾN ĐỘ (%)</th>
        <th class="table-th" style="width: 95px;">TRẠNG THÁI</th>
        <th class="table-th" style="width: 250px;">QUY MÔ / DIỄN GIẢI CHI TIẾT</th>
      </tr>
    </thead>
    <tbody>
  `;

  // Render từng dòng dữ liệu
  items.forEach((item, index) => {
    const approved = Number(item.selectedYearApproved) || 0;
    const bravo = Number(item.bravoVal) || 0;
    const actual = Number(item.liveActual) || 0;
    const report = Number(item.reportActual) || 0;
    const remaining = Number(item.liveRemaining) || (approved - report);
    const percent = approved > 0 ? (report / approved) : 0;
    const pctNumber = percent * 100;
    const pctFormatted = approved > 0 ? `${pctNumber.toFixed(1)}%` : (report > 0 ? '100%' : '0%');

    let statusText = 'An toàn';
    let statusClass = 'status-safe';
    if (pctNumber >= 100) {
      statusText = 'Vượt mức';
      statusClass = 'status-over';
    } else if (pctNumber >= 80) {
      statusText = 'Cảnh báo';
      statusClass = 'status-warning';
    }

    bodyHtml += `
      <tr>
        <td class="table-td text-center">${index + 1}</td>
        <td class="table-td text-center font-bold" style="mso-number-format:'\\@';">${item.code || ''}</td>
        <td class="table-td text-left font-bold">${item.name || ''}</td>
        <td class="table-td text-left" style="font-size: 8.5pt; color: #475569;">${item.group || 'SỬA CHỮA THƯỜNG XUYÊN'}</td>
        <td class="table-td num-currency font-bold">${approved}</td>
        <td class="table-td num-currency">${bravo}</td>
        <td class="table-td num-currency">${actual}</td>
        <td class="table-td num-currency font-bold" style="color: #0d9488;">${report}</td>
        <td class="table-td num-currency font-bold" style="color: ${remaining < 0 ? '#b91c1c' : '#15803d'};">${remaining}</td>
        <td class="table-td num-percent">${pctFormatted}</td>
        <td class="table-td text-center ${statusClass}">${statusText}</td>
        <td class="table-td text-left" style="font-size: 8.5pt; color: #475569;">${item.scope || item.notes || ''}</td>
      </tr>
    `;
  });

  // Dòng TỔNG CỘNG
  const totalAvgPercentFormatted = `${avgPercent.toFixed(1)}%`;
  bodyHtml += `
      <tr class="row-total">
        <td class="table-td text-center font-bold" colspan="2">TỔNG CỘNG</td>
        <td class="table-td text-left font-bold" colspan="2">${totalItems} KHOẢN MỤC CHI PHÍ</td>
        <td class="table-td num-currency font-bold">${totalApproved}</td>
        <td class="table-td num-currency font-bold">${totalBravo}</td>
        <td class="table-td num-currency font-bold">${totalActual}</td>
        <td class="table-td num-currency font-bold" style="color: #0d9488;">${totalReport}</td>
        <td class="table-td num-currency font-bold" style="color: ${totalRemaining < 0 ? '#b91c1c' : '#15803d'};">${totalRemaining}</td>
        <td class="table-td num-percent font-bold" style="color: #4f46e5;">${totalAvgPercentFormatted}</td>
        <td class="table-td text-center font-bold" colspan="2">
          ${avgPercent >= 100 ? 'VƯỢT KẾ HOẠCH' : avgPercent >= 80 ? 'CẢNH BÁO CAO' : 'TIẾN ĐỘ AN TOÀN'}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- KHỐI CHỮ KÝ XÁC NHẬN CHUẨN KẾ TOÁN -->
  <table style="margin-top: 30px;">
    <tr>
      <td colspan="4">&nbsp;</td>
      <td colspan="4" class="text-center" style="font-style: italic; font-size: 10pt;">
        Cần Thơ, ngày ..... tháng ..... năm 2026
      </td>
    </tr>
    <tr>
      <td colspan="2" class="signature-title">NGƯỜI LẬP BIỂU</td>
      <td colspan="2" class="signature-title">KẾ TOÁN CHI PHÍ</td>
      <td colspan="2" class="signature-title">TRƯỞNG PHÒNG TC-KH</td>
      <td colspan="2" class="signature-title">GIÁM ĐỐC CẢNG</td>
    </tr>
    <tr>
      <td colspan="2" class="signature-note">(Ký, ghi rõ họ tên)</td>
      <td colspan="2" class="signature-note">(Ký, ghi rõ họ tên)</td>
      <td colspan="2" class="signature-note">(Ký, ghi rõ họ tên)</td>
      <td colspan="2" class="signature-note">(Ký, đóng dấu)</td>
    </tr>
    <tr>
      <td colspan="2" class="text-center font-bold">${userName}</td>
      <td colspan="2" class="text-center font-bold">&nbsp;</td>
      <td colspan="2" class="text-center font-bold">&nbsp;</td>
      <td colspan="2" class="text-center font-bold">&nbsp;</td>
    </tr>
  </table>
  `;

  const fullHtml = getExcelHtmlWrapper(`TienDo_${selectedYear}`, bodyHtml);
  const fileName = `Bao_Cao_Tien_Do_Ngan_Sach_${selectedYear}_${new Date().toISOString().substring(0, 10)}.xls`;
  triggerDownload(fullHtml, fileName);
};

/**
 * 2. XUẤT BẢNG KẾ HOẠCH NGÂN SÁCH ĐA NĂM (CHUẨN MẪU GOOGLE SHEET KE_HOACH_NGAN_SACH)
 */
export const exportMatrixReportExcel = ({
  items = [],
  matrixYears = ['2024', '2025', '2026', '2027'],
  user = null,
  scopeInfo = null,
}) => {
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

  let bodyHtml = `
  <table>
    <tr>
      <td colspan="3" class="header-corp">TỔNG CÔNG TY CẢNG HÀNG KHÔNG VIỆT NAM - CTCP</td>
      <td colspan="${matrixYears.length + 1}" class="header-motto">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</td>
    </tr>
    <tr>
      <td colspan="3" class="header-dept">CẢNG HÀNG KHÔNG QUỐC TẾ CẦN THƠ - PHÒNG TC-KH</td>
      <td colspan="${matrixYears.length + 1}" class="header-motto" style="font-weight: normal; font-style: italic;">Độc lập - Tự do - Hạnh phúc</td>
    </tr>
    <tr><td colspan="${matrixYears.length + 4}">&nbsp;</td></tr>

    <tr>
      <td colspan="${matrixYears.length + 4}" class="title-report">BẢNG KẾ HOẠCH NGÂN SÁCH GIAI ĐOẠN (${matrixYears.join(' - ')})</td>
    </tr>
    <tr>
      <td colspan="${matrixYears.length + 4}" class="subtitle-report">
        (Chuẩn mẫu trang tính Google Sheet KE_HOACH_NGAN_SACH • Phạm vi: ${scopeLabel} • Xuất lúc: ${exportTime})
      </td>
    </tr>
    <tr>
      <td colspan="${matrixYears.length + 4}" class="text-right" style="font-size: 9pt; font-style: italic; padding-bottom: 6px;">
        Đơn vị tính: Đồng Việt Nam (VNĐ)
      </td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th class="table-th" style="width: 40px;">STT</th>
        <th class="table-th" style="width: 95px;">MÃ KẾ HOẠCH</th>
        <th class="table-th" style="width: 300px;">TÊN HẠNG MỤC / KHOẢN MỤC</th>
        <th class="table-th" style="width: 170px;">NHÓM CHI PHÍ</th>
        ${matrixYears.map((yr) => `<th class="table-th" style="width: 130px; ${yr === '2026' ? 'background-color: #047857;' : ''}">KẾ HOẠCH ${yr}</th>`).join('')}
        <th class="table-th" style="width: 280px;">QUY MÔ / DIỄN GIẢI KẾ HOẠCH</th>
      </tr>
    </thead>
    <tbody>
  `;

  items.forEach((item, index) => {
    bodyHtml += `
      <tr>
        <td class="table-td text-center">${index + 1}</td>
        <td class="table-td text-center font-bold" style="mso-number-format:'\\@';">${item.code || ''}</td>
        <td class="table-td text-left font-bold">${item.name || ''}</td>
        <td class="table-td text-left" style="font-size: 8.5pt; color: #475569;">${item.group || 'SỬA CHỮA THƯỜNG XUYÊN'}</td>
        ${matrixYears
          .map((yr) => {
            const val = (item.yearlyApproved && item.yearlyApproved[yr]) !== undefined ? item.yearlyApproved[yr] : (yr === '2026' ? item.approvedAmount : 0);
            return `<td class="table-td num-currency font-bold">${Number(val) || 0}</td>`;
          })
          .join('')}
        <td class="table-td text-left" style="font-size: 8.5pt; color: #475569;">${item.scope || item.notes || ''}</td>
      </tr>
    `;
  });

  // Dòng TỔNG CỘNG
  bodyHtml += `
      <tr class="row-total">
        <td class="table-td text-center font-bold" colspan="2">TỔNG CỘNG</td>
        <td class="table-td text-left font-bold" colspan="2">${items.length} KHOẢN MỤC KẾ HOẠCH</td>
        ${matrixYears.map((yr) => `<td class="table-td num-currency font-bold" style="color: #047857;">${yearTotals[yr]}</td>`).join('')}
        <td class="table-td font-bold text-center">TOÀN BỘ DANH MỤC ĐƯỢC DUYỆT</td>
      </tr>
    </tbody>
  </table>

  <!-- CHỮ KÝ -->
  <table style="margin-top: 30px;">
    <tr>
      <td colspan="${Math.ceil((matrixYears.length + 4) / 2)}">&nbsp;</td>
      <td colspan="${Math.floor((matrixYears.length + 4) / 2)}" class="text-center" style="font-style: italic; font-size: 10pt;">
        Cần Thơ, ngày ..... tháng ..... năm 2026
      </td>
    </tr>
    <tr>
      <td colspan="${Math.ceil((matrixYears.length + 4) / 3)}" class="signature-title">NGƯỜI LẬP BIỂU</td>
      <td colspan="${Math.floor((matrixYears.length + 4) / 3)}" class="signature-title">TRƯỞNG PHÒNG TC-KH</td>
      <td colspan="${Math.floor((matrixYears.length + 4) / 3)}" class="signature-title">GIÁM ĐỐC CẢNG</td>
    </tr>
    <tr>
      <td colspan="${Math.ceil((matrixYears.length + 4) / 3)}" class="signature-note">(Ký, ghi rõ họ tên)</td>
      <td colspan="${Math.floor((matrixYears.length + 4) / 3)}" class="signature-note">(Ký, ghi rõ họ tên)</td>
      <td colspan="${Math.floor((matrixYears.length + 4) / 3)}" class="signature-note">(Ký, đóng dấu)</td>
    </tr>
  </table>
  `;

  const fullHtml = getExcelHtmlWrapper('KeHoachNganSach', bodyHtml);
  const fileName = `Bang_Ke_Hoach_Ngan_Sach_${matrixYears.join('_')}_${new Date().toISOString().substring(0, 10)}.xls`;
  triggerDownload(fullHtml, fileName);
};

/**
 * 3. XUẤT CSV TIẾN ĐỘ (Dành cho người dùng cần file thuần text CSV)
 */
export const exportProgressReportCSV = ({
  items = [],
  selectedYear = '2026',
}) => {
  const headers = [
    'STT',
    'MaKhoanMuc',
    'TenHangMuc',
    'NhomChiPhi',
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
      `"${(item.group || '').replace(/"/g, '""')}"`,
      approved,
      bravo,
      actual,
      report,
      remaining,
      `"${percent}%"`,
      `"${item.status || 'SAFE'}"`,
      `"${(item.scope || item.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const content = '\uFEFF' + headers + '\n' + rows.join('\n');
  triggerDownload(content, `Bao_Cao_Tien_Do_${selectedYear}.csv`, 'text/csv;charset=utf-8;');
};
