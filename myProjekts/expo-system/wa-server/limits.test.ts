// The sending limits: hours, Shabbat, Yom Tov and their eves, the gap, the daily cap on first messages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, firstLeft, gapMs, sendingHours, typingMs } from './limits.ts';

/** A moment in Israel time (winter, +02:00). */
const at = (iso: string) => new Date(iso + '+02:00');

test('weekday working hours only', () => {
  assert.equal(sendingHours(at('2026-11-17T10:00:00')), true);   // Tuesday morning
  assert.equal(sendingHours(at('2026-11-17T08:59:00')), false);  // before nine
  assert.equal(sendingHours(at('2026-11-17T20:00:00')), false);  // eight in the evening
  assert.equal(sendingHours(at('2026-11-17T23:30:00')), false);  // night
});

test('Friday until midday, nothing on Shabbat', () => {
  assert.equal(sendingHours(at('2026-11-20T11:00:00')), true);
  assert.equal(sendingHours(at('2026-11-20T13:00:00')), false);
  assert.equal(sendingHours(at('2026-11-21T12:00:00')), false);
  assert.equal(sendingHours(at('2026-11-22T10:00:00')), true);   // Sunday
});

test('Yom Tov and its eve (Israel)', () => {
  assert.equal(sendingHours(at('2027-04-22T10:00:00')), false);  // 15 Nisan, Pesach (a Thursday)
  assert.equal(sendingHours(at('2027-04-21T11:00:00')), true);   // 14 Nisan, the eve, before midday
  assert.equal(sendingHours(at('2027-04-21T14:00:00')), false);  // the eve, afternoon
  assert.equal(sendingHours(at('2027-04-25T10:00:00')), true);   // Chol HaMoed
  assert.equal(sendingHours(at('2026-12-07T10:00:00')), true);   // Chanukah is not Yom Tov
});

test('the gap and the typing stay in their ranges', () => {
  for (const r of [0, 0.5, 0.999]) {
    const g = gapMs(() => r);
    assert.ok(g >= LIMITS.gapMinSec * 1000 && g <= LIMITS.gapMaxSec * 1000);
    const t = typingMs('שלום יעקב, תודה שעברת בדוכן', () => r);
    assert.ok(t >= LIMITS.typingMinMs && t <= LIMITS.typingMaxMs);
  }
});

test('first messages: fewer in the first week after linking, none past the cap', () => {
  const now = Date.parse('2026-11-17T10:00:00+02:00');
  assert.equal(firstLeft(0, now - 2 * 86_400_000, now), LIMITS.firstPerDayNew);
  assert.equal(firstLeft(0, now - 30 * 86_400_000, now), LIMITS.firstPerDay);
  assert.equal(firstLeft(LIMITS.firstPerDay + 3, now - 30 * 86_400_000, now), 0);
});
