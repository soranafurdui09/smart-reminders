import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCronWindow, isJobDue } from '../lib/notifications/scheduling';

test('cron window includes grace period and lookahead', () => {
  const now = new Date('2026-01-10T10:00:00.000Z');
  const { windowStart, windowEnd } = buildCronWindow(now, { graceMinutes: 120, lookaheadMinutes: 17 });
  assert.equal(windowStart.toISOString(), '2026-01-10T08:00:00.000Z');
  assert.equal(windowEnd.toISOString(), '2026-01-10T10:17:00.000Z');
});

test('isJobDue only returns true for past jobs within grace', () => {
  const now = new Date('2026-01-10T10:00:00.000Z');
  const { windowStart } = buildCronWindow(now, { graceMinutes: 120, lookaheadMinutes: 17 });
  assert.equal(isJobDue(now, windowStart, new Date('2026-01-10T09:59:00.000Z')), true);
  assert.equal(isJobDue(now, windowStart, new Date('2026-01-10T10:05:00.000Z')), false);
  assert.equal(isJobDue(now, windowStart, new Date('2026-01-10T07:59:00.000Z')), false);
});

test('late cron still processes jobs within grace window', () => {
  const now = new Date('2026-01-10T12:00:00.000Z');
  const { windowStart } = buildCronWindow(now, { graceMinutes: 120, lookaheadMinutes: 5 });
  assert.equal(isJobDue(now, windowStart, new Date('2026-01-10T10:30:00.000Z')), true);
});
