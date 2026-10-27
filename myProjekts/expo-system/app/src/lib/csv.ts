// Reading a list the admin saved from Excel as CSV: commas, semicolons or tabs, quotes, a BOM.
// The columns are recognised by their Hebrew or English header, whatever order they come in.

export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const first = t.split(/\r?\n/, 1)[0] ?? '';
  const sep = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0]!;
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (quoted) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

/** For each field, the header words that mean it. */
export type Fields = Record<string, string[]>;

export const EXHIBITOR_FIELDS: Fields = {
  email: ['מייל', 'אימייל', 'דוא"ל', 'דואל', 'email', 'e-mail', 'mail'],
  name: ['שם', 'שם מלא', 'שם המציג', 'איש קשר', 'name'],
  business: ['עסק', 'שם העסק', 'חברה', 'business', 'company'],
};
export const PEOPLE_FIELDS: Fields = {
  full_name: ['שם', 'שם מלא', 'שם ומשפחה', 'name', 'full name', 'full_name'],
  first: ['שם פרטי', 'first name', 'first'],
  last: ['שם משפחה', 'משפחה', 'last name', 'last'],
  city: ['עיר', 'ישוב', 'יישוב', 'city'],
  phone: ['טלפון', 'נייד', 'פלאפון', 'טל', 'phone', 'mobile'],
  email: ['מייל', 'אימייל', 'דוא"ל', 'דואל', 'email', 'e-mail'],
  business_owner: ['בעל עסק', 'business owner', 'owner'],
  business_name: ['שם העסק', 'עסק', 'business', 'business name'],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_\-:]+/g, ' ');

/** Which column holds each field: an exact header first; then each other header goes to the field whose word it
 *  contains most fully ("שם העסק" is the business, not the name). */
export function mapColumns(header: string[], fields: Fields): Record<string, number> {
  const h = header.map(norm);
  const out: Record<string, number> = {};
  const used = new Set<number>();
  for (const [field, words] of Object.entries(fields)) {
    const i = h.findIndex((x, n) => !used.has(n) && words.some((w) => x === norm(w)));
    if (i >= 0) { out[field] = i; used.add(i); }
  }
  h.forEach((x, n) => {
    if (used.has(n)) return;
    let best = '', len = 0;
    for (const [field, words] of Object.entries(fields)) for (const w of words) if (x.includes(norm(w)) && norm(w).length > len) { best = field; len = norm(w).length; }
    if (best && !(best in out)) { out[best] = n; used.add(n); }
  });
  return out;
}

const YES = ['כן', 'v', 'x', '1', 'yes', 'true', '✓', '✔'];

/** The rows as objects for the server; a full name is put together from first and last when there is no name column. */
export function toRecords(rows: string[][], cols: Record<string, number>): Record<string, string | boolean>[] {
  return rows.map((r) => {
    const get = (f: string) => (cols[f] === undefined ? '' : (r[cols[f]!] ?? '').trim());
    const rec: Record<string, string | boolean> = {};
    for (const f of Object.keys(cols)) rec[f] = get(f);
    if (!rec.full_name && (cols.first !== undefined || cols.last !== undefined)) rec.full_name = `${get('first')} ${get('last')}`.trim();
    delete rec.first; delete rec.last;
    if ('business_owner' in rec) rec.business_owner = YES.includes(String(rec.business_owner).toLowerCase());
    return rec;
  });
}
