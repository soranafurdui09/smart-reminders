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
    .select('time_zone, notify_by_push')
    .eq('user_id', user.id)
    .maybeSingle();
  const userTimeZone = profile?.time_zone ?? 'UTC';
  if (profile?.notify_by_push === false) {
    return NextResponse.json([]);
  }

  const nowIso = now.toISOString();
  const endIso = end.toISOString();

  const { data: occurrences, error: occurrenceError } = await supabase
    .from('reminder_occurrences')
    .select('id, occur_at, snoozed_until, status, reminder:reminders!inner(id, title, kind, medication_details, tz)')
    .in('status', ['open', 'snoozed'])
    .or(
      `and(snoozed_until.gte.${nowIso},snoozed_until.lte.${endIso}),and(snoozed_until.is.null,occur_at.gte.${nowIso},occur_at.lte.${endIso})`
    )
    .order('occur_at');

  if (occurrenceError) {
    console.error('[mobile] upcoming reminders failed', occurrenceError);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const { data: doses, error: doseError } = await supabase
    .from('medication_doses')
    .select('id, scheduled_at, status, reminder:reminders!inner(id, title, kind, medication_details, tz)')
    .eq('status', 'pending')
    .gte('scheduled_at', nowIso)
    .lte('scheduled_at', endIso)
    .order('scheduled_at');

  if (doseError) {
    console.error('[mobile] upcoming doses failed', doseError);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const seen = new Set<string>();
  const reminderItems = (occurrences ?? []).flatMap((occurrence: any) => {
    const reminder = Array.isArray(occurrence.reminder) ? occurrence.reminder[0] : occurrence.reminder;
    if (!reminder?.id) {
      return [];
    }
    const occurrenceAt = occurrence.snoozed_until ?? occurrence.occur_at;
    const jobKey = buildNotificationJobKey({
      entityType: 'reminder',
      entityId: reminder.id,
      occurrenceAtUtc: occurrenceAt,
      channel: 'push',
      userId: user.id
    });
    if (seen.has(jobKey)) {
      return [];
    }
    seen.add(jobKey);

    const displayTimeZone = resolveReminderTimeZone(reminder.tz ?? null, userTimeZone);
    const timeLabel = formatDateTimeWithTimeZone(occurrenceAt, displayTimeZone);
    const title = reminder.title;
    const body = `Scadenta: ${timeLabel}`;

    return [
      {
        job_key: jobKey,
        reminder_id: reminder.id,
        title,
        body,
        occurrence_at_utc: occurrenceAt,
        timezone: displayTimeZone
      }
    ];
  });

  const doseItems = (doses ?? []).flatMap((dose: any) => {
    const reminder = Array.isArray(dose.reminder) ? dose.reminder[0] : dose.reminder;
    if (!reminder?.id) {
      return [];
    }
    const occurrenceAt = dose.scheduled_at;
    const jobKey = buildNotificationJobKey({
      entityType: 'medication_dose',
      entityId: dose.id,
      occurrenceAtUtc: occurrenceAt,
      channel: 'push',
      userId: user.id
    });
    if (seen.has(jobKey)) {
      return [];
    }
    seen.add(jobKey);

    const details = reminder.medication_details || {};
    const title = `💊 ${details.name || reminder.title}`;
    const doseLabel = details.dose ? `Doza: ${details.dose}` : null;
    const displayTimeZone = resolveReminderTimeZone(reminder.tz ?? null, userTimeZone);
    const timeLabel = formatDateTimeWithTimeZone(occurrenceAt, displayTimeZone);
    const body = doseLabel ? `${doseLabel} • ${timeLabel}` : `Este timpul pentru medicament • ${timeLabel}`;

    return [
      {
        job_key: jobKey,
        reminder_id: reminder.id,
        title,
        body,
        occurrence_at_utc: occurrenceAt,
        timezone: displayTimeZone
      }
    ];
  });

  return NextResponse.json([...reminderItems, ...doseItems]);
}
