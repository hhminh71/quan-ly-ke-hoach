const fs = require('fs');

// 1. Parse sharedStrings.xml
const ssXml = fs.readFileSync('sharedStrings.xml', 'utf8');
const sharedStrings = [];
const siRegex = /<si>(.*?)<\/si>/gs;
let match;
while ((match = siRegex.exec(ssXml)) !== null) {
  const siContent = match[1];
  const tMatches = siContent.match(/<t[^>]*>(.*?)<\/t>/gs) || [];
  const text = tMatches
    .map(t => t.replace(/<t[^>]*>/, '').replace(/<\/t>/, ''))
    .join('');
  sharedStrings.push(text);
}
console.log('Shared strings loaded:', sharedStrings.length);

function parseRow(rowXml) {
  const cells = {};
  const cMatches = rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs);
  for (const cm of cMatches) {
    const col = cm[1];
    const attrs = cm[2];
    const body = cm[3];
    if (!body) continue;
    const isShared = attrs.includes('t="s"');
    const vMatch = body.match(/<v>([^<]*)<\/v>/);
    if (vMatch) {
      const rawVal = vMatch[1];
      cells[col] = isShared ? (sharedStrings[parseInt(rawVal)] || '') : rawVal;
    }
  }
  return cells;
}

// 2. Parse sheet3.xml (TỔNG HỢP)
const sheet3Xml = fs.readFileSync('sheet3.xml', 'utf8');
const rowMatches = sheet3Xml.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs);

const tongHopItems = [];
let currentGroup = 'SỬA CHỮA THƯỜNG XUYÊN';
let currentSubGroup = '';

for (const rm of rowMatches) {
  const rIdx = parseInt(rm[1]);
  if (rIdx === 1) continue; // Skip header row 1
  const cells = parseRow(rm[0]);

  const stt = cells['A'] || '';
  const name = cells['B'] || '';
  const code = cells['C'] || '';

  if (/^[A-Z]$/.test(stt) && !code) {
    currentGroup = name;
    continue;
  }
  if (/^[IVXLCDM]+$/.test(stt) && !code) {
    currentSubGroup = name;
    continue;
  }

  if (code && String(code).trim().length > 0) {
    tongHopItems.push({
      row: rIdx,
      stt: stt,
      code: String(code).trim(),
      name: (name || '').trim(),
      group: currentGroup,
      subGroup: currentSubGroup,
      bravoQuota: parseFloat(cells['D']) || 0,
      approvedAmount: parseFloat(cells['E']) || 0,
      bravoActual: parseFloat(cells['F']) || 0,
      actualAmount: parseFloat(cells['G']) || 0,
      maxActual: parseFloat(cells['H']) || 0,
      remainingAmount: parseFloat(cells['I']) || 0,
      percentExecuted: (parseFloat(cells['K']) || 0) * 100,
      scope: (cells['M'] || '').trim(),
    });
  }
}

console.log('Total TỔNG HỢP planning items parsed:', tongHopItems.length);
console.log('First planning item:', tongHopItems[0].code, tongHopItems[0].name);

// 3. Parse info_sheet_dump.csv (INFO sheet)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const csv = fs.readFileSync('info_sheet_dump.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim().length > 0);
const planningCodesSet = new Set(tongHopItems.map(i => i.code));

const infoItems = [];
let currentCategory = 'TỔNG THỂ CHI PHÍ';

for (let i = 1; i < lines.length; i++) {
  const clean = parseCSVLine(lines[i]);
  if (clean.length < 5) continue;
  const rowNum = parseInt(clean[0]);
  if (rowNum <= 2) continue;

  const name = clean[1];
  const code = clean[2] || '';
  const approved = parseFloat(clean[3]) || 0;
  const bravo = parseFloat(clean[4]) || 0;
  const rate = (parseFloat(clean[5]) || 0) * 100;
  const note = clean[8] || '';

  if (!code && name) {
    currentCategory = name;
  }

  const isPlanning = planningCodesSet.has(code);
  let nonPlanningReason = '';
  if (!isPlanning && code) {
    if (code.startsWith('6271')) {
      nonPlanningReason = 'Chi phí nhân viên, tiền lương, BHXH do Phòng Tổ chức cán bộ & Kế toán hạch toán tập trung toàn Cảng';
    } else if (code.startsWith('6274')) {
      nonPlanningReason = 'Khấu hao TSCĐ do Tổng công ty và Phòng Kế toán trích lập tự động theo kỳ, không qua Tổ Kế hoạch';
    } else if (code.startsWith('6275')) {
      nonPlanningReason = 'Thuế môn bài và tiền thuê đất do Kế toán nộp theo thông báo của cơ quan quản lý nhà nước';
    } else if (code.startsWith('632')) {
      nonPlanningReason = 'Giá vốn hàng bán hạch toán tự động tương ứng theo doanh thu bán hàng';
    } else if (code.startsWith('62763')) {
      nonPlanningReason = 'Chi phí bảo dưỡng kết cấu hạ tầng khu bay giao đơn vị chuyên trách hoặc Tổng công ty phân bổ';
    } else if (code.startsWith('627628')) {
      nonPlanningReason = 'Chi phí sửa chữa hạ tầng khu bay thuộc danh mục bảo dưỡng định kỳ Tổng công ty quản lý';
    } else if (code.startsWith('6278')) {
      nonPlanningReason = 'Chi phí quản lý chung, phúc lợi người lao động, Đảng - đoàn thể chi trả trực tiếp theo quy chế';
    } else if (code.startsWith('641')) {
      nonPlanningReason = 'Chi phí bán hàng, điện nước văn phòng giao dịch phân bổ theo khối thương mại';
    } else if (code.startsWith('811')) {
      nonPlanningReason = 'Chi phí khác hạch toán bất thường';
    } else {
      nonPlanningReason = 'Hạch toán trực tiếp từ phòng Kế toán / Tổng công ty, không lập phiếu chi qua Tổ Kế hoạch';
    }
  }

  infoItems.push({
    row: rowNum,
    code,
    name,
    category: currentCategory,
    approvedAmount: approved,
    bravoAmount: bravo,
    rate: Math.round(rate * 100) / 100,
    isPlanningTracked: isPlanning,
    nonPlanningReason,
    note
  });
}

console.log('Total INFO items parsed:', infoItems.length);

// 4. Merge & Enrich budgets.json with TỔNG HỢP data & original yearlyApproved
const existingBudgets = JSON.parse(fs.readFileSync('src/data/budgets.json', 'utf8').replace(/^\uFEFF/, ''));
const existingMap = new Map(existingBudgets.map(b => [String(b.code).trim(), b]));

const enrichedBudgets = tongHopItems.map(th => {
  const existing = existingMap.get(th.code);
  const yearlyApproved = existing?.yearlyApproved || {
    "2024": th.approvedAmount,
    "2025": th.approvedAmount,
    "2026": th.approvedAmount,
    "2027": th.approvedAmount
  };

  return {
    code: th.code,
    name: th.name,
    group: th.group,
    subGroup: th.subGroup,
    scope: th.scope || existing?.scope || '',
    bravoQuota: th.bravoQuota,
    approvedAmount: th.approvedAmount,
    bravoAmount: th.bravoActual, // Store the actual BRAVO executed value!
    bravoActual: th.bravoActual, // Explicit field
    actualAmount: th.actualAmount,
    maxActual: th.maxActual,
    remainingAmount: th.remainingAmount,
    percentExecuted: Math.round(th.percentExecuted * 100) / 100,
    yearlyApproved,
    diffBravo: Math.round(th.bravoActual - th.actualAmount),
  };
});

console.log('Enriched budgets count:', enrichedBudgets.length);

// Save files
fs.writeFileSync('src/data/bravoInfo.json', JSON.stringify(infoItems, null, 2), 'utf8');
fs.writeFileSync('src/data/budgets.json', JSON.stringify(enrichedBudgets, null, 2), 'utf8');
console.log('Saved src/data/bravoInfo.json and updated src/data/budgets.json successfully!');
