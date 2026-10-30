/**
 * Utility để phân tích và chuẩn hóa file Excel xuất từ phần mềm Bravo Daily
 * (Báo cáo thực hiện chi phí năm)
 */

export const ensureXLSX = async () => {
  if (typeof window !== 'undefined' && window.XLSX) {
    return window.XLSX;
  }

  return new Promise((resolve, reject) => {
    // 1. Thử nạp từ file static nội bộ
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
      // 2. Fallback sang CDN nếu file static lỗi
      console.warn('Không tải được /xlsx.full.min.js, chuyển sang CDN...');
      const cdnScript = document.createElement('script');
      cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      cdnScript.async = true;
      cdnScript.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error('Không thể tải thư viện XLSX từ CDN'));
      };
      cdnScript.onerror = (err) => reject(new Error('Lỗi nạp thư viện đọc Excel: ' + err.message));
      document.head.appendChild(cdnScript);
    };

    document.head.appendChild(script);
  });
};

/**
 * Đọc ArrayBuffer hoặc File và trích xuất dữ liệu Bravo chuẩn hóa
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<{ items: Array, summary: Object, fileName: string }>}
 */
export const parseBravoExcelBuffer = async (arrayBuffer, fileName = 'Báo cáo Bravo.xlsx') => {
  const XLSX = await ensureXLSX();

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File Excel không có sheet nào hợp lệ.');
  }

  // Lấy sheet đầu tiên
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Chuyển sang mảng các dòng (header: 1 trả về mảng các cell theo index)
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!rows || rows.length < 9) {
    throw new Error('File Excel không đúng cấu trúc Báo cáo thực hiện chi phí của Bravo (quá ngắn).');
  }

  const items = [];
  let currentCategory = 'Chi phí sản xuất kinh doanh';
  let totalBravoSum = 0;
  let totalApprovedSum = 0;
  let accountsCount = 0;

  // Dữ liệu bắt đầu từ dòng thứ 9 (index 8)
  for (let r = 8; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !Array.isArray(row)) continue;

    const name = row[0];
    const code = row[1];
    const plan = row[2] || 0;
    const actualPeriod = row[3] || 0;
    const ratePeriod = row[4] || 0;
    const actualYTD = row[5] || 0;
    const rateYTD = row[6] || 0;

    if (!name && !code) continue;

    const codeStr = code !== undefined && code !== null ? String(code).trim() : '';
    const nameStr = name !== undefined && name !== null ? String(name).trim() : '';

    // Nếu không có mã tài khoản nhưng có tên -> dòng nhóm / đề mục cha
    if (!codeStr && nameStr) {
      currentCategory = nameStr;
    }

    const planVal = Number(plan) || 0;
    const actualVal = Number(actualPeriod) || 0;
    const actualYtdVal = Number(actualYTD) || 0;

    const rateVal = Number(ratePeriod) || 0;
    const ratePct = rateVal < 10 ? Math.round(rateVal * 10000) / 100 : Math.round(rateVal * 100) / 100;

    const rateYtdVal = Number(rateYTD) || 0;
    const rateYtdPct = rateYtdVal < 10 ? Math.round(rateYtdVal * 10000) / 100 : Math.round(rateYtdVal * 100) / 100;

    if (codeStr) {
      accountsCount++;
      totalBravoSum += actualVal;
      totalApprovedSum += planVal;
    }

    items.push({
      row: r + 1,
      code: codeStr,
      name: nameStr,
      category: currentCategory,
      approvedAmount: planVal,
      bravoAmount: actualVal,
      rate: ratePct,
      actualYTD: actualYtdVal,
      rateYTD: rateYtdPct,
      note: '',
    });
  }

  if (items.length === 0 || accountsCount === 0) {
    throw new Error('Không trích xuất được tài khoản nào từ file Excel. Vui lòng kiểm tra lại định dạng file xuất từ Bravo.');
  }

  // Lọc danh sách tài khoản hợp lệ
  const validAccounts = items.filter((it) => it.code);

  return {
    items,
    validAccounts,
    summary: {
      fileName,
      totalRows: items.length,
      accountsCount,
      totalBravoAmount: totalBravoSum,
      totalApprovedAmount: totalApprovedSum,
      syncTime: new Date().toLocaleString('vi-VN'),
    },
  };
};
