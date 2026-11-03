/**
 * Safe Math Expression Evaluator for Currency / Financial Amount inputs
 * Supports:
 * - Operators: +, -, *, /
 * - Aliases: x, X, × (multiplication), :, ÷ (division)
 * - Parentheses: ( ) with arbitrary nesting
 * - Unary signs: +100, -50, -(2 + 3)
 * - Percentages: 8% -> 0.08, 10% -> 0.1
 * - Vietnamese currency abbreviations: tr, triệu, trieu, m (x 1,000,000), k, nghìn, nghin (x 1,000)
 * - Vietnamese thousands separators: 1.500.000 or 1,500,000
 * - Decimal numbers: 1.5 or 1,5
 * 
 * 100% safe recursive descent parser without eval() or Function().
 */

export function evaluateMathExpression(raw) {
  if (raw === undefined || raw === null) {
    return { value: 0, isValid: false, hasFormula: false, display: '' };
  }

  let str = String(raw).trim();
  if (!str) {
    return { value: 0, isValid: false, hasFormula: false, display: '' };
  }

  // Strip currency units and trailing symbols
  str = str.replace(/\s*(?:đ|d|vnd|vnđ)\b/gi, '').trim();

  // Detect whether this string contains math operators or formulas
  const hasFormula = /[+\-*/xX×:÷()%]|(?:tr|trieu|triệu|k|nghin|nghìn)\b/i.test(str);

  // 1. Clean thousand separators: e.g. 1.500.000 or 1,500,000 or 25.000
  str = str.replace(/\b(\d{1,3})(?:[.,](\d{3}))+\b/g, (m) => m.replace(/[.,]/g, ''));

  // 2. Normalize multiplication and division symbols
  str = str.replace(/[xX×]/g, '*').replace(/[:÷]/g, '/');

  // 3. Shorthand units: 1.5tr -> (1.5 * 1000000), 500k -> (500 * 1000)
  str = str.replace(/(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|triệu|m)\b/gi, (_, n) => {
    return '(' + n.replace(',', '.') + ' * 1000000)';
  });
  str = str.replace(/(\d+(?:[.,]\d+)?)\s*(?:k|nghin|nghìn)\b/gi, (_, n) => {
    return '(' + n.replace(',', '.') + ' * 1000)';
  });

  // 4. Percentage: 10% -> (10 / 100)
  str = str.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_, n) => {
    return '(' + n.replace(',', '.') + ' / 100)';
  });

  // 5. Replace remaining comma decimal separators: 1,5 -> 1.5
  str = str.replace(/(\d),(\d)/g, '$1.$2');

  // Tokenize
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === ' ' || ch === '\t') {
      i++;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let numStr = '';
      let hasDot = false;
      while (i < str.length && ((str[i] >= '0' && str[i] <= '9') || str[i] === '.')) {
        if (str[i] === '.') {
          if (hasDot) break;
          hasDot = true;
        }
        numStr += str[i];
        i++;
      }
      tokens.push(parseFloat(numStr));
      continue;
    }
    return {
      value: null,
      isValid: false,
      hasFormula,
      error: `Ký tự '${ch}' không hợp lệ`,
    };
  }

  if (tokens.length === 0) {
    return { value: 0, isValid: false, hasFormula: false };
  }

  // Recursive descent parser
  let pos = 0;

  function parseExpression() {
    let left = parseTerm();
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++];
      const right = parseTerm();
      if (op === '+') left += right;
      else left -= right;
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
      const op = tokens[pos++];
      const right = parseFactor();
      if (op === '*') left *= right;
      else {
        if (right === 0) throw new Error('Không thể chia cho 0');
        left /= right;
      }
    }
    return left;
  }

  function parseFactor() {
    if (pos >= tokens.length) throw new Error('Biểu thức chưa hoàn thành');
    const token = tokens[pos++];

    if (token === '+') return parseFactor();
    if (token === '-') return -parseFactor();

    if (token === '(') {
      const val = parseExpression();
      if (pos >= tokens.length || tokens[pos++] !== ')') {
        throw new Error('Thiếu dấu đóng ngoặc )');
      }
      return val;
    }

    if (typeof token === 'number') {
      if (isNaN(token)) throw new Error('Số không hợp lệ');
      return token;
    }

    throw new Error('Cú pháp không hợp lệ');
  }

  try {
    const result = parseExpression();
    if (pos < tokens.length) throw new Error('Biểu thức dư thừa');
    if (!isFinite(result)) throw new Error('Kết quả vượt giới hạn');
    const rounded = Math.round(result);
    return {
      value: rounded,
      isValid: true,
      hasFormula,
      error: null,
    };
  } catch (err) {
    return {
      value: null,
      isValid: false,
      hasFormula,
      error: err.message,
    };
  }
}

/**
 * Format a number to Vietnamese Dong string: e.g. 1.500.000 đ
 */
export function formatVNDMath(num) {
  if (num === null || num === undefined || isNaN(num)) return '0\u00A0đ';
  return Math.round(Number(num) || 0).toLocaleString('vi-VN') + '\u00A0đ';
}
