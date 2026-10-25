// Builds "סבב 8" of the consultant test: the closing summary of each business's setup, the way the consultant
// shows it when the checklist passes — goals, card, path, capacity, the default, and the messages — for approval.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R7 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_7_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סבב 8 (סיכום ההקמה).xlsx';
const J = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const r3 = new Map(J('round3.json').map((r) => [r[0], r]));
const r4 = J('round4.json'); const cards = new Map(r4.cards.map((c) => [c[0], { need: c[1], when: c[2], who: c[3], note: c[4] }]));
const r5fix = J('round5.json').cardFixes;
const R8 = J('round8.json');
const rows = XLSX.utils.sheet_to_json(XLSX.readFile(R7).Sheets['סבב 7'], { header: 1, defval: '' }).slice(2).filter((r) => r[0] !== '');

const CAP = ['חצי שעה ביום', 'שעה ביום', 'שעתיים ומעלה', 'רק מה שאוטומטי'];
const DEF = ['רק רשימת תפוצה', 'הודעת תודה, ואז רשימת תפוצה', 'שיחה קצרה', 'בעל עסק — שיחה; פרטי — רשימת תפוצה'];
function pickAns(ans, opts) {
  const a = String(ans).trim();
  const m = a.match(/^(\d)\s*[.,]?\s*(.*)$/s);
  if (!m) return a || '—';
  return [opts[m[1] - 1], m[2]].filter(Boolean).join(', ');
}
function card(id) {
  const c = Object.assign({}, cards.get(id), r5fix[String(id)] || {}, R8.cardGate[String(id)] || {});
  for (const k of ['need', 'when', 'who']) if ((c[k] || []).length <= 1) c[k] = [];
  return [c.need.length && 'מה הוא צריך: ' + c.need.join(' · '), c.when.length && 'מתי: ' + c.when.join(' · '), c.who.length && 'מי הוא: ' + c.who.join(' · ')]
    .filter(Boolean).join('\n') + (c.note ? '\n' + c.note : '') || 'רק השם';
}
function messages(id, listed) {
  const key = String(id);
  if (R8.msgReplace[key]) return R8.msgReplace[key];
  let out = String(listed).split('\n').map((x) => x.replace(/^•\s*/, '').trim()).filter(Boolean);
  if (R8.thanksNeutral[key]) out = out.map((x) => (/^תודה שביקרת/.test(x) ? R8.thanksNeutral[key] : x));
  out = out.filter((x) => !(R8.msgRemove[key] || []).includes(x));
  (R8.msgAdd[key] || []).forEach((x) => { if (!out.includes(x)) out.push(x); });
  const file = R8.msgFile[key];
  if (file) { const i = out.findIndex((x) => x.startsWith(file.replace(/ \(.+\)$/, ''))); if (i >= 0) out[i] = out[i] + ' (קובץ)'; else out.push(file + (/\(/.test(file) ? '' : ' (קובץ)')); }
  return out;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6D5' } };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const header = (ws) => { const r = ws.getRow(1); r.font = { ...font, bold: true }; r.alignment = { wrapText: true, horizontal: 'right' }; r.eachCell((c) => { c.fill = headFill; }); };

  const help = wb.addWorksheet('איך ממלאים', { views: [{ rightToLeft: true }] });
  help.getColumn(1).width = 125;
  ['סבב 8 של בדיקת יועץ ההקמה: הסיכום', '',
    'זה מה שהיועץ מראה למציג בסוף השיחה, כשרשימת הבדיקה עוברת: ההקמה כולה במקום אחד.',
    'כל התיקונים שלך מסבב 7 כבר בפנים: ההודעות שחסרו, הקבצים המצורפים, השדכן בלי שום הודעה, ומימוש זכויות עם תודה בלי לכתוב על מה.',
    'שתי שאלות:',
    '• "מאשר?": האם ההקמה נכונה. אם כן, מספיק 1.',
    '• "הערה על הסיכום": האם הסיכום עצמו ברור ומובן למציג — לא רק נכון.', '',
    'מה למדתי מסבב 7:',
    '• לרוב המציגים יש חצי שעה ביום. זו ברירת המחדל של היועץ, והמסלולים נבנים לפיה.',
    '• גם אחרי שיחה צריך לשלוח משהו בכתב. היועץ מחפש עכשיו את ההודעה העיקרית של כל מסלול שבנוי משיחות.',
    '• כל הודעה אוטומטית נבדקת מול מה שהמציג אמר על רגישות, לא רק מול המסלול.']
    .forEach((t, i) => { const c = help.getCell(i + 1, 1); c.value = t; c.font = { name: 'Arial', size: i === 0 ? 14 : 11, bold: i === 0 }; c.alignment = { wrapText: true, horizontal: 'right' }; });

  const ws = wb.addWorksheet('סבב 8', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 20], ['המטרות', 30], ['הכרטיס בדוכן', 42], ['המסלול', 44], ['זמן למעקב', 14], ['מבקר בלי סימון', 22], ['ההודעות', 34], ['מאשר? (1 / מה לתקן)', 26], ['הערה על הסיכום', 24]]
    .map(([h, width]) => ({ header: h, width }));
  header(ws);

  rows.forEach((r) => {
    const id = Number(r[0]);
    const p = r3.get(id);
    const goal = (r4.goalFixes[String(id)] || p[2]) + (p[4] && p[4] !== '—' ? '\nנוספת: ' + p[4] : '');
    const msgs = messages(id, r[5]);
    const row = ws.addRow([id, r[1], goal, card(id), String(r[2]), pickAns(r[3], CAP), pickAns(r[4], DEF), msgs.map((x) => '• ' + x).join('\n'), '', '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
    [9, 10].forEach((n) => { row.getCell(n).fill = yellow; });
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', rows.length, '->', OUT);
})();
