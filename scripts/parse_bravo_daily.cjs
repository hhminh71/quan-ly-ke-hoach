const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseBravoDailyExcel() {
  const xlsxPath = path.resolve('BRAVO Daily', 'Báo cáo thực hiện chi phí 2026.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    console.error('File not found:', xlsxPath);
    return;
  }

  const tempDir = path.resolve('.temp_bravo_xlsx');
  if (!fs.existsSync(path.join(tempDir, 'xl', 'worksheets', 'sheet1.xml'))) {
    console.error('sheet1.xml not found');
    return;
  }

  const ssXml = fs.readFileSync(path.join(tempDir, 'xl', 'sharedStrings.xml'), 'utf8');
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

  const sheet1Xml = fs.readFileSync(path.join(tempDir, 'xl', 'worksheets', 'sheet1.xml'), 'utf8');
  const rowMatches = sheet1Xml.matchAll(/<row r="(\d+)"[^>]*>(.*?)<\/row>/gs);

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

  const items = [];
  for (const rm of rowMatches) {
    const rIdx = parseInt(rm[1]);
    const cells = parseRow(rm[0]);
    items.push({ row: rIdx, ...cells });
  }

  console.log('Total rows parsed:', items.length);
  console.log('Header rows:');
  for (let i = 0; i < Math.min(items.length, 12); i++) {
    console.log(`Row ${items[i].row}:`, items[i]);
  }

  // Look for data rows (rows with accounts 627... or summary)
  const dataRows = items.filter(r => r.B || r.C || r.D);
  console.log('\nSample Account rows:');
  const sampleAccounts = dataRows.filter(r => r.B && /^\d{4,8}$/.test(String(r.B).trim()));
  console.log('Accounts with code count:', sampleAccounts.length);
  for (let i = 0; i < Math.min(sampleAccounts.length, 5); i++) {
    console.log(sampleAccounts[i]);
  }
}

parseBravoDailyExcel();
