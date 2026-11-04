/**
 * Quản lý cấu hình Tách riêng Sửa chữa tài sản (SCTS) / Sửa chữa lớn
 * Cảng Hàng không Quốc tế Cần Thơ - Phòng Tài chính Kế hoạch
 * 
 * Nghiệp vụ:
 * Các mã như 62762103 (Sửa chữa bến bãi ô tô, sân đường) trong phần mềm Bravo được
 * hạch toán gộp chung cả SCTX (Sửa chữa thường xuyên của Cảng) và SCTS (Sửa chữa lớn do TCT giao).
 * Đối với Kế hoạch SCTX, hệ thống sẽ chỉ lấy chi phí Nhập liệu thực tế (SCTX), tách riêng số liệu Bravo.
 */

import { syncSctsSeparatedCodesToGoogleSheet, getSavedWebhookUrl } from '../services/googleSheetService.js';

const STORAGE_KEY_SCTS_EXCLUDED = 'app_scts_separated_codes_v2';
const LEGACY_STORAGE_KEY = 'app_scts_separated_codes_v1';
const TOGGLED_OFF_KEY = 'app_scts_toggled_off_codes_v2';

// Danh sách mặc định các mã có dự án SCTS lớn hạch toán gộp trên Bravo:
// - 62762103: Sửa chữa bến bãi ô tô, sân đường
// - 62762216: Sửa chữa thiết bị nhà ga
// - 62762188: Sửa chữa nhà cửa, vật kiến trúc khác (có dự án lớn hạch toán gộp trên Bravo)
export const DEFAULT_SCTS_SEPARATED_CODES = ['62762103', '62762216', '62762188'];

export const getSctsSeparatedCodes = () => {
  try {
    let list = [];
    const saved = localStorage.getItem(STORAGE_KEY_SCTS_EXCLUDED);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) list = parsed;
    } else {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (Array.isArray(parsedLegacy)) list = parsedLegacy;
      }
    }

    // Danh sách các mã mà người dùng đã chủ động bấm nút TẮT tách SCTS
    let toggledOff = [];
    try {
      const offSaved = localStorage.getItem(TOGGLED_OFF_KEY);
      if (offSaved) toggledOff = JSON.parse(offSaved);
    } catch (e) {}

    // Luôn đảm bảo các mã cốt lõi (DEFAULT) được kích hoạt trừ khi người dùng đã chủ động tắt
    const activeDefaults = DEFAULT_SCTS_SEPARATED_CODES.filter((c) => !toggledOff.includes(c));
    const merged = Array.from(new Set([...activeDefaults, ...list]));

    // Lưu ngược lại storage để các lần sau đọc nhanh
    if (JSON.stringify(merged) !== saved) {
      localStorage.setItem(STORAGE_KEY_SCTS_EXCLUDED, JSON.stringify(merged));
    }
    return merged;
  } catch (e) {
    console.error(e);
  }
  return DEFAULT_SCTS_SEPARATED_CODES;
};

export const saveSctsSeparatedCodes = (codes, syncOnline = true) => {
  try {
    localStorage.setItem(STORAGE_KEY_SCTS_EXCLUDED, JSON.stringify(codes));
    window.dispatchEvent(new Event('app_scts_codes_updated'));

    // Tự động đồng bộ lên Google Sheet nếu có kết nối Webhook
    if (syncOnline) {
      const webhookUrl = getSavedWebhookUrl();
      if (webhookUrl) {
        syncSctsSeparatedCodesToGoogleSheet(webhookUrl, codes);
      }
    }
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
  let toggledOff = [];
  try {
    const offSaved = localStorage.getItem(TOGGLED_OFF_KEY);
    if (offSaved) toggledOff = JSON.parse(offSaved);
  } catch (e) {}

  if (current.includes(str)) {
    // Người dùng bấm TẮT tách SCTS
    updated = current.filter((c) => c !== str);
    if (!toggledOff.includes(str)) toggledOff.push(str);
  } else {
    // Người dùng bấm BẬT tách SCTS
    updated = [...current, str];
    toggledOff = toggledOff.filter((c) => c !== str);
  }

  try {
    localStorage.setItem(TOGGLED_OFF_KEY, JSON.stringify(toggledOff));
  } catch (e) {}

  saveSctsSeparatedCodes(updated, true);
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
