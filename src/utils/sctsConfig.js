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

// Danh sách mặc định khi ứng dụng mới tinh (chưa từng đồng bộ hoặc lưu cấu hình):
// 62762103: Sửa chữa bến bãi ô tô, sân đường
// 62762216: Sửa chữa thiết bị nhà ga
export const DEFAULT_SCTS_SEPARATED_CODES = ['62762103', '62762216'];

/**
 * Lấy danh sách các mã đang được Tách riêng SCTS.
 * Nguồn dữ liệu:
 * 1. Nếu trong localStorage đã có danh sách đã lưu (do người dùng chỉnh sửa hoặc đồng bộ từ Google Sheet về),
 *    sử dụng CHÍNH XÁC danh sách đó làm nguồn sự thật (Source of Truth).
 * 2. Tuyệt đối không tự động gộp (merge) lại danh sách mặc định nếu người dùng đã chủ động gộp/bỏ tách.
 * 3. Chỉ trả về DEFAULT_SCTS_SEPARATED_CODES khi localStorage hoàn toàn chưa có dữ liệu.
 */
export const getSctsSeparatedCodes = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SCTS_EXCLUDED);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((c) => String(c).trim()).filter(Boolean);
      }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) {
      const parsedLegacy = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy)) {
        const clean = parsedLegacy.map((c) => String(c).trim()).filter(Boolean);
        localStorage.setItem(STORAGE_KEY_SCTS_EXCLUDED, JSON.stringify(clean));
        return clean;
      }
    }
  } catch (e) {
    console.error('Lỗi đọc cấu hình SCTS:', e);
  }
  return [...DEFAULT_SCTS_SEPARATED_CODES];
};

/**
 * Lưu danh sách mã SCTS được đồng bộ từ Cloud (Google Sheet)
 */
export const setSyncedSctsCodes = (codes) => {
  if (!Array.isArray(codes)) return;
  const normalized = Array.from(new Set(codes.map((c) => String(c).trim()).filter(Boolean)));
  try {
    localStorage.setItem(STORAGE_KEY_SCTS_EXCLUDED, JSON.stringify(normalized));
    localStorage.removeItem('app_scts_toggled_off_codes_v2');
    localStorage.removeItem('app_scts_toggled_off_codes');
  } catch (e) {
    console.error('Lỗi ghi cấu hình SCTS đồng bộ:', e);
  }
  window.dispatchEvent(new CustomEvent('app_scts_codes_updated', { detail: normalized }));
};

/**
 * Lưu danh sách mã SCTS vào localStorage và gửi đồng bộ 2 chiều lên Google Sheet
 */
export const saveSctsSeparatedCodes = (codes, syncOnline = true) => {
  try {
    const normalized = Array.from(new Set((codes || []).map((c) => String(c).trim()).filter(Boolean)));
    localStorage.setItem(STORAGE_KEY_SCTS_EXCLUDED, JSON.stringify(normalized));
    localStorage.removeItem('app_scts_toggled_off_codes_v2');
    localStorage.removeItem('app_scts_toggled_off_codes');
    window.dispatchEvent(new CustomEvent('app_scts_codes_updated', { detail: normalized }));

    // Tự động đồng bộ lên Google Sheet nếu có kết nối Webhook
    if (syncOnline) {
      const webhookUrl = getSavedWebhookUrl();
      if (webhookUrl) {
        syncSctsSeparatedCodesToGoogleSheet(webhookUrl, normalized);
      }
    }
  } catch (e) {
    console.error('Lỗi lưu cấu hình SCTS:', e);
  }
};

export const isSctsSeparated = (code, customList = null) => {
  if (!code) return false;
  const list = customList || getSctsSeparatedCodes();
  return list.includes(String(code).trim());
};

/**
 * Đổi trạng thái Tách / Gộp SCTS cho một mã tài khoản:
 * - Nếu đang tách -> Gộp lại (loại bỏ khỏi danh sách)
 * - Nếu đang gộp -> Tách riêng (thêm vào danh sách)
 */
export const toggleSctsSeparation = (code) => {
  if (!code) return getSctsSeparatedCodes();
  const str = String(code).trim();
  const current = getSctsSeparatedCodes();
  let updated;

  if (current.includes(str)) {
    // Đang Tách SCTS -> Người dùng bấm GỘP SCTS
    updated = current.filter((c) => c !== str);
  } else {
    // Đang Gộp SCTS -> Người dùng bấm TÁCH RIÊNG SCTS
    updated = Array.from(new Set([...current, str]));
  }

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
