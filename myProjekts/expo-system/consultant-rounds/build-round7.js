// Builds "סבב 7" of the consultant test: the path so far, then three closing questions in one round —
// capacity, what happens with a visitor nothing was tapped for, and the messages the paths need.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R6 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_6_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 7.xlsx';
const first = JSON.parse(fs.readFileSync(path.join(__dirname, 'round6.json'), 'utf8')).first;
const r6 = XLSX.utils.sheet_to_json(XLSX.readFile(R6).Sheets['סבב 6'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

const NEXT = ['עוד ניסיון', 'הודעה אוטומטית', 'רק רשימת תפוצה', 'בלי צעד שני'];
const WHENWHO = ['תוך יומיים, אני', 'תוך שבוע, אני', 'מיד, אוטומטי', 'מישהו אחר'];
const GATE = { 35: ['להוסיף "יש תוכנית מאדריכל"', '"יש היתר" מספיק', ''], 74: ['"רוצה להתחיל עכשיו" במקום "עכשיו"', 'כפתור נפרד', ''], 99: ['להוסיף כפתור', 'נשאל בעל פה', ''] };
function kind(q) { return /מה הצעד הבא|מי שלא הגיב/.test(q) ? 'next' : /מי עושה|מתי\?/.test(q) ? 'whenwho' : 'gate'; }
function resolve(ans, opts) {
  const a = String(ans).trim();
  const m = a.match(/^(\d)\s*[.,]?\s*(.*)$/s);
  if (!m) return a;
  const o = opts[m[1] - 1] || '';
  return [o, m[2]].filter(Boolean).join(', ');
}

// The messages a business's steps send, read from what he said; "תודה שביקרת" always opens the list.
const MSG = [
  [/מחירון/, 'מחירון'], [/קטלוג/, 'קטלוג'], [/תמונות/, 'תמונות של עבודות'], [/סרטון|הקלטה/, 'סרטון או הקלטה לדוגמה'],
  [/מבצע/, 'מבצע התערוכה'], [/המספר להזמנות|קישור להזמנה/, 'איך מזמינים'], [/תפריט/, 'תפריט'], [/תיק עבודות/, 'תיק עבודות'],
  [/סיפורי בוגרים/, 'סיפורי בוגרים'], [/מסמכים/, 'רשימת מסמכים'], [/ייפוי כוח/, 'ייפוי כוח לחתימה'], [/יום הפתוח/, 'הזמנה ליום פתוח'],
  [/פרטי המנוי/, 'פרטי המנוי'], [/תזכורת/, 'תזכורת (לפני העונה או השמחה)'], [/הדגמה/, 'קישור להדגמה'], [/הודעה אוטומטית|הודעה/, 'הודעת המשך, כשאין תשובה'], [/להזמין|הזמנה ל/, 'הזמנה (לחנות, למדידה או לאירוע)'], [/רשימת תפוצה/, 'הודעות לרשימת התפוצה'],
];
function messages(text) {
  const out = ['תודה שביקרת, עם הפרטים שלך'];
  MSG.forEach(([re, name]) => { if (re.test(text) && !out.includes(name)) out.push(name); });
  return out;
}

const LESSONS = [
  'מה למדתי מסבב 6:',
  '• אצל רוב המציגים: עוד ניסיון אחד, בדרך כלל אחרי שבוע עד חודש, ואז מפסיקים. אצל כמה — מסלול שלם (קצביה: שלוש הודעות ביום רביעי, ואז רשימת תפוצה).',
  '• "בלי צעד שני" הוא תשובה לגיטימית כשהזמן קובע: כוח אדם, כינוסים, אולם שהתאריך בו משתחרר, וסופרים ("קהילה קטנה, לא רודפים"). שם היועץ לא ישאל על צעד שני.',
  '• צעד שני יכול להיות קשור לאירוע ולא למספר ימים: לפני ביקורת כיבוי אש, לפני שבועות כשמתחיל החום, אחרי ר"ח אלול, לפני ל"ג בעומר, לפני הסיור הבא. זו תהיה אפשרות קבועה בשאלה.',
  '• שוב, לא תמיד המציג עושה: הבן, המעצבת, המורה של החוג, נהג ההפצה, הנהלת החשבונות.',
  '• מה שרגיש לעסק (כמה עובדים יש) נשאל בעל פה, לא ככפתור.',
  '• טעות שלי, לא של היועץ: בתשעה עסקים נשאלת שוב "מתי?" למרות שכבר ענית. הסיבה הייתה באג בבדיקה האוטומטית שכתבתי (היא לא זיהתה את המילה "יומיים"). תוקן.',
];

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const header = (ws) => { const r = ws.getRow(1); r.font = { ...font, bold: true }; r.alignment = { wrapText: true, horizontal: 'right' }; r.eachCell((c) => { c.fill = headFill; }); };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 125;
  ['סבב 7 של בדיקת יועץ ההקמה: שלוש שאלות אחרונות', '',
    'בסבב הזה שלוש שאלות קצרות לכל עסק, כדי לסגור את ההקמה בסבב אחד:',
    'א. קיבולת: כמה זמן ביום יהיה לך (או לעוזר) למעקב בשבועיים שאחרי התערוכה.',
    'ב. מבקר שנרשם בלי שום סימון: מה עושים איתו.',
    'ג. ההודעות: היועץ רשם אילו הודעות המסלולים שלך צריכים. חסרה? מיותרת? צריך לצרף קובץ?', 'שים לב: את רשימת ההודעות חילצתי מתוך המסלול באופן גס, לפי מילים. אצל רוב העסקים המסלול הוא שיחות, ולכן נשארה רק "תודה שביקרת". אם חסרה הודעה — זה בדיוק מה שאני צריך לדעת.',
    'בכל שאלה אפשר לכתוב מספר של תשובה מוכנה, או חופשי. העמודות הצהובות.', '', ...LESSONS]
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 7', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 20], ['המסלול עד עכשיו', 44],
    ['א. כמה זמן ביום למעקב?', 22], ['ב. מבקר בלי שום סימון: מה עושים?', 26], ['ההודעות שהיועץ רשם', 30], ['ג. ההודעות: חסרה, מיותרת, קובץ?', 26], ['הערה', 24]]
    .map(([h, width]) => ({ header: h, width }));
  header(ws);
  const qrow = ws.addRow(['', 'תשובות מוכנות:', '',
    '1. חצי שעה\n2. שעה\n3. שעתיים ומעלה\n4. רק מה שאוטומטי',
    '1. רק רשימת תפוצה\n2. הודעת תודה, ואז רשימת תפוצה\n3. שיחה קצרה (מתי?)\n4. בעל עסק — שיחה; פרטי — רשימה',
    '', '1. מתאים\n2. חסרה הודעה (איזו?)\n3. יש מיותרת (איזו?)\n4. צריך לצרף קובץ (לאיזו?)', '']);
  qrow.font = { ...font, italic: true, color: { argb: 'FF6B7785' } }; qrow.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' };

  const setup = wb.addWorksheet('ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  setup.columns = [['#', 5], ['סוג העסק', 22], ['המסלול', 56], ['ההודעות', 34], ['ציון ברשימת הבדיקה', 26]].map(([h, width]) => ({ header: h, width }));
  header(setup);

  r6.forEach((r) => {
    const id = Number(r[0]);
    const q = String(r[4]); const ans = String(r[6] || '').trim();
    const k = kind(q);
    let pathText = first[String(id)] || '';
    if (k === 'next') pathText += '\n← ' + resolve(ans, NEXT);
    else if (k === 'whenwho') pathText += ' — ' + resolve(ans, WHENWHO);
    else pathText += '\n(כפתור: ' + resolve(ans, GATE[id] || []) + ')';
    const msgs = messages(pathText);
    const row = ws.addRow([id, r[1], pathText, '', '', msgs.map((x) => '• ' + x).join('\n'), '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    [4, 5, 7, 8].forEach((n) => { row.getCell(n).fill = yellow; });
    const st = setup.addRow([id, r[1], pathText, msgs.join(' · '), '7 מתוך 10 — חסרים: קיבולת, ברירת מחדל, אישור ההודעות']);
    st.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; st.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', r6.length, '->', OUT);
})();
