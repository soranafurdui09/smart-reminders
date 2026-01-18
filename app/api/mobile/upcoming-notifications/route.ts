import { NextResponse } from 'next/server';
import { addDays } from 'date-fns';
import { createRouteClient } from '@/lib/supabase/route';
import { buildNotificationJobKey } from '@/lib/notifications/keys';
import { formatDateTimeWithTimeZone, resolveReminderTimeZone } from '@/lib/dates';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

export async function GET(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get('days') || DEFAULT_DAYS);
  const days = Number.isFinite(daysParam) ? Math.min(MAX_DAYS, Math.max(1, daysParam)) : DEFAULT_DAYS;

  const now = new Date();
  const end = addDays(now, days + 1);

  const { data: profile } = await supabase
    .from('profiles')
    .select('time_zone')
    .eq('user_id', user.id)
    .maybeSingle();
  const userTimeZone = profile?.time_zone ?? 'UTC';

  const { data: jobs, error } = await supabase
    .from('notification_jobs')
    .select('id, notify_at, reminder_id, entity_type, entity_id, occurrence_at_utc, reminders (id, title, kind, medication_details, tz)')
    .eq('user_id', user.id)
    .eq('channel', 'push')
    .in('status', ['pending', 'processing'])
    .gte('notify_at', now.toISOString())
    .lte('notify_at', end.toISOString())
    .order('notify_at', { ascending: true });

  if (error) {
    console.error('[mobile] upcoming notifications failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const seen = new Set<string>();
  const items = (jobs ?? []).flatMap((job: any) => {
    const reminder = Array.isArray(job.reminders) ? job.reminders[0] : job.reminders;
    if (!reminder?.id) {
      return [];
    }
    const occurrenceAt = job.occurrence_at_utc ?? job.notify_at;
    const jobKey = buildNotificationJobKey({
      entityType: job.entity_type ?? 'reminder',
      entityId: job.entity_id ?? job.reminder_id,
      occurrenceAtUtc: occurrenceAt,
      channel: 'push'
    });
    if (seen.has(jobKey)) {
      return [];
    }
    seen.add(jobKey);

    const details = reminder.medication_details || {};
    const title = reminder.kind === 'medication'
      ? `💊 ${details.name || reminder.title}`
      : reminder.title;
    const doseLabel = details.dose ? `Doza: ${details.dose}` : null;
    const displayTimeZone = resolveReminderTimeZone(reminder.tz ?? null, userTimeZone);
    const timeLabel = formatDateTimeWithTimeZone(job.notify_at, displayTimeZone);
    const body = reminder.kind === 'medication'
      ? doseLabel ? `${doseLabel} • ${timeLabel}` : `Este timpul pentru medicament • ${timeLabel}`
      : `Scadenta: ${timeLabel}`;

    return [
      {
        job_key: jobKey,
        reminder_id: job.reminder_id,
        title,
        body,
        occurrence_at_utc: occurrenceAt,
        timezone: displayTimeZone
      }
    ];
  });

  return NextResponse.json(items);
}
