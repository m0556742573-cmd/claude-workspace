// Builds "סבב 9" of the consultant test: the actual text of every message, as the visitor receives it, for approval.
// The sensitive businesses come first.
const path = require('path');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const { rows, sensitive } = require(path.join(__dirname, 'round9.js'));

const SRC = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סיכום_ההקמה_מאושר.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 9 (נוסח ההודעות).xlsx';
const names = new Map(XLSX.utils.sheet_to_json(XLSX.readFile(SRC).Sheets['סיכום ההקמה'], { header: 1, defval: '' }).slice(1).map((r) => [Number(r[0]), r[1]]));
const rank = (id) => (sensitive.includes(id) ? sensitive.indexOf(id) : 100 + id);
const sorted = rows.map((r, i) => [r, i]).sort((a, b) => rank(a[0][0]) - rank(b[0][0]) || a[1] - b[1]).map((x) => x[0]);

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const pink = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE7EA' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 125;
  ['סבב 9: הנוסח של ההודעות', '',
    'כאן כל הודעה כתובה כמו שהמבקר יקבל אותה, בקול של המציג ומהמספר שלו. מה שבסוגריים מרובעים, כמו [שם] או [שעות], המערכת ממלאת.',
    'העסקים הרגישים ראשונים, בוורוד: מימוש זכויות, טיפול רגשי, אבחון, קשיי למידה, נוער בסיכון, קשב וריכוז, רפואה משלימה, נטורופטיה, ושדכן (בלי הודעות).',
    'אצלם ההודעה לא אומרת במה העסק עוסק ולא מה המבקר צריך. הטלפון בבית משותף, ומילה כמו "קשב" או "אבחון" יכולה להזיק בשידוכים.', '',
    'שתי שאלות:',
    '• "מאשר?": האם הנוסח נכון. אם כן, מספיק 1.',
    '• "הערה": מה היה המציג משנה, או מה לא היה שולח בכלל.', '',
    'מה הנחתי, ושווה שתגיד אם לא:',
    '• הפנייה היא "שלום [שם]", בלי "ר\'" ובלי בס"ד בראש ההודעה.',
    '• שורת "השב הסר" יש רק בהודעות של רשימת התפוצה. הודעה אישית לא מקבלת אותה, כמו שבן אדם לא היה כותב אותה.',
    '• מי שאין לו וואטסאפ מקבל את אותו נוסח במייל.',
    '• הודעת התודה יוצאת בערב של יום התערוכה, לא מהדוכן.',
    '• הודעות של רשימת התפוצה כתובות כדוגמה. התוכן שלהן משתנה בכל פעם.']
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 9', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 22], ['ההודעה', 22], ['מתי יוצאת', 22], ['הנוסח', 60], ['מאשר? (1 / מה לתקן)', 24], ['הערה', 24]].map(([h, width]) => ({ header: h, width }));
  const hr = ws.getRow(1); hr.font = { ...font, bold: true }; hr.alignment = { wrapText: true, horizontal: 'right' }; hr.eachCell((c) => { c.fill = headFill; });
  sorted.forEach(([id, label, when, text]) => {
    const row = ws.addRow([id, names.get(id), label, when, text, '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    if (sensitive.includes(id)) [1, 2, 3, 4, 5].forEach((n) => { row.getCell(n).fill = pink; });
    [6, 7].forEach((n) => { row.getCell(n).fill = yellow; });
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', sorted.length, '->', OUT);
})();
