import { addMinutes } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationChannel = 'email' | 'push';
export type NotificationChannelPreference = NotificationChannel | 'both';
export type NotificationEntityType = 'reminder' | 'medication_dose';

export type NotificationJobInsert = {
  reminder_id: string;
  user_id: string;
  notify_at: string;
  channel: NotificationChannel;
  status: 'pending';
  entity_type: NotificationEntityType;
  entity_id: string;
  occurrence_at_utc: string;
};

function uniqueIsoTimes(times: Date[]) {
  const unique = new Map<number, Date>();
  times.forEach((time) => {
    unique.set(time.getTime(), time);
  });
  return Array.from(unique.values()).sort((a, b) => a.getTime() - b.getTime());
}

export function buildNotificationTimes(dueAt: Date) {
  return uniqueIsoTimes([new Date(dueAt)]);
}

function resolveChannels(channel: NotificationChannelPreference) {
  if (channel === 'both') {
    return ['email', 'push'] satisfies NotificationChannel[];
  }
  return [channel];
}

export function buildReminderJobInserts(options: {
  reminderId: string;
  userId: string;
  times: Date[];
  channel?: NotificationChannelPreference;
}) {
  const { reminderId, userId, times, channel = 'both' } = options;
  const channels = resolveChannels(channel);
  return times.flatMap((time) => {
    const notifyAt = time.toISOString();
    return channels.map((resolvedChannel) => ({
      reminder_id: reminderId,
      user_id: userId,
      notify_at: notifyAt,
      channel: resolvedChannel,
      status: 'pending',
      entity_type: 'reminder',
      entity_id: reminderId,
      occurrence_at_utc: notifyAt
    } satisfies NotificationJobInsert));
  });
}

export function buildMedicationJobInserts(options: {
  reminderId: string;
  userId: string;
  doses: { id: string; scheduled_at: string }[];
  channel?: NotificationChannelPreference;
}) {
  const { reminderId, userId, doses, channel = 'both' } = options;
  const channels = resolveChannels(channel);
  return doses.flatMap((dose) => {
    const notifyAt = dose.scheduled_at;
    return channels.map((resolvedChannel) => ({
      reminder_id: reminderId,
      user_id: userId,
      notify_at: notifyAt,
      channel: resolvedChannel,
      status: 'pending',
      entity_type: 'medication_dose',
      entity_id: dose.id,
      occurrence_at_utc: notifyAt
    } satisfies NotificationJobInsert));
  });
}

export async function clearNotificationJobsForReminder(reminderId: string) {
  const admin = createAdminClient();
  await admin.from('notification_jobs').delete().eq('reminder_id', reminderId);
}

export async function scheduleNotificationJobsForReminder(options: {
  reminderId: string;
  userId: string;
  dueAt: Date;
  preReminderMinutes?: number | null;
  channel?: NotificationChannelPreference;
  now?: Date;
}) {
  const {
    reminderId,
    userId,
    dueAt,
    preReminderMinutes,
    channel = 'both',
    now = new Date()
  } = options;

  const times = buildNotificationTimes(dueAt).filter((time) => time.getTime() >= now.getTime());
  const channels = resolveChannels(channel);
  console.log('[notifications] schedule reminder jobs', {
    reminderId,
    userId,
    count: times.length * channels.length,
    sample: times.slice(0, 3).map((time) => time.toISOString())
  });
  await clearNotificationJobsForReminder(reminderId);
  if (!times.length) return;

  const admin = createAdminClient();
  const inserts = buildReminderJobInserts({ reminderId, userId, times, channel });
  const { error } = await admin.from('notification_jobs').insert(inserts);
  if (error) {
    console.error('[notifications] schedule jobs failed', error);
  }
}

export async function scheduleNotificationJobsForMedication(options: {
  reminderId: string;
  userId: string;
  channel?: NotificationChannelPreference;
  now?: Date;
}) {
  const { reminderId, userId, channel = 'both', now = new Date() } = options;
  const admin = createAdminClient();
  await clearNotificationJobsForReminder(reminderId);

  const { data: doses, error } = await admin
    .from('medication_doses')
    .select('id, scheduled_at, snoozed_until')
    .eq('reminder_id', reminderId)
    .eq('status', 'pending')
    .gte('scheduled_at', now.toISOString())
    .order('scheduled_at');

  if (error) {
    console.error('[notifications] load medication doses failed', error);
    return;
  }
  console.log('[notifications] schedule medication jobs', {
    reminderId,
    userId,
    count: doses?.length ?? 0,
    sample: (doses ?? []).slice(0, 3).map((dose: any) => dose.scheduled_at)
  });

  const inserts = buildMedicationJobInserts({
    reminderId,
    userId,
    doses: (doses ?? []).map((dose: any) => ({
      id: dose.id,
      scheduled_at: dose.snoozed_until ?? dose.scheduled_at
    })),
    channel
  });
  if (!inserts.length) return;

  const { error: insertError } = await admin.from('notification_jobs').insert(inserts);
  if (insertError) {
    console.error('[notifications] schedule medication jobs failed', insertError);
  }
}

export async function rescheduleNotificationJob(options: {
  jobId: string;
  notifyAt: Date;
}) {
  const admin = createAdminClient();
  await admin
    .from('notification_jobs')
    .update({
      notify_at: options.notifyAt.toISOString(),
      status: 'pending',
      next_retry_at: null,
      claimed_at: null,
      claim_token: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', options.jobId);
}

export async function deferNotificationJob(options: {
  jobId: string;
  minutes: number;
  now?: Date;
}) {
  const base = options.now ?? new Date();
  const next = addMinutes(base, options.minutes);
  await rescheduleNotificationJob({ jobId: options.jobId, notifyAt: next });
}
