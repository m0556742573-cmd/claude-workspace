// The planner: an automatic message is queued on its day, once; never with a hole, never overdue, never before the
// card settled, never to someone without WhatsApp, after a reply, or after "הסר".
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
const lead = { id: 'a', captured_on: FAIR, taps: ['משלוחים'], customer_date: null, business_owner: false, setup_version: null, name: 'יעקב', has_phone: true, has_whatsapp: null, settled: true, booth_message: null, booth_none: false, booth_to: null };
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

test('the booth choice replaces the immediate message, to another number if asked', () => {
  const texts = { 'איך מזמינים': 'שלום [שם], איך מזמינים', 'מחירון': 'שלום [שם], המחירון' };
  const d = due(plan({ texts, leads: [{ ...lead, booth_message: 'מחירון', booth_to: '0521234567' }] }), FAIR, []);
  assert.equal(d.length, 1);
  assert.equal(d[0]!.step, 'booth');
  assert.equal(d[0]!.to, '0521234567');
  assert.match(d[0]!.body, /המחירון/);
  assert.equal(due(plan({ texts, leads: [{ ...lead, booth_none: true }] }), FAIR, []).length, 0); // none now
});

test('once only: what is planned is not planned again', () => {
  assert.equal(due(plan({ planned: ['a|how'] }), FAIR, []).length, 0);
});

test('not before the card settled, not without a phone, not when he has no WhatsApp', () => {
  assert.equal(due(plan({ leads: [{ ...lead, settled: false }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ leads: [{ ...lead, has_phone: false }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ leads: [{ ...lead, has_whatsapp: false }] }), FAIR, []).length, 0);
});

test('a hole in the text: nothing goes out', () => {
  assert.equal(due(plan({ texts: { 'איך מזמינים': 'שלום [שם], הכתובת: [כתובת]' } }), FAIR, []).length, 0);
});

test('overdue is left to the exhibitor; the next step is his own call, not a message', () => {
  assert.equal(due(plan(), '2026-11-18', []).length, 0); // the message was due on the 16th
  assert.equal(due(plan({ steps: [{ lead_id: 'a', step_id: 'how', done_on: FAIR, outcome: 'noAnswer' }] }), '2026-11-19', []).length, 0);
});

test('a reply or "הסר" stops it; a blocked number plans nothing', () => {
  assert.equal(due(plan({ replies: [{ lead_id: 'a', at: '2026-11-16T09:00:00Z', optout: false }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ replies: [{ lead_id: 'a', at: '2026-11-16T09:00:00Z', optout: true }] }), FAIR, []).length, 0);
  assert.equal(due(plan({ me: { ...me, blocked: true } }), FAIR, []).length, 0);
});
