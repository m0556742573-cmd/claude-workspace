// How many messages would go out on their own on one day (יצחק, 28/10: "שאין אפשרות לשליחה לכמות של אנשים בבום").
// For every business in the fixtures: N visitors registered on the day of the fair, each with random taps, and nobody
// ever answers (the worst case: every step of every path happens). Prints the busiest days of automatic sends.
// Run: node tools/burst.ts [visitors=150]
import { fixtures } from '../fixtures/businesses.ts';
import { nextTask } from '../src/engine.ts';
import { addDays } from '../src/calendar.ts';
import type { Lead, Setup } from '../src/model.ts';

const N = Number(process.argv[2] ?? 150);
const FAIR = '2026-11-16';
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: T[], p: number) => xs.filter(() => rnd() < p);

function visitor(setup: Setup, i: number): Lead {
  const taps = [
    ...pick(setup.needs.map((n) => n.label), 0.45),
    ...pick(setup.when.map((b) => b.label), 0.35).slice(0, 1),
    ...pick(setup.who.map((b) => b.label), 0.35).slice(0, 1),
  ];
  const dated = taps.some((t) => t.includes('מתי?'));
  return {
    id: `v${i}`, capturedOn: FAIR, taps, businessOwner: rnd() < 0.3, history: [],
    customerDate: dated ? addDays(FAIR, 20 + Math.floor(rnd() * 300)) : undefined,
  };
}

/** Every automatic step the path would take for this visitor if he never answers. */
function autoSends(setup: Setup, lead: Lead): { on: string; message: string }[] {
  const out: { on: string; message: string }[] = [];
  let today = lead.capturedOn;
  for (let i = 0; i < 30; i++) {
    const n = nextTask(setup, lead, today);
    if (n.kind !== 'task') break;
    if (n.who === 'auto') out.push({ on: n.dueOn, message: n.message ?? `(${n.action})` });
    lead.history.push({ stepId: n.stepId, doneOn: n.dueOn, outcome: 'noAnswer' });
    today = n.dueOn;
  }
  return out;
}

const rows: { name: string; total: number; peak: number; day: string; same: number; msg: string; days: number }[] = [];
for (const f of fixtures) {
  const byDay = new Map<string, Map<string, number>>();
  let total = 0;
  for (let i = 0; i < N; i++) {
    for (const s of autoSends(f.setup, visitor(f.setup, i))) {
      total++;
      const day = byDay.get(s.on) ?? byDay.set(s.on, new Map()).get(s.on)!;
      day.set(s.message, (day.get(s.message) ?? 0) + 1);
    }
  }
  let peak = 0, pday = '', same = 0, msg = '';
  for (const [d, m] of byDay) {
    const n = [...m.values()].reduce((a, b) => a + b, 0);
    if (n > peak) { peak = n; pday = d; const top = [...m].sort((a, b) => b[1] - a[1])[0]!; same = top[1]; msg = top[0]; }
  }
  rows.push({ name: f.name, total, peak, day: pday, same, msg, days: byDay.size });
}
rows.sort((a, b) => b.peak - a.peak);
// The WhatsApp server sends at most CAP first messages a day per number (wa-server/limits.ts): the rest wait for the next days.
const CAP = Number(process.argv[3] ?? 25);
console.log(`${N} visitors on ${FAIR}, nobody answers. Automatic sends per business (cap ${CAP} first messages a day):`);
for (const r of rows) {
  console.log(`${String(r.peak).padStart(4)} on ${r.day || '-'} (same text ${r.same}: ${r.msg.slice(0, 40)}) · ${r.total} in all over ${r.days} days · with the cap: ${Math.ceil(r.peak / CAP) || 0} days · ${r.name}`);
}
