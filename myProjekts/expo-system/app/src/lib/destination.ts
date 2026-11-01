// A number or a mail typed by hand, as it is kept (the same form the database checks): a phone as its digits from 0,
// a mail in lower case. Used at the booth ("לשנות" › another number or mail) and in the lead's page.

export interface Typed { kind: 'phone' | 'email'; value: string }

export function destinationOf(text: string): Typed | null {
  const t = text.trim();
  if (t.includes('@')) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? { kind: 'email', value: t.toLowerCase() } : null;
  const d = t.replace(/\D/g, '').replace(/^972/, '0');
  return /^0\d{8,9}$/.test(d) ? { kind: 'phone', value: d } : null;
}

/**
 * A visitor's phone or mail, half of it (יצחק, 1/11: "יהיו רק גלויים בחצי כדי שלא להעתיק סתם"): enough to recognize it
 * and check it with him, not to copy it. 0521234567 → 052-•••••67; moshe@gmail.com → mo•••@gmail.com. The full value
 * still works behind the call, WhatsApp and mail buttons.
 */
export function maskDestination(value: string): string {
  const at = value.lastIndexOf('@');
  if (at > 0) {
    const user = value.slice(0, at);
    return `${user.slice(0, user.length <= 2 ? 1 : 2)}•••${value.slice(at)}`;
  }
  const d = value.replace(/\D/g, '');
  if (d.length < 7) return '•••';
  const pre = d.length === 10 ? 3 : 2;
  return `${d.slice(0, pre)}-${'•'.repeat(d.length - pre - 2)}${d.slice(-2)}`;
}

/** 0521234567 → 052-1234567; a mail as it is. */
export function showDestination(value: string): string {
  return /^0\d{9}$/.test(value) ? `${value.slice(0, 3)}-${value.slice(3)}` : /^0\d{8}$/.test(value) ? `${value.slice(0, 2)}-${value.slice(2)}` : value;
}
