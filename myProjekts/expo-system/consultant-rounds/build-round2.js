// Builds "סבב 2" of the consultant test: his round-1 answers carried forward, the next question, and a "ההקמה" sheet.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R1 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_1_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 2.xlsx';
const round = JSON.parse(fs.readFileSync(path.join(__dirname, 'round2.json'), 'utf8'));
const byId = new Map(round.map((r) => [r[0], r]));
const r1 = XLSX.utils.sheet_to_json(XLSX.readFile(R1).Sheets['סבב 1'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

const LESSONS = [
  'מה למדתי מההערות שלך בסבב 1, ותיקנתי ביועץ:',
  '• קודם לשאול על מקור ההכנסה העיקרי, ורק אחר כך על לקוחות משניים (הגהת סת"ם).',
  '• לא לשאול "מה שווה לך יותר: א או ב" — כולם עונים "שניהם". במקום: "אם היית צריך לבחור רק אחד" (אמרגן, סנדוויצ\'ים).',
  '• כל התשובות המוכנות עונות על אותה שאלה, ושונות באמת זו מזו (מוהל, טכנאי גז, עיסויים).',
  '• לא לשאול שאלה כללית שכולם עונים עליה אותו דבר ("איך קונים ממך"). לשאול איפה נסגרות העסקאות, או איזו בעיה מביאה הכי הרבה (מוצרי חשמל, נטורופת).',
  '• לחפש את ההבחנה שעליה המציג מרוויח. במוסך: צד ג\', שבו הנפגע בוחר מוסך.',
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 120;
  ['סבב 2 של בדיקת יועץ ההקמה', '', 'כמו בסבב 1: ממלאים רק את שתי העמודות הצהובות, "התשובה שלך" ו"הערה על השאלה".',
    'בגיליון "ההקמה" רואים מה היועץ יודע על כל עסק עד עכשיו, ואיזה כיוון הוא רואה. הכיוון הוא השערה, לא החלטה: אם הוא לא נכון, כתוב בהערה.', '', ...LESSONS]
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 2', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 24], ['סבב 1: השאלה', 32], ['סבב 1: התשובה שלך', 36], ['מה היועץ הבין עד עכשיו', 42], ['השאלה של היועץ', 40], ['תשובות מוכנות', 32], ['התשובה שלך', 40], ['הערה על השאלה', 30]]
    .map(([header, width]) => ({ header, width }));
  const hr = ws.getRow(1); hr.font = { ...font, bold: true }; hr.alignment = { wrapText: true, horizontal: 'right' }; hr.eachCell((c) => { c.fill = headFill; });

  const setup = wb.addWorksheet('ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  setup.columns = [['#', 5], ['סוג העסק', 24], ['מה ידוע עד עכשיו', 55], ['הכיוון שהיועץ רואה (השערה, לא מאושר)', 55], ['ציון ברשימת הבדיקה', 14]]
    .map(([header, width]) => ({ header, width }));
  const sr = setup.getRow(1); sr.font = { ...font, bold: true }; sr.alignment = { wrapText: true, horizontal: 'right' }; sr.eachCell((c) => { c.fill = headFill; });

  let missing = 0;
  r1.forEach((r) => {
    const q = byId.get(Number(r[0]));
    if (!q) { missing++; return; }
    const row = ws.addRow([r[0], r[3], r[6], r[8], q[1], q[3], q[4].map((x, i) => `${i + 1}. ${x}`).join('\n'), '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    row.getCell(6).font = { ...font, bold: true };
    [3, 4].forEach((n) => { row.getCell(n).font = { ...font, color: { argb: 'FF6B7785' } }; });
    [8, 9].forEach((n) => { row.getCell(n).fill = yellow; });
    const s = setup.addRow([r[0], r[3], q[1], q[2], '0 מתוך 10 — עוד לא נבנה הכרטיס']);
    s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; s.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', r1.length, 'missing', missing, '->', OUT);
})();
