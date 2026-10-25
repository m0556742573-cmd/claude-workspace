// Builds "סבב 4" of the consultant test: the booth card (the three questions) for each business, to confirm or correct.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R3 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_3_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 4.xlsx';
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'round4.json'), 'utf8'));
const r3plan = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'round3.json'), 'utf8')).map((r) => [r[0], r]));
const cards = new Map(data.cards.map((c) => [c[0], c]));
const r3 = XLSX.utils.sheet_to_json(XLSX.readFile(R3).Sheets['סבב 3'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

const LESSONS = [
  'מה למדתי מסבב 3:',
  '• כמעט כל המטרות אושרו. הטעויות היו כמעט כולן בצעד שאחרי התערוכה, ולכן לפני שהיועץ מציע צעד הוא שואל ארבעה דברים:',
  '   מתי (לימוד סת"ם: למחרת, לא אחרי כמה ימים; הסעות: סיוון, לא אב; אולם: שבוע, לא יומיים)',
  '   מי עושה אותו (פנסיוני: אתה מוציא את הדוח עם ייפוי כוח, לא מחכים ללקוח)',
  '   כמה הוא עולה (רצועות: מארז רק למי שמישש וביקש)',
  '   האם הוא מתאים לכל המקרים (אמרגן: אולם חדש מול אולם קיים; משקיע: לתאם מועד, לא "הסיור הקרוב")',
  '• מה שרגיש לא נכתב על הכרטיס שהמבקר רואה. שואלים בעל פה, והכפתור ניטרלי (מימוש זכויות: "לבדוק זכאות").',
  '• מבצע לא מתאים לכל תחום: מבצע על עיסוי נראה זול.',
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const header = (ws) => { const r = ws.getRow(1); r.font = { ...font, bold: true }; r.alignment = { wrapText: true, horizontal: 'right' }; r.eachCell((c) => { c.fill = headFill; }); };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 125;
  ['סבב 4 של בדיקת יועץ ההקמה: הכרטיס בדוכן', '',
    'לכל עסק, הכרטיס שהיועץ מציע: שלוש השאלות, במילים של העסק. זה מה שבעל הדוכן (והמבקר שמולו) יראה על הטאבלט.',
    'מה לבדוק: חסר כפתור? יש כפתור מיותר? יש מילה שלא נעים שהמבקר יראה? משהו שייך לשאלה אחרת?',
    'ממלאים כמו קודם: "התשובה שלך" ו"הערה על השאלה". אם הכרטיס מתאים, מספיק 1.', '', ...LESSONS]
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 4', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 22], ['מטרה ראשית (אושרה)', 30], ['מה הוא צריך?', 26], ['מתי?', 24], ['מי הוא?', 24], ['הערת היועץ', 30], ['תשובות מוכנות', 26], ['התשובה שלך', 34], ['הערה על השאלה', 28]]
    .map(([h, width]) => ({ header: h, width }));
  header(ws);

  const setup = wb.addWorksheet('ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  setup.columns = [['#', 5], ['סוג העסק', 22], ['מטרה ראשית (אושרה)', 34], ['מטרה נוספת', 28], ['הכרטיס (מוצע)', 60], ['ציון ברשימת הבדיקה', 18]]
    .map(([h, width]) => ({ header: h, width }));
  header(setup);

  const quick = ['מתאים', 'חסר כפתור (לכתוב איזה)', 'יש כפתור מיותר (לכתוב איזה)', 'מילה שלא נעים שהמבקר יראה'].map((x, i) => `${i + 1}. ${x}`).join('\n');
  const list = (a) => a.map((x) => '• ' + x).join('\n');
  let missing = 0;
  r3.forEach((r) => {
    const id = Number(r[0]);
    const c = cards.get(id); const p = r3plan.get(id);
    if (!c || !p) { missing++; return; }
    const goal = data.goalFixes[String(id)] || p[2];
    const row = ws.addRow([id, r[1], goal, list(c[1]), list(c[2]), list(c[3]), c[4], quick, '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    [9, 10].forEach((n) => { row.getCell(n).fill = yellow; });
    const s = setup.addRow([id, r[1], goal, p[4], `מה הוא צריך: ${c[1].join(' · ')}\nמתי: ${c[2].join(' · ')}\nמי הוא: ${c[3].join(' · ')}`, '1 מתוך 10 — מטרה אושרה, הכרטיס מחכה לאישור']);
    s.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; s.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', r3.length, 'missing', missing, '->', OUT);
})();
