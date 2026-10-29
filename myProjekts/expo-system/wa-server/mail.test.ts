// Mail: the visitor's mail (removal link, Hebrew headers) and the AWS signature, against AWS's own published example.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMail, mime, sigv4 } from './mail.ts';

const row = { id: '11111111-2222-3333-4444-555555555555', to_email: 'visitor@example.com', body: 'שלום יעקב,\nהמחירון: https://example.com/p\nיצחק, שטריימלך', from_name: 'יצחק', reply_to: 'itzhak@example.com', subject: 'שטריימלך' };

test('every mail says why he got it and carries the removal link, in the text, the HTML and the header', () => {
  const m = buildMail(row, 'https://expo-wa.example', 'expo@expo.y-h-m.com');
  assert.equal(m.unsubscribe, 'https://expo-wa.example/u/11111111-2222-3333-4444-555555555555');
  assert.match(m.text, /ביקרת בדוכן של שטריימלך/);
  assert.ok(m.text.includes(m.unsubscribe) && m.html.includes(m.unsubscribe));
  assert.match(m.html, /<a href="https:\/\/example.com\/p">/); // a link in the message can be clicked
  const raw = mime(m, new Date('2026-11-16T10:00:00Z'), 'x');
  assert.match(raw, /^From: =\?UTF-8\?B\?[^?]+\?= <expo@expo\.y-h-m\.com>/);
  assert.match(raw, /\r\nReply-To: <itzhak@example\.com>\r\n/);
  assert.match(raw, /\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n/);
  assert.ok(!/[^\x00-\x7f]/.test(raw)); // nothing but ASCII on the wire: Hebrew goes encoded
});

test('a file goes attached, its Hebrew name encoded', () => {
  const m = { ...buildMail(row, 'https://e', 'a@b.c'), attachments: [{ name: 'מחירון.pdf', type: 'application/pdf', data: Buffer.from('%PDF-1.4 x') }] };
  const raw = mime(m, new Date('2026-11-16T10:00:00Z'), 'x');
  assert.match(raw, /Content-Type: multipart\/mixed; boundary="m-x"/);
  assert.match(raw, /Content-Disposition: attachment; filename\*=UTF-8''%D7%9E/);
  assert.ok(raw.includes(Buffer.from('%PDF-1.4 x').toString('base64')));
  assert.ok(!/[^\x00-\x7f]/.test(raw));
});

test('a script in a message stays text in the HTML', () => {
  const m = buildMail({ ...row, body: '<script>x</script>' }, 'https://e', 'a@b.c');
  assert.ok(!m.html.includes('<script>'));
});

test('AWS Signature Version 4: the example in AWS documentation', () => {
  const auth = sigv4({
    method: 'GET', host: 'iam.amazonaws.com', path: '/', query: 'Action=ListUsers&Version=2010-05-08',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }, body: '',
    region: 'us-east-1', service: 'iam', keyId: 'AKIDEXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', amzDate: '20150830T123600Z',
  });
  assert.equal(auth, 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7');
});
