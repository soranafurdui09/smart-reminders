import { addMinutes } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationChannel = 'email' | 'push' | 'both';

function uniqueIsoTimes(times: Date[]) {
  const unique = new Map<number, Date>();
  times.forEach((time) => {
    unique.set(time.getTime(), time);
  });
  return Array.from(unique.values()).sort((a, b) => a.getTime() - b.getTime());
}

export function buildNotificationTimes(dueAt: Date, preReminderMinutes?: number | null) {
  const times: Date[] = [new Date(dueAt)];
  if (preReminderMinutes && Number.isFinite(preReminderMinutes) && preReminderMinutes > 0) {
    times.push(new Date(dueAt.getTime() - preReminderMinutes * 60000));
  }
  return uniqueIsoTimes(times);
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
  channel?: NotificationChannel;
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

  const times = buildNotificationTimes(dueAt, preReminderMinutes).filter((time) => time.getTime() >= now.getTime());
  await clearNotificationJobsForReminder(reminderId);
  if (!times.length) return;

  const admin = createAdminClient();
  const inserts = times.map((time) => ({
    reminder_id: reminderId,
    user_id: userId,
    notify_at: time.toISOString(),
    channel,
    status: 'pending'
  }));
  const { error } = await admin.from('notification_jobs').insert(inserts);
  if (error) {
    console.error('[notifications] schedule jobs failed', error);
  }
}

export async function scheduleNotificationJobsForMedication(options: {
  reminderId: string;
  userId: string;
  channel?: NotificationChannel;
  now?: Date;
}) {
  const { reminderId, userId, channel = 'both', now = new Date() } = options;
  const admin = createAdminClient();
  await clearNotificationJobsForReminder(reminderId);

  const { data: doses, error } = await admin
    .from('medication_doses')
    .select('scheduled_at')
    .eq('reminder_id', reminderId)
    .eq('status', 'pending')
    .gte('scheduled_at', now.toISOString())
    .order('scheduled_at');

  if (error) {
    console.error('[notifications] load medication doses failed', error);
    return;
  }

  const inserts = (doses ?? []).map((dose) => ({
    reminder_id: reminderId,
    user_id: userId,
    notify_at: dose.scheduled_at,
    channel,
    status: 'pending'
  }));
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
    .update({ notify_at: options.notifyAt.toISOString(), status: 'pending', updated_at: new Date().toISOString() })
    .eq('id', options.jobId);
}

export async function deferNotificationJob(options: {
  jobId: string;
  minutes: number;
}) {
  const next = addMinutes(new Date(), options.minutes);
  await rescheduleNotificationJob({ jobId: options.jobId, notifyAt: next });
}
