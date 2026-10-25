// Builds "סבב 6" of the consultant test. For each business, what his round-5 answer still leaves open:
// when and who for the first step if he did not say, a missing card button where a step depends on it,
// and otherwise the next step when the first one brings no answer.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R5 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_5_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 6.xlsx';
const R6 = JSON.parse(fs.readFileSync(path.join(__dirname, 'round6.json'), 'utf8'));
const steps = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'round5.json'), 'utf8')).steps.map((s) => [s[0], s]));
const r5 = XLSX.utils.sheet_to_json(XLSX.readFile(R5).Sheets['סבב 5'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

// A step that is free or costs him is given only to some visitors; where the card has no button for that, the consultant asks.
const GATES = {
  35: ['הביקור בבית רק אחרי שיש תוכנית מאדריכל. להוסיף לכרטיס, ב"מתי", כפתור "יש תוכנית מאדריכל"?', ['כן, להוסיף', 'לא צריך: "יש היתר" מספיק', 'משהו אחר']],
  74: ['אימון הניסיון רק למי שבאמת רוצה להתחיל. להחליף ב"מתי" את "עכשיו" ב"רוצה להתחיל עכשיו"?', ['כן, להחליף', 'להוסיף כפתור נפרד', 'משהו אחר']],
  99: ['מגש לדוגמה רק למשרד עם יותר מעשרה עובדים. להוסיף לכרטיס, ב"מי הוא", כפתור "משרד גדול (מעל 10 עובדים)"?', ['כן, להוסיף', 'אשאל בעל פה ואחליט בעצמי', 'משהו אחר']],
};
const WHEN = /(מחר|למחרת|יום|יומ|ימים|שבוע|שבועיים|חודש|מיד|אחרי|לפני|בסיוון|בתמוז|באב|בשבת|באותו|ביום|באירוע|כשתהיה|כשיש|לפי)/;
const WHO = /(אני|אוטומטי|מזכיר|הבן|אשתי|טכנאי|הנהלת|אני מזמין|אני שולח)/;

// "2, תוך שבוע, אני" -> "להזמין לראות את הכתב, תוך שבוע, אני"
function resolve(ans, options) {
  return String(ans).replace(/^\s*(\d)(\s*(?:ו־?|וגם|,)\s*(\d))?/, (m, a, _x, b) => [options[a - 1], b && options[b - 1]].filter(Boolean).join(' + ') || m).trim();
}

const LESSONS = [
  'מה למדתי מסבב 5:',
  '• "מי עושה" לא תמיד המציג: מזכירה, הבן בחנות, האישה שמנהלת הזמנות, הנהלת חשבונות, טכנאי — והרבה פעמים "אוטומטי".',
  '• צעד שעולה זמן או כסף ניתן רק למי שמתאים לו (בדיקה ראשונה רק למי שמגייס עכשיו, מגש רק למשרד גדול). כשהעובדה הזו לא בכרטיס, היועץ שואל אם להוסיף כפתור.',
  '• אותו צורך, צעד אחר לפי מה שסומן: יש תאריך חתונה — שיחה למחרת; לקוח מחו"ל — תמונות; מזגן שמתקלקל עכשיו — ביקור מיד; "קופאים" — באותו יום.',
  '• כשהמציג כבר אמר שיש כמה מקרים, שואלים על הצעד לכל מקרה בנפרד (אמרגן: אולם חדש ואולם קיים).',
  '• תשובה מוכנה לא סותרת מה שהמציג כבר אמר (שדכן: "להמתין שיחזרו"; ניהול נכסים: "פגישה עם בעל הנכס").',
  '• צעד יכול להיות קשור ליום בשבוע: ההודעה של הקצביה יוצאת ביום רביעי לפני שבת.',
  '• כשהתשובה "1" בלי מתי ובלי מי, היועץ לא משלים לבד: הוא שואל.',
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const header = (ws) => { const r = ws.getRow(1); r.font = { ...font, bold: true }; r.alignment = { wrapText: true, horizontal: 'right' }; r.eachCell((c) => { c.fill = headFill; }); };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 125;
  ['סבב 6 של בדיקת יועץ ההקמה: מה שעוד פתוח בצעד הראשון, והצעד השני', '',
    'בכל עסק היועץ שואל את הדבר הבא שחסר לו, ולכן השאלות שונות:',
    '• מי שענה "1" בלי מתי או בלי מי — נשאל על זה.',
    '• מי שהצעד שלו ניתן רק לחלק מהמבקרים, וחסר לזה כפתור בכרטיס — נשאל אם להוסיף.',
    '• כל השאר — מה קורה אם הצעד הראשון לא הביא תשובה.',
    'ממלאים כמו קודם, בשתי העמודות הצהובות.', '', ...LESSONS]
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 6', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 22], ['סבב 5: מה ענית', 34], ['הצעד הראשון, כמו שהיועץ הבין', 36], ['השאלה של היועץ', 44], ['תשובות מוכנות', 28], ['התשובה שלך', 34], ['הערה', 26]]
    .map(([h, width]) => ({ header: h, width }));
  header(ws);

  const setup = wb.addWorksheet('ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  setup.columns = [['#', 5], ['סוג העסק', 22], ['מטרה ראשית', 30], ['הכרטיס', 50], ['הצעד הראשון', 40], ['ציון ברשימת הבדיקה', 24]]
    .map(([h, width]) => ({ header: h, width }));
  header(setup);

  const counts = { whenwho: 0, gate: 0, next: 0 };
  r5.forEach((r) => {
    const id = Number(r[0]);
    const s = steps.get(id);
    const ans = String(r[7] || '').trim();
    const first = R6.first[String(id)] || resolve(ans, s ? s[3] : []);
    let q; let quick;
    if (R6.next[String(id)] && !GATES[id]) { q = R6.next[String(id)]; quick = /מתי, ומי עושה/.test(q) ? ['תוך יומיים, אני', 'תוך שבוע, אני', 'מיד, אוטומטי', 'מישהו אחר אצלי (מי?)'] : ['עוד ניסיון (מתי?)', 'הודעה אוטומטית (מתי?)', 'רק רשימת תפוצה', 'לסגור את המעקב']; counts.next++; }
    else if (GATES[id]) { [q, quick] = GATES[id]; counts.gate++; }
    else if (!WHEN.test(ans) || !WHO.test(ans)) {
      const missing = [!WHEN.test(ans) && 'מתי', !WHO.test(ans) && 'מי עושה את זה'].filter(Boolean).join(', ו');
      q = `אמרת: ${first}. ${missing}?`;
      quick = ['תוך יומיים, אני', 'תוך שבוע, אני', 'מיד, אוטומטי', 'מישהו אחר אצלי (מי?)'];
      counts.whenwho++;
    } else {
      q = /אוטומטי/.test(ans)
        ? `אחרי ${first.replace(/^הודעה אוטומטית|^המבצע נשלח אוטומטית|^תזכורת אוטומטית/, (m) => m)} — מי שלא הגיב: מה קורה איתו, ומתי?`
        : `אמרת: ${first}. ואם זה לא הביא תשובה או התקדמות — מה הצעד הבא, מתי, ומי?`;
      quick = ['עוד ניסיון (מתי?)', 'הודעה אוטומטית (מתי?)', 'רק רשימת תפוצה', 'לסגור את המעקב'];
      counts.next++;
    }
    const row = ws.addRow([id, r[1], ans, first, q, quick.map((x, i) => `${i + 1}. ${x}`).join('\n'), '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    row.getCell(5).font = { ...font, bold: true };
    row.getCell(3).font = { ...font, color: { argb: 'FF6B7785' } };
    [7, 8].forEach((n) => { row.getCell(n).fill = yellow; });
    const st = setup.addRow([id, r[1], r[2], r[3], first, '6 מתוך 10 — המסלול התחיל; חסרים: המשך המסלול, קיבולת, ברירות מחדל, הודעות']);
    st.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; st.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', r5.length, counts, '->', OUT);
})();
