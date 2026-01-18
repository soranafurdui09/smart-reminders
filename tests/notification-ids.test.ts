import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotificationJobKey } from '@/lib/notifications/keys';
import { notificationIdFromKey } from '@/lib/native/notificationIds';

test('notificationIdFromKey is deterministic and non-negative', () => {
  const key = buildNotificationJobKey({
    entityType: 'reminder',
    entityId: '00000000-0000-0000-0000-000000000000',
    occurrenceAtUtc: '2026-01-15T17:20:00.000Z',
    channel: 'push'
  });
  const first = notificationIdFromKey(key);
  const second = notificationIdFromKey(key);
  assert.equal(first, second);
  assert.ok(first >= 0);
});
