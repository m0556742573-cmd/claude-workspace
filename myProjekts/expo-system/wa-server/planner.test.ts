// The planner: an automatic message is queued on its day, once; never with a hole, never overdue, never before the
// card settled, never with nowhere to send it by WhatsApp, after a reply, or after "הסר".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Setup } from '../engine/src/index.ts';
import { due, type Plan } from './planner.ts';

const FAIR = '2026-11-16';
const list = { steps: [], end: { kind: 'list' as const } };
const setup: Setup = {
  business: 'מכולת', anchor: { goal: '', success: '' }, sensitive: false, when: [], who: [],
  needs: [{ label: 'משלוחים', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [
    { id: 'how', action: 'send', who: 'auto', timing: { kind: 'after', days: 0 }, message: 'איך מזמינים' },
    { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 3 } },
  ], end: { kind: 'list' } } }] }],
  defaults: { business: list, private: list },
};
const me = { name: 'יצחק', business: 'מכולת', phone: '050-0000000', greeting: 'shalom' as const, sensitive: false, blocked: false };
const lead = { id: 'a', captured_on: FAIR, taps: ['משלוחים'], customer_date: null, business_owner: false, setup_version: null, name: 'יעקב', settled: true, targets: 1, mails: 0, booth_message: null, booth_none: false };
const plan = (over: Partial<Plan> = {}): Plan => ({
  me, setups: [{ version: 1, active: true, data: setup }], texts: { 'איך מזמינים': 'שלום [שם], מזמינים בטלפון [טלפון].\n[שם המציג], [העסק] · [טלפון]' },
  leads: [lead], steps: [], manual: [], replies: [], planned: [], ...over,
});

test('the first message goes on the day of the visit, filled', () => {
  const d = due(plan(), FAIR, []);
  assert.equal(d.length, 1);
  assert.equal(d[0]!.step, 'how');
  assert.match(d[0]!.body, /^שלום יעקב, מזמינים בטלפון 050-0000000/);
});

test('the booth choice replaces the immediate message', () => {
  const texts = { 'איך מזמינים': 'שלום [שם], איך מזמינים', 'מחירון': 'שלום [שם], המחירון' };
  const d = due(plan({ texts, leads: [{ ...lead, booth_message: 'מחירון' }] }), FAIR, []);
  assert.equal(d.length, 1);
  assert.equal(d[0]!.step, 'booth');
  assert.match(d[0]!.body, /המחירון/);
  assert.equal(due(plan({ texts, leads: [{ ...lead, booth_none: true }] }), FAIR, []).length, 0); // none now
});

test('a file written once goes with the message, and its line leaves the text', () => {
  const texts = { 'איך מזמינים': 'שלום [שם], התפריט מצורף.\n[קובץ: תפריט]\n[שם המציג]' };
  const d = due(plan({ texts, me: { ...me, fills: { 'קובץ: תפריט': 'file:ex/1.pdf#' + encodeURIComponent('תפריט.pdf') } } }), FAIR, []);
  assert.equal(d.length, 1);
  assert.equal(d[0]!.body, 'שלום יעקב, התפריט מצורף.\nיצחק');
  assert.deepEqual(d[0]!.files, ['ex/1.pdf#' + encodeURIComponent('תפריט.pdf')]);
});

test('once only: what is planned is not planned again', () => {
  assert.equal(due(plan({ planned: ['a|how'] }), FAIR, []).length, 0);
});

test('not before the card settled, not with nowhere to send it by WhatsApp', () => {
  assert.equal(due(plan({ leads: [{ ...lead, settled: false }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ leads: [{ ...lead, targets: 0 }] }), FAIR, []).length, 0); // no number, none with WhatsApp, or all switched off
  assert.equal(due(plan({ leads: [{ ...lead, targets: 2 }] }), FAIR, []).length, 1);  // his and his wife's: one step, queued to both
});

test('a hole in the text: nothing goes out; a detail written once fills it', () => {
  const texts = { 'איך מזמינים': 'שלום [שם], הכתובת: [כתובת]' };
  assert.equal(due(plan({ texts }), FAIR, []).length, 0);
  const d = due(plan({ texts, me: { ...me, fills: { 'כתובת': 'רחוב השומר 5' } } }), FAIR, []);
  assert.equal(d.length, 1);
  assert.match(d[0]!.body, /הכתובת: רחוב השומר 5/);
});

test('overdue is left to the exhibitor; the next step is his own call, not a message', () => {
  assert.equal(due(plan(), '2026-11-18', []).length, 0); // the message was due on the 16th
  assert.equal(due(plan({ steps: [{ lead_id: 'a', step_id: 'how', done_on: FAIR, outcome: 'noAnswer' }] }), '2026-11-19', []).length, 0);
});

test('mail carries the path where WhatsApp cannot: no WhatsApp, not linked, or stopped', () => {
  const noWa = { ...lead, targets: 0, mails: 1 };
  assert.equal(due(plan({ leads: [noWa] }), FAIR, []).length, 0);                                  // mail not set: nothing
  assert.equal(due(plan({ leads: [noWa] }), FAIR, [], { wa: false, mail: true }).length, 1);       // mail set, WhatsApp not linked
  assert.equal(due(plan({ me: { ...me, blocked: true } }), FAIR, [], { wa: true, mail: true }).length, 0); // stopped, and he has no mail
  assert.equal(due(plan({ me: { ...me, blocked: true }, leads: [{ ...lead, mails: 1 }] }), FAIR, [], { wa: true, mail: true }).length, 1);
});

test('a reply or "הסר" stops it; a blocked number plans nothing', () => {
  assert.equal(due(plan({ replies: [{ lead_id: 'a', at: '2026-11-16T09:00:00Z', optout: false }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ replies: [{ lead_id: 'a', at: '2026-11-16T09:00:00Z', optout: true }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ me: { ...me, blocked: true } }), FAIR, []).length, 0);
});
