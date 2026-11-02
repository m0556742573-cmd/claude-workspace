// Reading the consultant's answer (2/11, the server test): now and then it ends with one closing bracket too many, or
// writes בס"ד with a plain quote. Both are read; an answer with anything else after it is not cut midway.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lenient } from './consult.ts';

test('one closing bracket too many at the end is left out', () => {
  const raw = String.raw`{"reply":"רשמתי.","quick":["כן"],"setup":{"open":["איך הוא פונה: 'שלום [שם]' או 'בס\"ד, לכבוד ר' [שם]'. לשאול"]}}}`;
  const r = lenient(raw);
  assert.equal(r?.reply, 'רשמתי.');
  assert.deepEqual((r?.setup as { open: string[] }).open, [`איך הוא פונה: 'שלום [שם]' או 'בס"ד, לכבוד ר' [שם]'. לשאול`]);
});

test('a plain quote between Hebrew letters is gershayim', () => {
  assert.equal(lenient('{"reply":"פתיחה: בס"ד, 80 ש"ח"}')?.reply, 'פתיחה: בס״ד, 80 ש״ח');
});

test('valid answers are read as they are; anything but brackets after the object is not cut', () => {
  assert.deepEqual(lenient('{"reply":"שלום","quick":["א","ב"]}'), { reply: 'שלום', quick: ['א', 'ב'] });
  assert.equal(lenient('{"reply":"א"}} {"reply":"ב"}'), null);
  assert.equal(lenient('בלי מבנה בכלל')?.reply, 'בלי מבנה בכלל');
});
