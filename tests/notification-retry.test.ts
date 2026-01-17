import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MAX_RETRIES,
  getNextRetryAt,
  getRetryDelayMinutes,
  shouldRetry
} from '../lib/notifications/retry';

test('retry delay increases with retry count', () => {
  assert.equal(getRetryDelayMinutes(1), 1);
  assert.equal(getRetryDelayMinutes(2), 5);
  assert.equal(getRetryDelayMinutes(3), 15);
  assert.equal(getRetryDelayMinutes(4), 60);
  assert.equal(getRetryDelayMinutes(5), 180);
});

test('shouldRetry returns false after max retries', () => {
  assert.equal(shouldRetry(DEFAULT_MAX_RETRIES, DEFAULT_MAX_RETRIES), false);
  assert.equal(shouldRetry(DEFAULT_MAX_RETRIES - 1, DEFAULT_MAX_RETRIES), true);
});

test('getNextRetryAt returns expected timestamp', () => {
  const now = new Date('2026-01-10T10:00:00.000Z');
  const next = getNextRetryAt(now, 1);
  assert.equal(next.toISOString(), '2026-01-10T10:01:00.000Z');
});
