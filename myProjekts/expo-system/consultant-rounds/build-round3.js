// Builds "סבב 3" of the consultant test: the consultant proposes the goals, and asks to confirm.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R2 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_2_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 3.xlsx';
const round = JSON.parse(fs.readFileSync(path.join(__dirname, 'round3.json'), 'utf8'));
const byId = new Map(round.map((r) => [r[0], r]));
const r2 = XLSX.utils.sheet_to_json(XLSX.readFile(R2).Sheets['סבב 2'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

const LESSONS = [
  'מה למדתי מההערות שלך בסבב 2, ותיקנתי ביועץ:',
  '• כסף עכשיו לפני טווח ארוך: מה שמביא עסקה קרובה עולה ראשון, ו"שיכירו אותי" שני (שטריימלך).',
  '• בבחירה בין אפשרויות: לכלול כל מה שהמציג כבר הזכיר (סופר סת"ם: שכחתי את חו"ל).',
  '• לפני שמסכמים "לא מתאים", לשאול מי עוד ממליץ עליו (מוהל: רופאי ילדים ומרפאות).',
  '• "הלקוח הכי שווה בדרך כלל" זה לא "מה אני רוצה מהאקספו". לשאול את שניהם (גרפולוג).',
  '• שאלה לדוכן צריכה להיות נעימה מול אדם: "כמה זמן אתם עם המערכת" ולא "מתי נגמר החוזה" (מרכזיות).',
  '• לא להניח שהמציג יודע עובדה; לומר אותה: התערוכה ב-16 בנובמבר (מזגנים).',
  '• לא לשאול את המציג מה שרק המארגנים יודעים, כמו מי מגיע לתערוכה (מאייר).',
  '• הצעד הראשון אחרי שיחה קצרה בדוכן: משהו קצר, כמו הדגמה, ולא פגישת אפיון (אתרים).',
  '• כיוון שהמציג אומר שלא קיים יורד, בלי ויכוח (תארים: מעסיקים לא משלמים).',
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const header = (ws) => { const r = ws.getRow(1); r.font = { ...font, bold: true }; r.alignment = { wrapText: true, horizontal: 'right' }; r.eachCell((c) => { c.fill = headFill; }); };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 120;
  ['סבב 3 של בדיקת יועץ ההקמה: המטרות', '',
    'בסבב הזה היועץ מציע לכל עסק מטרה ראשית ומטרה נוספת, עם נימוק מתוך מה שענית. כמעט כל השאלות הן "נכון?", אז ברוב המקרים מספיק לכתוב 1.',
    'ממלאים כמו קודם: "התשובה שלך" ו"הערה על השאלה".', '', ...LESSONS]
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 3', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 24], ['סבב 2: השאלה', 30], ['סבב 2: התשובה שלך', 34], ['מה היועץ הבין עד עכשיו', 42], ['השאלה של היועץ', 48], ['תשובות מוכנות', 26], ['התשובה שלך', 36], ['הערה על השאלה', 30]]
    .map(([h, width]) => ({ header: h, width }));
  header(ws);

  const setup = wb.addWorksheet('ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  setup.columns = [['#', 5], ['סוג העסק', 24], ['מה ידוע עד עכשיו', 50], ['מטרה ראשית (מוצעת, מחכה לאישור)', 40], ['למה', 30], ['מטרה נוספת', 32], ['ציון ברשימת הבדיקה', 16]]
    .map(([h, width]) => ({ header: h, width }));
  header(setup);

  let missing = 0;
  r2.forEach((r) => {
    const q = byId.get(Number(r[0]));
    if (!q) { missing++; return; }
    const row = ws.addRow([r[0], r[1], r[5], r[7], q[1], q[5], q[6].map((x, i) => `${i + 1}. ${x}`).join('\n'), '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    row.getCell(6).font = { ...font, bold: true };
    [3, 4].forEach((n) => { row.getCell(n).font = { ...font, color: { argb: 'FF6B7785' } }; });
    [8, 9].forEach((n) => { row.getCell(n).fill = yellow; });
    const s = setup.addRow([r[0], r[1], q[1], q[2], q[3], q[4], '0 מתוך 10 — המטרה מחכה לאישור']);
    s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; s.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', r2.length, 'missing', missing, '->', OUT);
})();
