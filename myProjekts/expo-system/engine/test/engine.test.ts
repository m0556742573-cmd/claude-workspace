// The engine against setups taken from the 109-business rounds. The expo is Monday 16/11/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choosePath, isRestDay, nextOccurrence, nextTask, settle } from '../src/index.ts';
import type { Lead, Path, Setup, StepRecord } from '../src/index.ts';

const EXPO = '2026-11-16';
const list: Path = { steps: [], end: { kind: 'list' } };

function setup(over: Partial<Setup>): Setup {
  return { business: '', anchor: { goal: '', success: '' }, needs: [], when: [], who: [], defaults: { business: list, private: list }, sensitive: false, ...over };
}
function lead(taps: string[], over: Partial<Lead> = {}): Lead {
  return { id: 'l1', capturedOn: EXPO, taps, businessOwner: false, history: [], ...over };
}
const rec = (stepId: string, doneOn: string, outcome: StepRecord['outcome'] = 'noAnswer'): StepRecord => ({ stepId, doneOn, outcome });

// ---- the calendar

test('Shabbat and Yom Tov (Israel) are rest days', () => {
  assert.equal(isRestDay('2026-11-21'), true); // Shabbat
  assert.equal(isRestDay('2027-04-22'), true); // Pesach, a Thursday
  assert.equal(isRestDay('2026-11-17'), false);
});

test('the next occurrence of a point in the Jewish year, from the expo', () => {
  assert.equal(nextOccurrence({ holiday: 'chanukah' }, EXPO), '2026-12-05');
  assert.equal(nextOccurrence({ holiday: 'purim' }, EXPO), '2027-03-23'); // 5787 is a leap year: Adar II
  assert.equal(nextOccurrence({ month: 'sivan', day: 1 }, EXPO), '2027-06-06');
});

test('calls are not on Friday; sends may be; nothing on Shabbat', () => {
  assert.equal(settle('2026-11-20', 'talk', 'me'), '2026-11-22'); // Friday → Sunday
  assert.equal(settle('2026-11-20', 'send', 'auto'), '2026-11-20');
  assert.equal(settle('2026-11-21', 'send', 'auto'), '2026-11-22');
});

// ---- 1. Shtreimel: a wedding date changes the first step; the renewal gets its own path

const shtreimel = setup({
  needs: [
    { label: 'שטריימל לחתן', goal: 'primary', relation: 'customer', variants: [
      { if: { tapped: 'יש חתונה (מתי?)' }, path: { steps: [
        { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 1 } },
        { id: 'again', action: 'talk', who: 'me', timing: { kind: 'after', days: 3 } },
      ], end: { kind: 'list' } } },
      { path: { steps: [
        { id: 'invite', action: 'send', who: 'auto', message: 'הזמנה למדידה', timing: { kind: 'after', days: 1 } },
        { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 7 } },
      ], end: { kind: 'list' } } },
    ] },
    { label: 'חידוש שטריימל', goal: 'secondary', relation: 'customer', variants: [{ path: { steps: [
      { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 3 } },
    ], end: { kind: 'list' } } }] },
  ],
});

test('with a wedding date: a call the next day, again after three days, then the mailing list', () => {
  const l = lead(['שטריימל לחתן', 'יש חתונה (מתי?)'], { customerDate: '2027-01-10' });
  assert.deepEqual(nextTask(shtreimel, l, EXPO), { kind: 'task', stepId: 'call', action: 'talk', who: 'me', message: undefined, dueOn: '2026-11-17', late: false });
  l.history.push(rec('call', '2026-11-17'));
  assert.equal((nextTask(shtreimel, l, '2026-11-17') as { dueOn: string }).dueOn, '2026-11-22'); // +3 = Friday → Sunday
  l.history.push(rec('again', '2026-11-22'));
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-22'), { kind: 'end', reason: 'list' });
});

test('an answer stops the ladder', () => {
  const l = lead(['שטריימל לחתן'], { history: [rec('invite', '2026-11-17', 'engaged')] });
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-18'), { kind: 'end', reason: 'engaged' });
});

test('the primary goal leads when both needs were tapped; a secondary need alone has its own path', () => {
  assert.equal(choosePath(shtreimel, lead(['חידוש שטריימל', 'שטריימל לחתן'])).source, 'שטריימל לחתן');
  assert.equal(choosePath(shtreimel, lead(['חידוש שטריימל'])).source, 'חידוש שטריימל');
});

test('nothing tapped: business owner and private visitor get their own defaults', () => {
  const s = setup({ defaults: { business: { steps: [{ id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 7 } }], end: { kind: 'list' } }, private: list } });
  assert.equal(choosePath(s, lead([], { businessOwner: true })).path.steps.length, 1);
  assert.deepEqual(nextTask(s, lead([]), EXPO), { kind: 'end', reason: 'list' });
});

// ---- 46. Butcher: an automatic offer every Wednesday before Shabbat, three times

test('a weekday step: three Wednesdays, then the mailing list', () => {
  const s = setup({ needs: [{ label: 'הזמנה שבועית', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [1, 2, 3].map((n) => (
    { id: `wed${n}`, action: 'send' as const, who: 'auto' as const, message: `הזמנה ראשונה בהנחה ${n}`, timing: { kind: 'weekday' as const, weekday: 3 } })), end: { kind: 'list' } } }] }] });
  const l = lead(['הזמנה שבועית']);
  const due: string[] = [];
  for (let i = 0; i < 3; i++) {
    const n = nextTask(s, l, EXPO) as { stepId: string; dueOn: string };
    due.push(n.dueOn);
    l.history.push(rec(n.stepId, n.dueOn));
  }
  assert.deepEqual(due, ['2026-11-18', '2026-11-25', '2026-12-02']);
  assert.deepEqual(nextTask(s, l, '2026-12-02'), { kind: 'end', reason: 'list' });
});

// ---- 65. Air conditioning: the season anchor ("after Purim"), and "broken now" goes first

const ac = setup({ needs: [{ label: 'מיזוג למוסד', goal: 'primary', relation: 'customer', variants: [
  { if: { tapped: 'עכשיו' }, path: { steps: [{ id: 'visit', action: 'meet', who: 'me', timing: { kind: 'after', days: 1 } }], end: { kind: 'stop' } } },
  { path: { steps: [
    { id: 'purim', action: 'talk', who: 'me', timing: { kind: 'calendar', anchor: { holiday: 'purim' }, days: 1 } },
    { id: 'again', action: 'talk', who: 'me', timing: { kind: 'after', days: 14 } },
    { id: 'shavuot', action: 'talk', who: 'me', timing: { kind: 'calendar', anchor: { holiday: 'shavuot' }, days: -14 } },
  ], end: { kind: 'stop' } } },
] }] });

test('after Purim, again after two weeks, and before Shavuot', () => {
  const l = lead(['מיזוג למוסד', 'לקיץ הבא']);
  assert.equal((nextTask(ac, l, EXPO) as { dueOn: string }).dueOn, '2027-03-24');
  l.history.push(rec('purim', '2027-03-24'));
  assert.equal((nextTask(ac, l, '2027-03-24') as { dueOn: string }).dueOn, '2027-04-07');
  l.history.push(rec('again', '2027-04-07'));
  assert.equal((nextTask(ac, l, '2027-04-07') as { dueOn: string }).dueOn, '2027-05-30'); // 14 days before 11/6
});

test('broken now: a visit the next day, not after Purim', () => {
  assert.equal((nextTask(ac, lead(['מיזוג למוסד', 'עכשיו']), EXPO) as { stepId: string }).stepId, 'visit');
});

// ---- 19. Fire doors: a free visit only to an institution with a fire-department demand

test('a step with a condition is skipped for whoever does not fit', () => {
  const s = setup({ needs: [{ label: 'דלתות אש', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [
    { id: 'visit', action: 'meet', who: 'me', timing: { kind: 'after', days: 3 }, onlyIf: { all: [{ tapped: 'מוסד' }, { tapped: 'יש דרישה מכיבוי אש' }] } },
    { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 7 } },
  ], end: { kind: 'stop' } } }] }] });
  assert.equal((nextTask(s, lead(['דלתות אש', 'מוסד', 'יש דרישה מכיבוי אש']), EXPO) as { stepId: string }).stepId, 'visit');
  assert.equal((nextTask(s, lead(['דלתות אש', 'פרטי']), EXPO) as { stepId: string }).stepId, 'call');
});

// ---- 35. Renovations: a decision of a year; one call is not a path

test('a long-term check every three months, four times, then stop', () => {
  const s = setup({ needs: [{ label: 'הרחבה', goal: 'primary', relation: 'customer', variants: [{ path: {
    steps: [{ id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 7 } }],
    end: { kind: 'repeat', everyDays: 90, times: 4, action: 'check', who: 'me' },
  } }] }] });
  const l = lead(['הרחבה'], { history: [rec('call', '2026-11-23')] });
  const n = nextTask(s, l, '2026-11-23') as { stepId: string; dueOn: string };
  assert.equal(n.stepId, 'repeat:1');
  assert.equal(n.dueOn, '2027-02-21');
  for (let i = 1; i <= 4; i++) l.history.push(rec(`repeat:${i}`, '2027-02-21'));
  assert.deepEqual(nextTask(s, l, '2027-02-21'), { kind: 'end', reason: 'stop' });
});

// ---- 59. Men's clothing: a month before the wedding — and a wedding that is closer than that

const clothing = setup({ needs: [{ label: 'הלבשת חתן ומשפחה', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [
  { id: 'month', action: 'send', who: 'auto', message: 'הזמנה לחנות לפני החתונה', timing: { kind: 'customerDate', days: -30 } },
  { id: 'twoWeeks', action: 'send', who: 'auto', message: 'הזמנה לחנות לפני החתונה', timing: { kind: 'customerDate', days: -14 } },
], end: { kind: 'stop' } } }] }] });

test('a wedding in three weeks: the "month before" step is late, so it goes out now and says so', () => {
  const n = nextTask(clothing, lead(['הלבשת חתן ומשפחה'], { customerDate: '2026-12-07' }), EXPO) as { dueOn: string; late: boolean };
  assert.equal(n.dueOn, EXPO);
  assert.equal(n.late, true);
});

test('no date given: the exhibitor is asked to find out when', () => {
  assert.deepEqual(nextTask(clothing, lead(['הלבשת חתן ומשפחה']), EXPO), { kind: 'askDate', stepId: 'month', dueOn: '2026-11-17' });
});

// ---- manual steps: what was agreed after a talk comes before the path

test('after "talked", a step set by hand comes first; a deal ends it all', () => {
  const l = lead(['שטריימל לחתן'], { history: [rec('invite', '2026-11-17', 'engaged')], manual: [{ id: 'a1', action: 'meet', who: 'me', dueOn: '2026-11-24' }] });
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-18'), { kind: 'task', stepId: 'm:a1', action: 'meet', who: 'me', message: undefined, dueOn: '2026-11-24', late: false });
  l.history.push(rec('m:a1', '2026-11-24', 'engaged'));
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-24'), { kind: 'end', reason: 'engaged' });
  l.manual!.push({ id: 'a2', action: 'talk', who: 'me', dueOn: '2026-11-27' });   // Friday → Sunday
  assert.equal((nextTask(shtreimel, l, '2026-11-24') as { dueOn: string }).dueOn, '2026-11-29');
  l.history.push(rec('m:a2', '2026-11-29', 'closed'));
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-29'), { kind: 'end', reason: 'closed' });
});

test('a manual step that is overdue goes out today and says so', () => {
  const l = lead(['שטריימל לחתן'], { manual: [{ id: 'a1', action: 'talk', who: 'me', dueOn: '2026-11-17' }] });
  const n = nextTask(shtreimel, l, '2026-11-23') as { dueOn: string; late: boolean };
  assert.equal(n.dueOn, '2026-11-23');
  assert.equal(n.late, true);
});

// ---- a sensitive business: the mailing list only with consent

test('a sensitive business ends on the mailing list only for whoever consented at the booth', async () => {
  const { CONSENT } = await import('../src/index.ts');
  const s = setup({ sensitive: true });
  assert.deepEqual(nextTask(s, lead([]), EXPO), { kind: 'end', reason: 'stop' });
  assert.deepEqual(nextTask(s, lead([CONSENT]), EXPO), { kind: 'end', reason: 'list' });
  assert.deepEqual(nextTask(setup({}), lead([]), EXPO), { kind: 'end', reason: 'list' });
});

// ---- a reply on WhatsApp (model §9): the path stops, he answers first; answering closes it

test('a reply stops the path and opens a talk for the exhibitor first', () => {
  const s = setup({ needs: [{ label: 'מחירון', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [{ id: 'send', action: 'send', who: 'auto', timing: { kind: 'after', days: 3 } }], end: { kind: 'list' } } }] }] });
  const replied = lead(['מחירון'], { repliedOn: '2026-11-17' });
  const n = nextTask(s, replied, '2026-11-18');
  assert.equal(n.kind, 'task');
  if (n.kind === 'task') { assert.equal(n.reply, true); assert.equal(n.action, 'talk'); assert.equal(n.who, 'me'); assert.equal(n.late, true); assert.equal(n.dueOn, '2026-11-18'); }
  // Answered (engaged): the reply task is done and he is in the exhibitor's hands.
  const answered = { ...replied, history: [rec('reply:2026-11-17', '2026-11-18', 'engaged')] };
  assert.deepEqual(nextTask(s, answered, '2026-11-18'), { kind: 'end', reason: 'engaged' });
  // A new reply later opens a new task, even after engaged.
  const again = { ...answered, repliedOn: '2026-11-25' };
  const n2 = nextTask(s, again, '2026-11-25');
  assert.equal(n2.kind === 'task' && n2.stepId, 'reply:2026-11-25');
});

test('a reply does not reopen a lead who closed or asked to be removed', () => {
  const s = setup({});
  const closed = lead([], { repliedOn: '2026-11-20', history: [rec('x', '2026-11-18', 'closed')] });
  assert.deepEqual(nextTask(s, closed, '2026-11-20'), { kind: 'end', reason: 'closed' });
});
