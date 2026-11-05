// The engine against setups taken from the 109-business rounds. The expo is Monday 16/11/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choosePath, detailsIn, goOnId, undecided, fileValue, filesIn, fill, holes, immediateMessage, isRestDay, nextOccurrence, nextTask, settle, withoutWa } from '../src/index.ts';
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
  l.history.push(rec('call', '2026-11-17'), rec(goOnId('call'), '2026-11-17'));   // no answer, and he chose to go on
  assert.equal((nextTask(shtreimel, l, '2026-11-17') as { dueOn: string }).dueOn, '2026-11-22'); // +3 = Friday → Sunday
  l.history.push(rec('again', '2026-11-22'), rec(goOnId('again'), '2026-11-22'));
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
  l.history.push(rec('purim', '2027-03-24'), rec(goOnId('purim'), '2027-03-24'));
  assert.equal((nextTask(ac, l, '2027-03-24') as { dueOn: string }).dueOn, '2027-04-07');
  l.history.push(rec('again', '2027-04-07'), rec(goOnId('again'), '2027-04-07'));
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
  const l = lead(['הרחבה'], { history: [rec('call', '2026-11-23'), rec(goOnId('call'), '2026-11-23')] });
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

// ---- "לא ענה" (יצחק, 5/11): the exhibitor decides per visitor whether to try again; giving up ends the path

test('no answer and trying again: the retry is his own step, it comes first, and the path waits for it', () => {
  const l = lead(['שטריימל לחתן'], { history: [rec('invite', '2026-11-17'), rec('call', '2026-11-23')], manual: [{ id: 'r1', action: 'talk', who: 'me', dueOn: '2026-11-24' }] });
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-23'), { kind: 'task', stepId: 'm:r1', action: 'talk', who: 'me', message: undefined, dueOn: '2026-11-24', late: false });
  // No answer again, and he tries once more: the same way, a step of its own.
  l.history.push(rec('m:r1', '2026-11-24'));
  l.manual!.push({ id: 'r2', action: 'talk', who: 'me', dueOn: '2026-11-26' });
  assert.equal((nextTask(shtreimel, l, '2026-11-24') as { stepId: string }).stepId, 'm:r2');
});

test('no answer on a call of his: no default, he waits for a decision; a send or a "done" goes on as before', () => {
  const l = lead(['שטריימל לחתן'], { history: [rec('invite', '2026-11-17'), rec('call', '2026-11-23')] });
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-23'), { kind: 'end', reason: 'decide' });
  assert.deepEqual(undecided(shtreimel, l), { stepId: 'call', retry: 'talk' });
  // The automatic invite marked "noAnswer" (= sent) did not stop anything: the call came after it.
  assert.equal(undecided(shtreimel, lead(['שטריימל לחתן'], { history: [rec('invite', '2026-11-17')] })), null);
  // A try again set by hand answers it; so does going on with the path.
  assert.equal(undecided(shtreimel, { ...l, manual: [{ id: 'r1', action: 'talk', who: 'me', dueOn: '2026-11-25' }] }), null);
  const on = { ...l, history: [...l.history, rec(goOnId('call'), '2026-11-24')] };
  assert.deepEqual(nextTask(shtreimel, on, '2026-11-24'), { kind: 'end', reason: 'list' });
  // A meeting he did not come to: the try again is a call.
  const met = lead(['מיזוג למוסד', 'עכשיו'], { history: [rec('visit', '2026-11-17')] });
  assert.deepEqual(undecided(ac, met), { stepId: 'visit', retry: 'talk' });
});

test('giving up ends the path at once; a mailing list it ends on keeps him', () => {
  // The wedding variant: a call, again after three days, then the list. He gives up after the first call.
  const l = lead(['שטריימל לחתן', 'יש חתונה (מתי?)'], { customerDate: '2027-01-10', history: [rec('call', '2026-11-17', 'gaveUp')] });
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-17'), { kind: 'end', reason: 'list' });
  // A path that ends without a list, or a sensitive business without consent: nothing.
  const stop: Setup = setup({ needs: [{ label: 'x', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [
    { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 1 } },
    { id: 'mail', action: 'send', who: 'auto', message: 'm', timing: { kind: 'after', days: 3 } },
  ], end: { kind: 'stop' } } }] }] });
  assert.deepEqual(nextTask(stop, lead(['x'], { history: [rec('call', '2026-11-17', 'gaveUp')] }), '2026-11-17'), { kind: 'end', reason: 'stop' });
  assert.deepEqual(nextTask({ ...shtreimel, sensitive: true }, l, '2026-11-17'), { kind: 'end', reason: 'stop' });
});

test('giving up on a retry ends it too, and a reply that comes after it still comes first', () => {
  const l = lead(['שטריימל לחתן'], { history: [rec('invite', '2026-11-17'), rec('call', '2026-11-23'), rec('m:r1', '2026-11-24', 'gaveUp')], manual: [{ id: 'r1', action: 'talk', who: 'me', dueOn: '2026-11-24' }] });
  assert.deepEqual(nextTask(shtreimel, l, '2026-11-24'), { kind: 'end', reason: 'list' });
  l.repliedOn = '2026-11-26';
  const n = nextTask(shtreimel, l, '2026-11-26') as { stepId: string; reply?: boolean };
  assert.equal(n.stepId, 'reply:2026-11-26');
  assert.equal(n.reply, true);
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

// ---- a message chosen at the booth (יצחק, 28/10): it goes first, and it replaces the path's immediate message

test('the booth choice goes out first and replaces the immediate message of the path', () => {
  const s = setup({ needs: [{ label: 'משלוחים', goal: 'primary', relation: 'customer', variants: [{ path: { steps: [
    { id: 'how', action: 'send', who: 'auto', timing: { kind: 'after', days: 0 }, message: 'איך מזמינים' },
    { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 3 } },
  ], end: { kind: 'list' } } }] }] });
  const plain = lead(['משלוחים']);
  assert.equal(immediateMessage(s, plain), 'איך מזמינים');
  const n0 = nextTask(s, plain, EXPO);
  assert.equal(n0.kind === 'task' && n0.message, 'איך מזמינים');
  // He chose the price list at the booth: it goes, and "how to order" does not.
  const chose = lead(['משלוחים'], { booth: { message: 'מחירון' } });
  const n1 = nextTask(s, chose, EXPO);
  assert.equal(n1.kind === 'task' && n1.stepId, 'booth');
  assert.equal(n1.kind === 'task' && n1.message, 'מחירון');
  const after = { ...chose, history: [rec('booth', EXPO)] };
  const n2 = nextTask(s, after, EXPO);
  assert.equal(n2.kind === 'task' && n2.stepId, 'call'); // straight to his own call; nothing else went out
  // "None now": no immediate message at all.
  const none = lead(['משלוחים'], { booth: {} });
  const n3 = nextTask(s, none, EXPO);
  assert.equal(n3.kind === 'task' && n3.stepId, 'call');
});

test('a detail written once fills every message; what is still empty stays a hole', () => {
  const me = { name: 'יצחק', business: 'שטריימלך', phone: '050-0000000', greeting: 'shalom' as const, sensitive: false, fills: { 'כתובת': 'רחוב השומר 5', 'שעות': ' ' } };
  const body = 'שלום [שם], אנחנו ב[כתובת], [שעות].\n[שם המציג], [העסק] · [טלפון]';
  assert.deepEqual(detailsIn(body), ['כתובת', 'שעות']); // [שם], [שם המציג], [העסק], [טלפון] are filled by the system
  const out = fill(body, me, 'יעקב');
  assert.ok(out.includes('אנחנו ברחוב השומר 5, [שעות].'));
  assert.deepEqual(holes(out), ['[שעות]']); // blank counts as empty
});

test('a detail that is a file: its line leaves the text, and the file goes with the message', () => {
  const file = fileValue({ path: 'ex1/abc.pdf', name: 'מחירון חורף.pdf' });
  const me = { name: 'יצחק', business: 'שטריימלך', phone: '050-0000000', greeting: 'shalom' as const, sensitive: false, fills: { 'קובץ: מחירון': file, 'כתובת': 'רחוב השומר 5' } };
  const body = 'שלום [שם], המחירון מצורף.\n[קובץ: מחירון]\nאנחנו ב[כתובת].\n[שם המציג], [העסק] · [טלפון]';
  const out = fill(body, me, 'יעקב');
  assert.equal(out, 'שלום יעקב, המחירון מצורף.\nאנחנו ברחוב השומר 5.\nיצחק, שטריימלך · 050-0000000');
  assert.deepEqual(filesIn(body, me), [{ path: 'ex1/abc.pdf', name: 'מחירון חורף.pdf' }]);
  assert.equal(holes(out).length, 0);
});

test('an exhibitor without WhatsApp: the suggested text says nothing of it (31/10)', () => {
  assert.equal(withoutWa('מזמינים בטלפון [טלפון] או בוואטסאפ למספר הזה, עד [שעה], והמשלוח מגיע [מתי].'), 'מזמינים בטלפון [טלפון], עד [שעה], והמשלוח מגיע [מתי].');
  assert.equal(withoutWa('אפשר לשלוח צילום בוואטסאפ. כשיגיעו — נתקשר.'), 'אפשר לשלוח צילום במייל. כשיגיעו — נתקשר.');
  assert.equal(withoutWa('שלום [שם],\nתודה.'), 'שלום [שם],\nתודה.');
});

// ---- the messages beside the path (1/11): the offer, its reminder, the check after an order

test('a message sent beside the path moves none of its dates', () => {
  const s = setup({ defaults: { business: list, private: { steps: [
    { id: 'hi', action: 'send', who: 'auto', timing: { kind: 'after', days: 0 }, message: 'שלום' },
    { id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 3 } },
  ], end: { kind: 'list' } } } });
  const plain = nextTask(s, lead([], { history: [rec('hi', EXPO)] }), '2026-11-17');
  const offered = nextTask(s, lead([], { history: [rec('hi', EXPO), rec('x:offer', '2026-11-17')] }), '2026-11-17');
  assert.deepEqual(offered, plain);
  assert.equal(offered.kind === 'task' && offered.dueOn, '2026-11-19');
});
