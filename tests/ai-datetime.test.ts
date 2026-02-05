import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferAiDatetimeMeta } from '../lib/ai/datetime';

test('plain text without datetime stays task', () => {
  const meta = inferAiDatetimeMeta({
    text: 'mananc mere',
    dueAt: '2025-01-10T09:00:00+02:00'
  });
  assert.equal(meta.hasExplicitDatetime, false);
  assert.equal(meta.parsedDatetime, null);
});

test('explicit datetime stays reminder', () => {
  const meta = inferAiDatetimeMeta({
    text: 'doctor miercuri 16:00',
    dueAt: '2025-01-15T16:00:00+02:00'
  });
  assert.equal(meta.hasExplicitDatetime, true);
  assert.equal(meta.parsedDatetime, '2025-01-15T16:00:00+02:00');
});

test('vague date without time is not promoted', () => {
  const meta = inferAiDatetimeMeta({
    text: 'azi',
    dueAt: '2025-01-10T09:00:00+02:00'
  });
  assert.equal(meta.hasExplicitDatetime, false);
  assert.equal(meta.parsedDatetime, null);
});
