// Builds "סבב 1" of the consultant test from the source workbook and round1.json.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const SRC = 'C:/Users/user/Downloads/אקספו2_109_עסקים (2).xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 1.xlsx';
const round = JSON.parse(fs.readFileSync(path.join(__dirname, 'round1.json'), 'utf8'));
const byId = new Map(round.map((r) => [r[0], r]));

const src = XLSX.utils.sheet_to_json(XLSX.readFile(SRC).Sheets['109 עסקים'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

(async () => {
  const wb = new ExcelJS.Workbook();
  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 110;
  [
    ['סבב 1 של בדיקת יועץ ההקמה', true],
    [''],
    ['לכל עסק: מה המציג אמר, מה היועץ הבין, והשאלה הבאה שהיועץ שואל.'],
    ['ממלאים רק את שתי העמודות הצהובות:'],
    ['• "התשובה שלך": כמו שהמציג היה עונה. אפשר לכתוב מספר של תשובה מוכנה (למשל 2), כמה מספרים, או לכתוב חופשי.'],
    ['• "הערה על השאלה" (רשות): אם השאלה לא טובה, לא מתאימה לעסק, או שהיועץ הבין לא נכון — כתוב למה.'],
    ['עסק שלא רוצים לענות עליו בסבב הזה: משאירים ריק.'],
    [''],
    ['אחרי שתחזיר את הקובץ, אכין את סבב 2: לכל עסק השאלה הבאה, וגיליון "ההקמה" עם מה שנבנה עד עכשיו.'],
  ].forEach(([t, bold], i) => { const c = help.getCell(i + 1, 1); c.value = t || ''; c.font = { name: 'Arial', size: bold ? 14 : 11, bold: !!bold }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 1', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  const cols = [
    ['#', 5], ['חלק', 11], ['קטגוריה', 18], ['סוג העסק', 24], ['מה המציג אמר', 50],
    ['מה היועץ הבין', 38], ['השאלה של היועץ', 40], ['תשובות מוכנות', 34], ['התשובה שלך', 40], ['הערה על השאלה', 30],
  ];
  ws.columns = cols.map(([header, width]) => ({ header, width }));
  const head = ws.getRow(1);
  head.font = { name: 'Arial', bold: true, size: 11 };
  head.alignment = { wrapText: true, vertical: 'middle', horizontal: 'right' };
  head.height = 24;
  head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } }; });

  let missing = 0;
  src.forEach((r) => {
    const q = byId.get(Number(r[0]));
    if (!q) missing++;
    const quick = q ? q[3].map((x, i) => `${i + 1}. ${x}`).join('\n') : '';
    const row = ws.addRow([r[0], r[1], r[2], r[3], r[4], q ? q[1] : '', q ? q[2] : '', quick, '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };
    row.font = { name: 'Arial', size: 11 };
    row.getCell(7).font = { name: 'Arial', size: 11, bold: true };
    [9, 10].forEach((n) => { row.getCell(n).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } }; });
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', src.length, 'questions', round.length, 'missing', missing, '->', OUT);
})();
