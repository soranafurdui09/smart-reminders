import type { NotificationChannel, NotificationEntityType } from '@/lib/notifications/jobs';

export function buildNotificationJobKey(options: {
  entityType: NotificationEntityType;
  entityId: string;
  occurrenceAtUtc: string;
  channel: NotificationChannel;
}) {
  return `${options.entityType}:${options.entityId}:${options.occurrenceAtUtc}:${options.channel}`;
}
