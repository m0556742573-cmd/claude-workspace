// Builds "סבב 5" of the consultant test: the first step after the fair, asked (what, when, who) — never proposed with a date.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R4 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_4_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 5.xlsx';
const r4data = JSON.parse(fs.readFileSync(path.join(__dirname, 'round4.json'), 'utf8'));
const r3plan = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'round3.json'), 'utf8')).map((r) => [r[0], r]));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'round5.json'), 'utf8'));
const cards = new Map(r4data.cards.map((c) => [c[0], { need: c[1], when: c[2], who: c[3], note: c[4] }]));
const steps = new Map(data.steps.map((s) => [s[0], s]));
const r4 = XLSX.utils.sheet_to_json(XLSX.readFile(R4).Sheets['סבב 4'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

// His rule from round 4: a question with one button is not a question — it leaves the card.
function finalCard(id) {
  const c = Object.assign({}, cards.get(id), data.cardFixes[String(id)] || {});
  const dropped = [];
  for (const [k, name] of [['need', 'מה הוא צריך'], ['when', 'מתי'], ['who', 'מי הוא']]) {
    if ((c[k] || []).length <= 1) { if ((c[k] || []).length === 1) dropped.push(`"${name}" (היה בה רק "${c[k][0]}")`); c[k] = []; }
  }
  return { c, dropped };
}

const LESSONS = [
  'מה למדתי מסבב 4 (97 מתוך 109 אישרו את הכרטיס כמו שהוא):',
  '• כל מה שהמציג כבר אמר נכנס לכרטיס: סוג קונה (גארטלעך: מחותנים), תזמון (דירות לשבתות: חגים), שירות עיקרי (עורך דין: בוררות ודין תורה).',
  '• כפתור שלא מקדם את המטרה יוצא, כי הוא מבלבל את מי שעומד בדוכן (שטריימלך: חנות).',
  '• עובדה אחת, שאלה אחת. "מי שמחפש הידור" שייך ל"מה הוא צריך", ו"מתנה" לא מופיעה פעמיים.',
  '• שאלה עם כפתור אחד היא לא שאלה, והיא יוצאת מהכרטיס. הוחל על כל העסקים, לא רק על הקצביה.',
  '• כפתור שאף אחד לא ירצה ללחוץ עליו מול אנשים מנוסח כעובדה: "עסק בלי עובדים", לא "עושה הכל לבד".',
  '• הכרטיס מתאר את המבקר, לא את מה שקרה בדוכן. "לקח מספר" הוא מצב של הדוכן, לא כפתור.',
  '• כפתור כללי ("תואר") מתפרק למה שבאמת מבדיל (תחומים).',
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const header = (ws) => { const r = ws.getRow(1); r.font = { ...font, bold: true }; r.alignment = { wrapText: true, horizontal: 'right' }; r.eachCell((c) => { c.fill = headFill; }); };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 125;
  ['סבב 5 של בדיקת יועץ ההקמה: הצעד הראשון אחרי התערוכה', '',
    'כמו שביקשת אחרי סבב 3: היועץ לא מציע תאריך מוכן. הוא שואל.',
    'לכל עסק, על הצורך העיקרי בכרטיס: מה הצעד הראשון אחרי התערוכה, מתי, ומי עושה אותו. אם הצעד עולה כסף או לא מתאים לכל מקרה — כתוב גם את זה.',
    'אפשר לכתוב קצר, למשל: "2, למחרת, אני" או "שיחה תוך 3 ימים, אני".', '', ...LESSONS]
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 5', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 22], ['מטרה ראשית', 28], ['הכרטיס (אחרי התיקונים)', 46], ['מה כבר ידוע', 26], ['השאלה של היועץ', 40], ['צעדים אפשריים (בלי תאריך)', 28], ['התשובה שלך: מה, מתי, מי', 34], ['הערה', 26]]
    .map(([h, width]) => ({ header: h, width }));
  header(ws);

  const setup = wb.addWorksheet('ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  setup.columns = [['#', 5], ['סוג העסק', 22], ['מטרה ראשית (אושרה)', 32], ['הכרטיס (אושר)', 58], ['המסלול', 30], ['ציון ברשימת הבדיקה', 26]]
    .map(([h, width]) => ({ header: h, width }));
  header(setup);

  let missing = 0;
  r4.forEach((r) => {
    const id = Number(r[0]);
    const s = steps.get(id); const p = r3plan.get(id);
    if (!s || !p || !cards.get(id)) { missing++; return; }
    const { c, dropped } = finalCard(id);
    const goal = r[2] || p[2];
    const lines = [c.need.length && 'מה הוא צריך: ' + c.need.join(' · '), c.when.length && 'מתי: ' + c.when.join(' · '), c.who.length && 'מי הוא: ' + c.who.join(' · ')].filter(Boolean);
    const cardText = (lines.join('\n') || 'רק השם') + (dropped.length ? '\nירדו (כפתור אחד): ' + dropped.join(', ') : '') + (c.note ? '\n' + c.note : '');
    const who = c.need.includes(s[1]) ? `מבקר שסימנת אצלו "${s[1]}"` : "מבקר שנרשם אצלך בדוכן";
    const q = `${who}: מה הצעד הראשון שלך איתו אחרי התערוכה, מתי, ומי עושה אותו?`;
    const row = ws.addRow([id, r[1], goal, cardText, s[2] || '—', q, s[3].map((x, i) => `${i + 1}. ${x}`).join('\n'), '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    row.getCell(6).font = { ...font, bold: true };
    [8, 9].forEach((n) => { row.getCell(n).fill = yellow; });
    const st = setup.addRow([id, r[1], goal, cardText, 'מחכה לתשובה שלך', '6 מתוך 10 — חסרים: מסלולים, קיבולת, ברירות מחדל, הודעות']);
    st.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; st.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', r4.length, 'missing', missing, '->', OUT);
})();
