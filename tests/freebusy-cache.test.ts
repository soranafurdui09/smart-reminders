import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FREEBUSY_CACHE_TTL_MS,
  FREEBUSY_CACHE_WINDOW_MS,
  computePostponeUntil,
  findBusyIntervalAt,
  isCacheFresh
} from '../lib/google/freebusy-cache';

test('isCacheFresh returns true for fresh cache covering the window', () => {
  const now = new Date('2026-01-10T10:00:00Z');
  const cache = {
    busy: [],
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + FREEBUSY_CACHE_WINDOW_MS).toISOString(),
    fetchedAt: new Date(now.getTime() - 1000).toISOString()
  };
  const isFresh = isCacheFresh(cache, now, new Date(cache.timeMax), now, FREEBUSY_CACHE_TTL_MS);
  assert.equal(isFresh, true);
});

test('isCacheFresh returns false for stale cache', () => {
  const now = new Date('2026-01-10T10:00:00Z');
  const cache = {
    busy: [],
    timeMin: now.toISOString(),
    timeMax: new Date(now.getTime() + FREEBUSY_CACHE_WINDOW_MS).toISOString(),
    fetchedAt: new Date(now.getTime() - FREEBUSY_CACHE_TTL_MS - 1000).toISOString()
  };
  const isFresh = isCacheFresh(cache, now, new Date(cache.timeMax), now, FREEBUSY_CACHE_TTL_MS);
  assert.equal(isFresh, false);
});

test('findBusyIntervalAt returns interval containing the timestamp', () => {
  const busy = [
    { start: '2026-01-10T08:00:00.000Z', end: '2026-01-10T09:00:00.000Z' },
    { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T11:30:00.000Z' }
  ];
  const hit = findBusyIntervalAt(busy, new Date('2026-01-10T10:15:00.000Z'));
  assert.deepEqual(hit, busy[1]);
});

test('computePostponeUntil respects busy end buffer', () => {
  const now = new Date('2026-01-10T10:00:00.000Z');
  const busyInterval = { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:20:00.000Z' };
  const postponed = computePostponeUntil(now, 15, busyInterval);
  assert.equal(postponed.toISOString(), '2026-01-10T10:22:00.000Z');
});
