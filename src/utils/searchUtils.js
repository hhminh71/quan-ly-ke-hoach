/**
 * Tiện ích hỗ trợ tìm kiếm tiếng Việt không dấu (Accent-insensitive Search)
 * Tự động chuyển đổi các ký tự có dấu, chữ hoa/thường, hỗ trợ chữ đ/Đ
 * và hỗ trợ tìm kiếm đa từ khóa (multi-token search).
 */

/**
 * Chuyển chuỗi tiếng Việt có dấu thành không dấu, chuyển chữ thường.
 * Hỗ trợ Unicode dựng sẵn (NFC), Unicode tổ hợp (NFD) và ký tự đ/Đ.
 *
 * @param {string} str
 * @returns {string}
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

/**
 * Kiểm tra xem một chuỗi hoặc mảng các trường văn bản có khớp với từ khóa tìm kiếm hay không.
 * Bỏ qua dấu tiếng Việt, không phân biệt chữ hoa/chữ thường.
 *
 * @param {string|Array<string|number>} target - Chuỗi hoặc danh sách các trường của đối tượng
 * @param {string} query - Chuỗi từ khóa do người dùng nhập
 * @returns {boolean}
 */
export function matchesVietnameseSearch(target, query) {
  if (!query) return true;
  const normQuery = removeVietnameseTones(query).trim();
  if (!normQuery) return true;

  let targetText = '';
  if (Array.isArray(target)) {
    targetText = target.filter(Boolean).map(String).join(' ');
  } else {
    targetText = String(target || '');
  }

  const normTarget = removeVietnameseTones(targetText);

  // 1. Khớp cụm từ liên tiếp trực tiếp
  if (normTarget.includes(normQuery)) {
    return true;
  }

  // 2. Khớp đa từ khóa (mọi từ trong query đều có mặt trong target, không quan trọng thứ tự)
  const tokens = normQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    return tokens.every((token) => normTarget.includes(token));
  }

  return false;
}
