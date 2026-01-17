import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationJobKey } from '../lib/notifications/keys';

test('buildNotificationJobKey is unique per channel', () => {
  const base = {
    entityType: 'reminder' as const,
    entityId: 'reminder-1',
    occurrenceAtUtc: '2026-01-10T10:00:00.000Z'
  };
  const emailKey = buildNotificationJobKey({ ...base, channel: 'email' });
  const pushKey = buildNotificationJobKey({ ...base, channel: 'push' });
  assert.notEqual(emailKey, pushKey);
});
