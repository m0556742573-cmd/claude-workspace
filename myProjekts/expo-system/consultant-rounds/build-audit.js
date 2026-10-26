// Consistency audit of the 109 businesses: the line each business started with (its profile) against the approved setup,
// round by round. One row per business, a summary sheet on top.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const D = 'C:/Users/user/Downloads/';
const OUT = D + 'אקספו2_109_עסקים - בדיקת עקביות.xlsx';
const A = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit.json'), 'utf8'));
const ap = XLSX.utils.sheet_to_json(XLSX.readFile(D + 'אקספו2_109_עסקים_-_סיכום_ההקמה_מאושר.xlsx').Sheets['סיכום ההקמה'], { header: 1, defval: '' }).slice(1);
const R5 = new Map(XLSX.utils.sheet_to_json(XLSX.readFile(D + 'אקספו2_109_עסקים_-_סבב_5_מולא (1).xlsx').Sheets['סבב 5'], { header: 1, defval: '' }).slice(1).map((r) => [Number(r[0]), String(r[5])]));
const pathless = (id, card) => {
  const m = String(card).match(/מה הוא צריך: (.+)/); if (!m) return '';
  const asked = (R5.get(id).match(/"([^"]+)"/) || [])[1];
  if (!asked) return '';
  return m[1].split(' · ').map((s) => s.trim()).filter((n) => n !== asked).join(' · ');
};
const kind = (v) => (/סטייה שקטה/.test(v) ? 'silent' : /שינוי מוצהר/.test(v) ? 'declared' : /סתירה|חלש|פער|חלקית/.test(v) ? 'gap' : 'ok');

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const colors = { silent: 'FFFBE3E3', declared: 'FFFFF6D5', gap: 'FFFDEBD3', ok: 'FFE7F4EA' };
  const rows = ap.map((r) => { const id = Number(r[0]); const a = A[String(id)]; return { id, type: r[1], v: a[0], start: a[1], end: a[2], what: a[3], who: a[4], fix: a[5], pl: pathless(id, r[3]) }; });
  const n = (k) => rows.filter((r) => kind(r.v) === k).length;
  const ledByMe = rows.filter((r) => /^אני/.test(r.who)).length;

  const s = wb.addWorksheet('סיכום', { views: [{ rightToLeft: true }] });
  s.getColumn(1).width = 130;
  const lines = [
    ['בדיקת עקביות: 109 העסקים, מהפרופיל המקורי ועד ההקמה המאושרת', 'h'], [''],
    ['מה נבדק: לכל עסק, הקו העסקי בקובץ המקורי (האתגר, המטרה בתערוכה, הלקוח הטוב, מה ייחשב הצלחה) מול כל סבב — 1 עד 9 — ומול ההקמה שאושרה.'],
    ['שאלתי שתי שאלות: האם הקו נשמר, ואם השתנה — האם מישהו אמר את זה, או שזה קרה בלי שאף אחד שם לב.'], [''],
    ['התוצאה', 'h'],
    [`• ${n('ok')} עסקים — הקו נשמר.`],
    [`• ${n('declared')} — השתנה, אבל במפורש: אתה (בתור המציג) בחרת אחרת בסבב 1–2, עם סיבה.`],
    [`• ${n('gap')} — הקו נשמר, אבל משהו שאושר בדרך נעלם או סותר (בעיקר מעקב ארוך טווח).`],
    [`• ${n('silent')} — סטייה שקטה: ההקמה המאושרת עוסקת בעסק אחר ממה שהפרופיל תיאר, ואף אחד לא אמר את זה.`],
    [`• ב־${ledByMe} עסקים, השאלה או ההצעה שלי הן שקבעו את הכיוון שהשתנה — לא תשובה שלך.`],
    ['• 146 מתוך 246 כפתורי "מה הוא צריך" לא קיבלו מסלול משלהם. סבב 5 שאל רק על כפתור אחד בכל עסק, והסיכום הציג מסלול אחד — וזה הסתיר את הפער.'], [''],
    ['חמשת הדפוסים', 'h'],
    ['1. השאלה הראשונה קבעה את הקו. שאלות כמו "מה שווה לך יותר" או "איך משפחה בוחרת צלם לחתונה" שואלות על העסק היום, לא על המטרה בתערוכה — והתשובה הפכה למטרה. הבולטים: צלם (48), יועץ משכנתאות (49), מזגנים (65), אולם (105), כלי נגינה (109) — בכולם הסוף הפוך מההתחלה.'],
    ['2. "מי משפיע" הפך ל"מטרה ראשית". כששאלתי מי מגיע ללקוח לפניך (קבלן, מלמד, מתווך, גרפיקאי, יועץ בטיחות), ההצעה שלי בסבב 3 הפכה אותו לשותף הראשי, והלקוח המקורי ירד למשנית — לרוב בלי מסלול: 20, 61, 68, 78, 92.'],
    ['3. מה שאושר בסבב 3 ולא נכנס למסלול. תזכורת לפי תאריך, בדיקה תקופתית, תזכורת שנתית — אושרו כשדיברנו על המטרה, אבל סבבים 5–6 שאלו רק על צעד ראשון וניסיון אחד, ולכן נעלמו: 4, 14, 15, 18, 29, 35, 41, 82, 90, 97.'],
    ['4. לקוחות מוסדיים ועסקיים שנעלמו. מתנות חג לעסקים (2, 8, 45, 106 — וחנוכה מתחיל 18 יום אחרי התערוכה), בתי כנסת (7, 20, 38, 62), צד שני של עסק דו־צדדי (28 עובדים, 29 יצרנים, 13 מוזיקאים).'],
    ['5. כפתורי "מתי" שלא עושים כלום. התאריך נשאל ונרשם, והמסלול לא משתמש בו: 16, 47, 90, 97, 102.'], [''],
    ['למה סבב 8 לא תפס את זה', 'h'],
    ['הסיכום נבדק מול התשובות של הסבבים, לא מול הפרופיל המקורי. והוא הראה מסלול אחד לעסק, שנראה שלם. כל 109 אישרו — ובצדק, מול מה שהוצג.'], [''],
    ['מה זה אומר על היועץ', 'h'],
    ['• לשאול קודם "מה יהפוך את התערוכה להצלחה בשבילך" — המטרה בתערוכה — ורק אחר כך איך העסק עובד היום.'],
    ['• לא להפוך את מי שמשפיע על הלקוח למטרה ראשית בלי לשאול: "אתה רוצה שהם יהיו העיקר, או הלקוח עצמו?"'],
    ['• כל כפתור בכרטיס מקבל צעד משלו, או יורד. כפתור "מתי" שלא משנה כלום — יורד.'],
    ['• מה שאושר כמטרה (תזכורת שנתית, בדיקה כל כמה חודשים) נכנס למסלול.'],
    ['• לפני הסיכום: "בהתחלה אמרת X; ההקמה עושה Y. זה בכוונה?"'], [''],
    ['בגיליון "שורה שורה": הכרעה לכל עסק, הקו בהתחלה ובסוף, מה השתנה ובאיזה סבב, מי הוביל, הכפתורים בלי מסלול, ומה לעשות. הצבעים: ירוק נשמר · צהוב שינוי מוצהר · כתום פער · אדום סטייה שקטה.'],
  ];
  lines.forEach(([t, h], i) => { const c = s.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : h ? 12 : 11, bold: !!h }; c.alignment = { wrapText: true, horizontal: 'right', vertical: 'top' }; });

  const ws = wb.addWorksheet('שורה שורה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 20], ['הכרעה', 16], ['הקו בהתחלה (הפרופיל)', 40], ['הקו בסוף (ההקמה המאושרת)', 28], ['מה השתנה, ובאיזה סבב', 46], ['מי הוביל', 18], ['כפתורי צורך בלי מסלול משלהם', 24], ['מה לעשות', 30]].map(([header, width]) => ({ header, width }));
  const hr = ws.getRow(1); hr.font = { ...font, bold: true }; hr.alignment = { wrapText: true, horizontal: 'right' }; hr.eachCell((c) => { c.fill = fill('FFE3F0F1'); });
  rows.forEach((r) => {
    const row = ws.addRow([r.id, r.type, r.v, r.start, r.end, r.what, r.who, r.pl || '—', r.fix]);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    row.getCell(3).fill = fill(colors[kind(r.v)]);
  });
  await wb.xlsx.writeFile(OUT);
  console.log({ ok: n('ok'), declared: n('declared'), gap: n('gap'), silent: n('silent'), ledByMe }, '->', OUT);
})();
