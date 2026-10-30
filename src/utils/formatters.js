/**
 * Shared currency and number formatters for the application.
 * Uses Unicode non-breaking space (\u00A0) before currency symbol 'đ' to prevent
 * wrapping/breaking onto a new line when columns are narrow or on small screens.
 */

export const formatVND = (num) => {
  const n = Math.round(Number(num) || 0);
  return n.toLocaleString('vi-VN') + '\u00A0đ';
};

export const formatCompactVND = (num) => {
  const val = Number(num) || 0;
  if (Math.abs(val) >= 1e9) {
    return (val / 1e9).toFixed(2) + '\u00A0tỷ';
  }
  if (Math.abs(val) >= 1e6) {
    return (val / 1e6).toFixed(1) + '\u00A0tr';
  }
  return Math.round(val).toLocaleString('vi-VN') + '\u00A0đ';
};
