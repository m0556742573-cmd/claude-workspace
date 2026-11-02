// The consultant's automatic test, on the server (2/11), as in the lab (consultant-lab.html): a simulated exhibitor who
// knows only what the real one approved in the rounds talks to the real consultant (converse), the setup is built as in
// the system (build), and a judge compares it with the approved one. A case written "100:nowa" is an exhibitor without
// WhatsApp: every word of WhatsApp in the conversation, the quick replies or the texts is counted.
// Run on the server: docker exec expo-wa node consult-autotest.ts 35 78 100:nowa
// The result: one line per case here, and everything in /data/consult-autotest/.
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import { EMPTY, GREETING, build, checks, converse, type Draft, type Turn } from './consult.ts';

interface Case { id: number; type: string; greeting: string; profile: Record<string, string>; goals: string; card: string; path: string; capacity: string; untapped: string; messages: string[]; extra: string }
const CASES: Case[] = JSON.parse(await fs.readFile(new URL('../consultant-rounds/autotest-cases.json', import.meta.url), 'utf8'));
const KEY: string = JSON.parse(await fs.readFile(process.env.KEYS_FILE ?? '/data/keys.json', 'utf8')).anthropic_key;
const OUT = process.env.OUT_DIR ?? '/data/consult-autotest';
const MAX_TURNS = 24;
const PERSONA = 'claude-sonnet-5-5'; // the simulated exhibitor: a cheaper model is enough to answer from a list
const JUDGE = 'claude-opus-5-5';
const WA = /וואטסאפ|ווטסאפ|ואטסאפ|וואצאפ|ווצאפ|whatsapp/i;
const AREAS = ['הקו העסקי', 'בדיקה מול העוגן', 'מטרות', 'כרטיס', 'מסלול', 'זמן למעקב', 'מבקר בלי סימון', 'הודעות', 'רגישות'];
const client = new Anthropic({ apiKey: KEY, maxRetries: 2, timeout: 180_000 });
const tokens: Record<string, { input: number; output: number }> = {};
const count = (model: string, input: number, output: number) => {
  const t = (tokens[model] ??= { input: 0, output: 0 });
  t.input += input; t.output += output;
};

// ---------- the lab's simulated exhibitor and judge, word for word (consultant-lab.html), with the setup the system built

function profile(c: Case) {
  const p = c.profile;
  return [`האתגר: ${p.challenge}`, `המטרה בתערוכה: ${p.goal}`, `איך: ${p.how}`, `איך קונים היום: ${p.today}`, `הלקוח הכי טוב: ${p.best}`, `מה פנים מול פנים נותן: ${p.f2f}`, `מה ייחשב הצלחה: ${p.success}`].join('\n');
}
function facts(c: Case) {
  return [`סוג העסק: ${c.type}`, `המטרות: ${c.goals}`, `הכרטיס בדוכן: ${c.card || 'רק השם'}`, `המסלול אחרי התערוכה: ${c.path}`,
    `זמן ביום למעקב: ${c.capacity}`, `מבקר שלא סומן אצלו כלום: ${c.untapped}`, `ההודעות: ${c.messages.join(' · ')}`, c.extra && `מה שחשוב לך: ${c.extra}`].filter(Boolean).join('\n');
}
function transcript(turns: Turn[], me: string) {
  return turns.map((t) => (t.role === 'assistant' ? 'היועץ: ' + t.text + (t.quick?.length ? `\n(כפתורי תשובה: ${t.quick.join(' | ')})` : '') : me + ': ' + t.text)).join('\n\n');
}
function personaInput(c: Case, turns: Turn[], noWa: boolean) {
  return `You play a Haredi business owner, aged 20-55, not technical, busy, setting up his booth for the Belz community business expo with an AI consultant. Stay in character. Write in Hebrew.

WHAT YOU WANT FROM THE EXPO (your real line; this is the truth about your business):
${profile(c)}

DETAILS YOU SETTLED EARLIER (use them for detailed questions: buttons, timing, who does what, messages; where they conflict with the line above, the line above is what you really want):
${facts(c)}
Your first answer to "what is your business and to whom do you sell": ${c.greeting}
${noWa ? '\nYou have no WhatsApp (you said so when you signed up). If he mentions WhatsApp, say briefly that you do not have it.\n' : ''}
HOW TO ANSWER:
- Short, like a busy owner: one or two sentences. Answer only what was asked. Never recite the lists above, never volunteer the whole setup.
- If he asks what would make the expo a success, answer from "what you want from the expo", in your own words.
- Like a real busy owner, you tend to agree with a reasonable proposal even when it is not exactly what you came for. You object only when it clearly contradicts what you want. If he points out that a proposal departs from what you said at the start, answer honestly from your real line.
- Say it in your own words, not the exact wording above.
- If the consultant proposes something that contradicts what you know, correct him briefly. If he proposes something that matches, agree.
- If he asks about something the list does not cover (how people buy from you, who recommends you), answer plausibly, consistent with the list, without new products or customers.
- If he asks something you have no view on, say so briefly ("לא חשבתי על זה, מה אתה מציע?").
- You may answer with one of his quick-reply buttons when one fits exactly.
- When he has shown you a full summary of the setup and you have no more corrections, answer "מאשר, תודה" and set done to true. If the summary has a mistake, correct it (done false).

THE CONVERSATION SO FAR:
${transcript(turns, 'אתה')}

REPLY with ONLY a compact JSON object: {"reply":"your next message, Hebrew","done":false}`;
}
function judgeInput(c: Case, turns: Turn[], draft: Draft, built: unknown) {
  return `You judge a setup consultant for an expo lead system. A simulated exhibitor had a real business line (THE PROFILE) and details settled earlier (THE DETAILS; they may contain drift away from the profile). Compare what the consultant built (FINAL SETUP and the conversation) with them. The profile decides the business line; the details decide only the details that agree with it. Judge meaning, not wording. Write every note in short plain Hebrew.

THE PROFILE:
${profile(c)}

THE DETAILS:
${facts(c)}

FINAL SETUP THE CONSULTANT BUILT (JSON):
${JSON.stringify(draft)}

THE SETUP THE SYSTEM RUNS, BUILT FROM IT, WITH THE MESSAGE TEXTS (JSON):
${JSON.stringify(built)}

THE CONVERSATION:
${transcript(turns, 'המציג')}

For each area give a verdict: "תואם" (same in substance), "חלקי" (part missing or slightly off), "לא תואם" (wrong or missing). Areas: ${AREAS.join(', ')}.
"הקו העסקי" = does the final setup serve the profile's expo goal and success measure (its primary goal, its paths, the timing of the opportunity)? "לא תואם" if it serves a different business line.
"בדיקה מול העוגן" = did the consultant ask early what would make the expo a success, keep it, and, when a proposal departed from it, say so at that moment and let him choose? "לא תואם" if a departure passed without being named, or if he asked "is this on purpose?" about things that did not depart.
"רגישות" = did the consultant respect what is sensitive for this business (what not to write on the card or in messages, discretion); if nothing is sensitive here, "תואם" when he invented no sensitivity problem.
Also list: "invented" — facts, numbers or steps the consultant put in the setup that the exhibitor never said (not inferences the exhibitor confirmed); "craft" — problems in HOW he ran the conversation (more than one question in a turn, asking again what was answered, assuming a season, a quick reply that contradicts what was said, a summary pasted instead of written fresh).

REPLY with ONLY a compact JSON object: {"areas":[{"area":"","verdict":"תואם|חלקי|לא תואם","approved":"short","built":"short","note":"short"}],"invented":[""],"craft":[""],"summary":"one sentence"}`;
}

/** A JSON answer from a model, read leniently (the first { to the last }). */
async function askJson(model: string, input: string, max: number): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const m = await client.messages.create({ model, max_tokens: max, messages: [{ role: 'user', content: input }] });
    count(model, m.usage.input_tokens, m.usage.output_tokens);
    const text = m.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
    const a = text.indexOf('{'), b = text.lastIndexOf('}');
    if (a >= 0 && b > a) try { return JSON.parse(text.slice(a, b + 1)); } catch { /* once more */ }
  }
  return null;
}

async function runCase(c: Case, noWa: boolean) {
  const turns: Turn[] = [{ role: 'assistant', text: GREETING, quick: [] }];
  let draft: Draft = EMPTY;
  let stop = '';
  let n = 0;
  for (; n < MAX_TURNS; n++) {
    const p = await askJson(PERSONA, personaInput(c, turns, noWa), 1000);
    if (!p || typeof p.reply !== 'string' || !p.reply.trim()) { stop = 'המציג המדומה לא ענה'; break; }
    turns.push({ role: 'user', text: p.reply.trim() });
    if (p.done) break;
    try {
      const r = await converse(KEY, turns, draft, noWa);
      count('claude-opus-5-5 (consultant)', r.usage.input + r.usage.cacheRead, r.usage.output);
      turns.push({ role: 'assistant', text: r.reply, quick: r.quick });
      draft = r.draft;
    } catch (e) {
      // What an exhibitor would see as "היועץ לא ענה הפעם": the conversation is kept, with where and why it broke off.
      return { failed: true as const, caseId: c.id, type: c.type, noWa, stop: `היועץ נכשל בסבב ${n + 1}: ${String((e as Error).message ?? e)}`, stats: { consultantTurns: n }, turns, draft };
    }
  }
  if (n >= MAX_TURNS) stop = `${MAX_TURNS} סבבים בלי סיכום מאושר`;
  const b = await build(KEY, draft, turns, noWa);
  count('claude-opus-5-5 (consultant)', b.usage.input + b.usage.cacheRead, b.usage.output);
  const built = { setup: b.setup, texts: b.texts };
  const judge = await askJson(JUDGE, judgeInput(c, turns, draft, built), 6000);
  const ai = turns.filter((t) => t.role === 'assistant');
  const waWords = [
    ...ai.flatMap((t) => [t.text, ...(t.quick ?? [])]),
    ...Object.values(b.texts),
    ...draft.messages.map((m) => m.name + ' ' + m.purpose),
  ].filter((s) => WA.test(s));
  return {
    failed: false as const, caseId: c.id, type: c.type, noWa, stop,
    stats: { consultantTurns: ai.length, multiQ: ai.filter((t) => (t.text.match(/\?/g) ?? []).length > 1).length,
      checks: checks(draft).filter((x) => x[1]).length, checksOf: checks(draft).length, buildProblems: b.problems, texts: Object.keys(b.texts).length },
    waWords: noWa ? waWords : undefined,
    judge, draft, built, turns,
  };
}

const wanted = process.argv.slice(2).map((a) => ({ id: Number(a.split(':')[0]), noWa: a.endsWith(':nowa') }));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
await fs.mkdir(OUT, { recursive: true });
const results = [];
for (const w of wanted) {
  const c = CASES.find((x) => x.id === w.id);
  if (!c) { console.log(`case ${w.id}: not in autotest-cases.json`); continue; }
  try {
    const r = await runCase(c, w.noWa);
    results.push(r);
    if (r.failed) { console.log(`\n## ${c.id} ${c.type}${w.noWa ? ' (בלי וואטסאפ)' : ''}\n${r.stop}`); continue; }
    const verdicts = ((r.judge?.areas as { area: string; verdict: string }[] | undefined) ?? []).map((a) => `${a.area}: ${a.verdict}`).join(' · ');
    console.log(`\n## ${c.id} ${c.type}${w.noWa ? ' (בלי וואטסאפ)' : ''}\n${r.stats.consultantTurns} turns, ${r.stats.multiQ} with 2+ questions, checks ${r.stats.checks}/${r.stats.checksOf}, build problems ${r.stats.buildProblems.length}, texts ${r.stats.texts}${r.stop ? ', stopped: ' + r.stop : ''}${w.noWa ? `, WhatsApp words ${r.waWords!.length}` : ''}\n${verdicts}\n${String(r.judge?.summary ?? 'no judgment')}`);
  } catch (e) {
    console.log(`\n## ${c.id} ${c.type}: failed — ${String((e as Error).message ?? e).slice(0, 300)}`);
  }
}
await fs.writeFile(`${OUT}/${stamp}.json`, JSON.stringify({ stamp, tokens, results }, null, 1));
console.log(`\ntokens: ${JSON.stringify(tokens)}\nsaved: ${OUT}/${stamp}.json`);
