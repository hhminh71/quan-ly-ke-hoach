/**
 * Utility functions for date formatting across the application.
 * Formats all dates consistently into 'dd/mm/yy'.
 */

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const str = String(dateStr).trim();

  // Pattern 1: YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-08-25 -> 25/08/26)
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const y = parts[0].slice(-2);
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY (e.g. 25/08/2026 -> 25/08/26)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2].slice(-2);
    return `${d}/${m}/${y}`;
  }

  // Pattern 3: DD/MM/YY or DD-MM-YY (e.g. 25/8/26 -> 25/08/26)
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${d}/${m}/${y}`;
  }

  return str;
}
