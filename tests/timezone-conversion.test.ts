import test from 'node:test';
import assert from 'node:assert/strict';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, interpretAsTimeZone } from '../lib/dates';

test('interpretAsTimeZone converts local time to UTC (winter, Bucharest)', () => {
  const date = interpretAsTimeZone('2026-01-10T10:00', 'Europe/Bucharest');
  assert.equal(date.toISOString(), '2026-01-10T08:00:00.000Z');
});

test('interpretAsTimeZone converts local time to UTC (summer, Bucharest)', () => {
  const date = interpretAsTimeZone('2026-07-10T10:00', 'Europe/Bucharest');
  assert.equal(date.toISOString(), '2026-07-10T07:00:00.000Z');
});

test('formatDateTimeWithTimeZone formats UTC into local time', () => {
  const label = formatDateTimeWithTimeZone('2026-01-10T08:00:00.000Z', 'Europe/Bucharest');
  assert.equal(label, '10 Jan 2026 10:00');
});

test('diffDaysInTimeZone respects local calendar days', () => {
  const base = new Date('2026-01-10T21:00:00.000Z');
  const next = new Date('2026-01-11T02:00:00.000Z');
  assert.equal(diffDaysInTimeZone(next, base, 'Europe/Bucharest'), 1);
});

test('DST gap does not produce invalid dates', () => {
  const date = interpretAsTimeZone('2026-03-29T02:30', 'Europe/Bucharest');
  assert.ok(!Number.isNaN(date.getTime()));
});
