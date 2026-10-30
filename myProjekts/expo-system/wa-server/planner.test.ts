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

test('the trial fast clock: a day goes by in a minute from his registration, and a step a little late still goes', () => {
  const two: Setup = { ...setup, needs: [{ ...setup.needs[0]!, variants: [{ path: { steps: [
    { id: 'how', action: 'send', who: 'auto', timing: { kind: 'after', days: 0 }, message: 'איך מזמינים' },
    { id: 'again', action: 'send', who: 'auto', timing: { kind: 'after', days: 2 }, message: 'איך מזמינים' },
  ], end: { kind: 'list' } } }] }] };
  const at = Date.parse('2026-11-16T10:00:00Z');
  const setups = [{ version: 1, active: true, data: two }];
  const trial = (over: Partial<Plan> = {}) => plan({ setups, leads: [{ ...lead, captured_at: new Date(at).toISOString() }], ...over });
  const fast = (min: number) => ({ now: at + min * 60_000, minutesPerDay: 1 });
  const first = due(trial(), FAIR, [], undefined, fast(0));
  assert.equal(first[0]?.step, 'how');
  assert.equal(first[0]!.virtual, FAIR);
  // It went out on fast day 1; the next comes two fast days later, and the fast day is what the step keeps.
  const steps = [{ lead_id: 'a', step_id: 'how', done_on: FAIR, virtual_on: '2026-11-17', outcome: 'noAnswer' as const }];
  assert.equal(due(trial({ steps, planned: ['a|how'] }), FAIR, [], undefined, fast(2)).length, 0);
  const next = due(trial({ steps, planned: ['a|how'] }), FAIR, [], undefined, fast(3));
  assert.equal(next[0]?.step, 'again');
  assert.equal(next[0]!.virtual, '2026-11-19');
  // The real clock ignores the fast one.
  assert.equal(due(plan({ setups, steps, planned: ['a|how'] }), FAIR, []).length, 0);
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

test('a day late still goes (30/10); more than that is left to the exhibitor', () => {
  assert.equal(due(plan(), '2026-11-17', []).length, 1); // due on the 16th: a visitor of the fair's evening
  assert.equal(due(plan(), '2026-11-18', []).length, 0); // two days late
  assert.equal(due(plan({ steps: [{ lead_id: 'a', step_id: 'how', done_on: FAIR, outcome: 'noAnswer' }] }), '2026-11-20', []).length, 0);
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
