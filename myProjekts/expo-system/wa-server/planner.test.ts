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

// The expo offer beside the path (model §14א; my choice 1/11): the day after the visit on a day the path is quiet, a
// reminder the day before it ends, never after a reply or an order; a week after an order, a check. The path's dates
// stay where they were.
const offer = { name: 'חנוכה', until: '2026-11-20', items: [{ id: '1', name: 'סל שי', price: 100, expoPrice: 80 }] };
const sentHow = { lead_id: 'a', step_id: 'how', done_on: FAIR, outcome: 'noAnswer' as const };

test('the offer goes the day after the visit, not on it, and says until when', () => {
  const p = plan({ offer, steps: [sentHow], planned: ['a|how'] });
  assert.equal(due(p, FAIR, []).length, 0);
  const d = due(p, '2026-11-17', []);
  assert.equal(d.length, 1);
  assert.equal(d[0]!.step, 'x:offer');
  assert.match(d[0]!.body, /^שלום יעקב,\nהמבצע "חנוכה" מהתערוכה בתוקף עד 20\/11:\n• סל שי · 80 ₪ במקום 100 ₪/);
});

test('the offer waits for a day the path sends nothing', () => {
  const two: Setup = { ...setup, needs: [{ ...setup.needs[0]!, variants: [{ path: { steps: [
    { id: 'how', action: 'send', who: 'auto', timing: { kind: 'after', days: 0 }, message: 'איך מזמינים' },
    { id: 'again', action: 'send', who: 'auto', timing: { kind: 'after', days: 1 }, message: 'איך מזמינים' },
  ], end: { kind: 'list' } } }] }] };
  const p = plan({ offer, setups: [{ version: 1, active: true, data: two }], steps: [sentHow], planned: ['a|how'] });
  assert.deepEqual(due(p, '2026-11-17', []).map((x) => x.step), ['again']);
  const after = plan({ offer, setups: [{ version: 1, active: true, data: two }], planned: ['a|how', 'a|again'],
    steps: [sentHow, { lead_id: 'a', step_id: 'again', done_on: '2026-11-17', outcome: 'noAnswer' }] });
  assert.equal(due(after, '2026-11-17', []).length, 0); // the path's message went today
  assert.deepEqual(due(after, '2026-11-18', []).map((x) => x.step), ['x:offer']);
});

test('the reminder goes the day before the offer ends, two days or more after it', () => {
  const steps = [sentHow, { lead_id: 'a', step_id: 'x:offer', done_on: '2026-11-17', outcome: 'noAnswer' as const }];
  const p = plan({ offer, steps, planned: ['a|how', 'a|x:offer'] });
  assert.equal(due(p, '2026-11-18', []).length, 0);
  const d = due(p, '2026-11-19', []);
  assert.deepEqual(d.map((x) => x.step), ['x:offer-reminder']);
  assert.match(d[0]!.body, /להזכיר, המבצע "חנוכה" מהתערוכה בתוקף רק עד מחר:/);
  const late = plan({ offer, steps: [sentHow, { ...steps[1]!, done_on: '2026-11-18' }], planned: ['a|how', 'a|x:offer'] });
  assert.equal(due(late, '2026-11-19', []).length, 0); // the offer only yesterday: no reminder on its heels
});

test('no offer when it stays at the booth, ends that day, after a reply, or once he talked', () => {
  const base = { steps: [sentHow], planned: ['a|how'] };
  assert.equal(due(plan({ ...base, offer: { ...offer, send: false } }), '2026-11-17', []).length, 0);
  assert.equal(due(plan({ ...base, offer: { ...offer, until: FAIR } }), '2026-11-17', []).length, 0);
  assert.equal(due(plan({ ...base, offer, replies: [{ lead_id: 'a', at: '2026-11-16T12:00:00Z', optout: false }] }), '2026-11-17', []).length, 0);
  assert.equal(due(plan({ offer, steps: [{ ...sentHow, outcome: 'engaged' }], planned: ['a|how'] }), '2026-11-17', []).length, 0);
});

test('after an order: its summary, and a week on a check, once', () => {
  const order = { offer: 'חנוכה', items: [{ id: '1', name: 'סל שי', qty: 2, price: 80 }], total: 160 };
  const ordered = { leads: [{ ...lead, booth_order: order }], steps: [{ lead_id: 'a', step_id: 'order', done_on: FAIR, outcome: 'closed' as const }] };
  assert.deepEqual(due(plan({ offer, ...ordered }), FAIR, []).map((x) => x.step), ['order']);
  assert.equal(due(plan({ offer, ...ordered, planned: ['a|order'] }), '2026-11-22', []).length, 0);
  const d = due(plan({ offer, ...ordered, planned: ['a|order'] }), '2026-11-23', []);
  assert.deepEqual(d.map((x) => x.step), ['x:order-check']);
  assert.match(d[0]!.body, /ההזמנה מהתערוכה הגיעה/);
  assert.equal(due(plan({ offer, ...ordered, planned: ['a|order', 'a|x:order-check'] }), '2026-11-23', []).length, 0);
});

// ---- the morning message (5/11, the bug in ב1): from the engine on what the server holds, not from the app's table

test('the morning list: the call after an automatic send is there, and who waits for a decision is counted', async () => {
  const { morningOf } = await import('./planner.ts');
  // The automatic message went on the fair's day (the server recorded it); the call is three days later.
  const sent = plan({ steps: [{ lead_id: 'a', step_id: 'how', done_on: FAIR, outcome: 'noAnswer' }] });
  assert.deepEqual(morningOf(sent, '2026-11-18').tasks, []);
  const m = morningOf(sent, '2026-11-19');
  assert.deepEqual(m.tasks, [{ name: 'יעקב', action: 'talk', message: null, late: false, due: '2026-11-19' }]);
  assert.equal(m.waiting, 0);
  // A day later and not done: late, with the day it was due.
  assert.deepEqual(morningOf(sent, '2026-11-22').tasks[0], { name: 'יעקב', action: 'talk', message: null, late: true, due: '2026-11-19' });
  // He called and did not get through, and chose nothing yet: no task, and he is counted as waiting for a decision.
  const missed = plan({ steps: [...sent.steps, { lead_id: 'a', step_id: 'call', done_on: '2026-11-19', outcome: 'noAnswer' }] });
  assert.deepEqual(morningOf(missed, '2026-11-20'), { tasks: [], waiting: 1 });
  // "הסר" ends it: nothing.
  assert.deepEqual(morningOf(plan({ ...sent, replies: [{ lead_id: 'a', at: '2026-11-17T08:00:00Z', optout: true }] }), '2026-11-19'), { tasks: [], waiting: 0 });
});
