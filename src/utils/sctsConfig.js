/**
 * Quản lý cấu hình Tách riêng Sửa chữa tài sản (SCTS) / Sửa chữa lớn
 * Cảng Hàng không Quốc tế Cần Thơ - Phòng Tài chính Kế hoạch
 * 
 * Nghiệp vụ:
 * Các mã như 62762103 (Sửa chữa bến bãi ô tô, sân đường) trong phần mềm Bravo được
 * hạch toán gộp chung cả SCTX (Sửa chữa thường xuyên của Cảng) và SCTS (Sửa chữa lớn do TCT giao).
 * Đối với Kế hoạch SCTX, hệ thống sẽ chỉ lấy chi phí Nhập liệu thực tế (SCTX), tách riêng số liệu Bravo.
 */

const STORAGE_KEY_SCTS_EXCLUDED = 'app_scts_separated_codes_v1';

// Danh sách mặc định các mã có dự án SCTS lớn hạch toán gộp trên Bravo
export const DEFAULT_SCTS_SEPARATED_CODES = ['62762103', '62762216'];

export const getSctsSeparatedCodes = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SCTS_EXCLUDED);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_SCTS_SEPARATED_CODES;
};

export const saveSctsSeparatedCodes = (codes) => {
  try {
    localStorage.setItem(STORAGE_KEY_SCTS_EXCLUDED, JSON.stringify(codes));
    window.dispatchEvent(new Event('app_scts_codes_updated'));
  } catch (e) {
    console.error(e);
  }
};

export const isSctsSeparated = (code, customList = null) => {
  if (!code) return false;
  const list = customList || getSctsSeparatedCodes();
  return list.includes(String(code).trim());
};

export const toggleSctsSeparation = (code) => {
  if (!code) return getSctsSeparatedCodes();
  const str = String(code).trim();
  const current = getSctsSeparatedCodes();
  let updated;
  if (current.includes(str)) {
    updated = current.filter((c) => c !== str);
  } else {
    updated = [...current, str];
  }
  saveSctsSeparatedCodes(updated);
  return updated;
};

/**
 * Tính toán Chi phí thực tế báo cáo cho 1 khoản mục
 */
export const calculateReportActual = (liveActual = 0, bravoVal = 0, code = '', customList = null) => {
  const separated = isSctsSeparated(code, customList);
  if (separated) {
    return {
      reportActual: Number(liveActual) || 0,
      source: 'SCTX_ONLY', // Chỉ lấy theo SCTX nhập liệu
      isSctsSeparated: true,
    };
  }
  const actualNum = Number(liveActual) || 0;
  const bravoNum = Number(bravoVal) || 0;
  const reportActual = Math.max(actualNum, bravoNum);
  const source = bravoNum > actualNum ? 'BRAVO' : 'NHAP_LIEU';
  return {
    reportActual,
    source,
    isSctsSeparated: false,
  };
};
