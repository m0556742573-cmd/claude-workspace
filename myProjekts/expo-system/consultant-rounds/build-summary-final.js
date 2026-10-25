// The setup summary for all 109 businesses, rewritten the way the consultant must present it:
// each line one sentence addressed to "אתה", no option numbers, no internal notes, no duplicates,
// and any contradiction between rounds settled (the later answer wins; where he only said who, the earlier timing stays).
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

const R8 = 'C:/Users/user/Downloads/אקספו2_109_עסקים_-_סבב_8_מולא.xlsx';
const OUT = 'C:/Users/user/Downloads/אקספו2_109_עסקים - סיכום ההקמה (מתוקן).xlsx';
const F = JSON.parse(fs.readFileSync(path.join(__dirname, 'summary-final.json'), 'utf8'));
const rows = XLSX.utils.sheet_to_json(XLSX.readFile(R8).Sheets['סבב 8'], { header: 1, defval: '' }).slice(1).filter((r) => r[0] !== '');

const you = (s) => String(s).replace(/אשתי/g, 'אשתך').replace(/\bאני\b/g, 'אתה');
function capacity(s) {
  let t = String(s).trim();
  t = t.replace(/^1\b/, 'חצי שעה ביום').replace(/^2\b/, 'שעה ביום').replace(/^3\b/, 'שעתיים ומעלה').replace(/^4\b/, 'רק מה שאוטומטי');
  if (/^(חצי )?שעה($|,| \()/.test(t) && !/ביום/.test(t)) t = t.replace(/^(חצי )?שעה/, '$& ביום');
  if (/ולא כל יום/.test(t)) return 'חצי שעה, לא כל יום';
  return you(t.replace(/,\s*(.+)$/, ' ($1)'));
}
function deflt(id, s) {
  if (F.defaultOverride[String(id)]) return F.defaultOverride[String(id)];
  const t = String(s);
  if (/^רק רשימת תפוצה/.test(t)) return 'רק רשימת תפוצה';
  if (/^הודעת תודה/.test(t)) return 'הודעת תודה, ואז רשימת תפוצה';
  if (/^בעל עסק/.test(t)) return 'בעל עסק — אתה מתקשר; פרטי — רשימת תפוצה';
  if (/^שיחה קצרה/.test(t)) return 'אתה מתקשר' + you(t.replace(/^שיחה קצרה,?\s*/, ' ').replace(/,\s*(אתה|אני)\s*(–.*)?$/, '').replace(/\s+/g, ' ')).replace(/\s*$/, '');
  return you(t);
}
function card(s, id) {
  const fix = F.cardFix[String(id)];
  if (!fix) return String(s);
  const lines = String(s).split('\n').filter((l) => !/^מה הוא צריך:/.test(l) && !/לקח מספר/.test(l));
  if ((fix.need || []).length > 1) lines.unshift('מה הוא צריך: ' + fix.need.join(' · '));
  return lines.concat(fix.note ? [fix.note] : []).join('\n');
}
function messages(id, s, pathText) {
  let out = String(s).split('\n').map((x) => x.replace(/^•\s*/, '').trim()).filter(Boolean);
  if (!/הודעה/.test(pathText)) out = out.filter((x) => !/^הודעת המשך/.test(x));
  out = out.filter((x) => !(F.msgRemove[String(id)] || []).includes(x));
  const swap = F.msgSwap[String(id)] || {};
  out = out.map((x) => swap[x] || x);
  return out;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  const font = { name: 'Arial', size: 11 };
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F0F1' } };
  const ws = wb.addWorksheet('סיכום ההקמה', { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = [['#', 5], ['סוג העסק', 20], ['המטרות', 30], ['הכרטיס בדוכן', 42], ['המסלול', 50], ['זמן למעקב', 16], ['מבקר בלי סימון', 24], ['ההודעות', 34], ['הערה', 22]]
    .map(([h, width]) => ({ header: h, width }));
  const hr = ws.getRow(1); hr.font = { ...font, bold: true }; hr.alignment = { wrapText: true, horizontal: 'right' }; hr.eachCell((c) => { c.fill = headFill; });
  rows.forEach((r) => {
    const id = Number(r[0]);
    const p = F.path[String(id)] || r[4];
    const row = ws.addRow([id, r[1], r[2], card(r[3], id), p, capacity(r[5]), deflt(id, r[6]), messages(id, r[7], p).map((x) => '• ' + x).join('\n'), '']);
    row.alignment = { wrapText: true, vertical: 'top', horizontal: 'right' }; row.font = font;
  });
  await wb.xlsx.writeFile(OUT);
  console.log('rows', rows.length, '->', OUT);
})();
