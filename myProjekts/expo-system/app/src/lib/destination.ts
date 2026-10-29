// A number or a mail typed by hand, as it is kept (the same form the database checks): a phone as its digits from 0,
// a mail in lower case. Used at the booth ("לשנות" › another number or mail) and in the lead's page.

export interface Typed { kind: 'phone' | 'email'; value: string }

export function destinationOf(text: string): Typed | null {
  const t = text.trim();
  if (t.includes('@')) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? { kind: 'email', value: t.toLowerCase() } : null;
  const d = t.replace(/\D/g, '').replace(/^972/, '0');
  return /^0\d{8,9}$/.test(d) ? { kind: 'phone', value: d } : null;
}

/** 0521234567 → 052-1234567; a mail as it is. */
export function showDestination(value: string): string {
  return /^0\d{9}$/.test(value) ? `${value.slice(0, 3)}-${value.slice(3)}` : /^0\d{8}$/.test(value) ? `${value.slice(0, 2)}-${value.slice(2)}` : value;
}
