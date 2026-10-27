// Editing the setup by hand: the card's buttons and the timing of each step. Every change makes a new setup
// (the old one stays as a version on the server), and a renamed button is renamed everywhere a path asks about it.
import type { Condition, Path, Setup } from '@expo/engine';

export type Group = 'needs' | 'when' | 'who';

function renameIn(c: Condition, from: string, to: string): Condition {
  if ('tapped' in c) return c.tapped === from ? { tapped: to } : c;
  if ('all' in c) return { all: c.all.map((x) => renameIn(x, from, to)) };
  if ('any' in c) return { any: c.any.map((x) => renameIn(x, from, to)) };
  return { not: renameIn(c.not, from, to) };
}
function eachPath(s: Setup, f: (p: Path) => Path): Setup {
  return {
    ...s,
    needs: s.needs.map((n) => ({ ...n, variants: n.variants.map((v) => ({ ...v, path: f(v.path) })) })),
    defaults: { business: f(s.defaults.business), private: f(s.defaults.private) },
  };
}

export const labels = (s: Setup): string[] => [...s.needs.map((n) => n.label), ...s.when.map((b) => b.label), ...s.who.map((b) => b.label)];

export function rename(s: Setup, from: string, to: string): Setup {
  const t = to.trim();
  if (!t || t === from || labels(s).includes(t)) return s;
  const r = <T extends { label: string }>(x: T): T => (x.label === from ? { ...x, label: t } : x);
  const next: Setup = { ...s, needs: s.needs.map(r), when: s.when.map(r), who: s.who.map(r) };
  const re = (c?: Condition) => (c ? renameIn(c, from, t) : c);
  const done = eachPath(next, (p) => ({ ...p, steps: p.steps.map((st) => (st.onlyIf ? { ...st, onlyIf: re(st.onlyIf) } : st)) }));
  return { ...done, needs: done.needs.map((n) => ({ ...n, variants: n.variants.map((v) => (v.if ? { ...v, if: re(v.if) } : v)) })) };
}

/** A button out of the card. A path that asked about it simply never meets it again. */
export function remove(s: Setup, group: Group, label: string): Setup {
  if (group === 'needs') return { ...s, needs: s.needs.filter((n) => n.label !== label) };
  return { ...s, [group]: s[group].filter((b) => b.label !== label) };
}

/** A new button. A new need starts with a call from him three days after the fair, then the mailing list. */
export function add(s: Setup, group: Group, label: string, effect = ''): Setup {
  const t = label.trim();
  if (!t || labels(s).includes(t)) return s;
  if (group === 'needs') {
    return { ...s, needs: [...s.needs, { label: t, goal: 'secondary', relation: 'customer', variants: [{ path: { steps: [{ id: 'call', action: 'talk', who: 'me', timing: { kind: 'after', days: 3 } }], end: { kind: 'list' } } }] }] };
  }
  return { ...s, [group]: [...s[group], { label: t, effect: effect.trim() }] };
}

/** Where a path sits: a need's variant, or one of the two defaults. */
export type At = { need: number; variant: number } | { default: 'business' | 'private' };

export function pathAt(s: Setup, at: At): Path {
  return 'need' in at ? s.needs[at.need]!.variants[at.variant]!.path : s.defaults[at.default];
}
function withPath(s: Setup, at: At, p: Path): Setup {
  if ('need' in at) return { ...s, needs: s.needs.map((n, i) => (i !== at.need ? n : { ...n, variants: n.variants.map((v, j) => (j !== at.variant ? v : { ...v, path: p })) })) };
  return { ...s, defaults: { ...s.defaults, [at.default]: p } };
}

/** The number of days of one step: after the step before it, or before/after the visitor's own date, or a holiday. */
export function setDays(s: Setup, at: At, index: number, days: number): Setup {
  const p = pathAt(s, at);
  const steps = p.steps.map((st, i) => {
    if (i !== index || st.timing.kind === 'weekday') return st;
    return { ...st, timing: { ...st.timing, days } };
  });
  return withPath(s, at, { ...p, steps });
}

export function setGoal(s: Setup, label: string): Setup {
  return { ...s, needs: s.needs.map((n) => ({ ...n, goal: n.label === label ? 'primary' : 'secondary' })) };
}
