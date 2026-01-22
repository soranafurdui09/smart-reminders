import type { NotificationChannel, NotificationEntityType } from '@/lib/notifications/jobs';

export function buildNotificationJobKey(options: {
  entityType: NotificationEntityType;
  entityId: string;
  occurrenceAtUtc: string;
  channel: NotificationChannel;
  userId?: string;
}) {
  const userPart = options.userId ? `:${options.userId}` : '';
  return `${options.entityType}:${options.entityId}:${options.occurrenceAtUtc}:${options.channel}${userPart}`;
}
