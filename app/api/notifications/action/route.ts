import { NextRequest, NextResponse } from 'next/server';
import { addMinutes } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl } from '@/lib/notifications';
import { getNextOccurrence } from '@/lib/reminders';
import { buildNotificationTimes, buildReminderJobInserts } from '@/lib/notifications/jobs';

const SNOOZE_MINUTES = 30;

type ActionName = 'done' | 'snooze';

function parseAction(value: unknown): ActionName | null {
  if (value === 'done' || value === 'snooze') return value;
  return null;
}

function buildResponseRedirect(action: ActionName, ok: boolean) {
  const appUrl = getAppUrl();
  const target = ok ? `/app?notification=${action}` : `/auth?error=notification-action`;
  return NextResponse.redirect(new URL(target, appUrl));
}

async function handleAction(payload: { action: ActionName; jobId: string; token: string }, isBrowser: boolean) {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: job } = await admin
    .from('notification_jobs')
    .select('id, reminder_id, user_id, notify_at, status, channel, action_token, action_token_expires_at, action_handled_at, entity_type, entity_id, occurrence_at_utc')
    .eq('id', payload.jobId)
    .maybeSingle();

  if (!job || !job.action_token || job.action_token !== payload.token) {
    return isBrowser
      ? buildResponseRedirect(payload.action, false)
      : NextResponse.json({ ok: false, error: 'invalid-token' }, { status: 401 });
  }

  if (job.action_token_expires_at && new Date(job.action_token_expires_at) < new Date()) {
    return isBrowser
      ? buildResponseRedirect(payload.action, false)
      : NextResponse.json({ ok: false, error: 'token-expired' }, { status: 410 });
  }

  if (job.action_handled_at) {
    return isBrowser
      ? buildResponseRedirect(payload.action, true)
      : NextResponse.json({ ok: true, action: payload.action, handled: true });
  }

  const { data: reminder } = await admin
    .from('reminders')
    .select('id, schedule_type, kind, created_by, pre_reminder_minutes')
    .eq('id', job.reminder_id)
    .maybeSingle();

  if (!reminder) {
    return isBrowser
      ? buildResponseRedirect(payload.action, false)
      : NextResponse.json({ ok: false, error: 'missing-reminder' }, { status: 404 });
  }

  if (payload.action === 'done') {
    if (reminder.kind === 'medication') {
      const doseId = job.entity_type === 'medication_dose' ? job.entity_id : null;
      const doseQuery = admin.from('medication_doses').select('id');
      const { data: dose } = doseId
        ? await doseQuery.eq('id', doseId).maybeSingle()
        : await doseQuery.eq('reminder_id', job.reminder_id).eq('scheduled_at', job.notify_at).maybeSingle();
      if (dose?.id) {
        await admin
          .from('medication_doses')
          .update({ status: 'taken', taken_at: nowIso })
          .eq('id', dose.id);
      }
    } else {
      const { data: occurrence } = await admin
        .from('reminder_occurrences')
        .select('id, occur_at, snoozed_until')
        .eq('reminder_id', job.reminder_id)
        .in('status', ['open', 'snoozed'])
        .or(`snoozed_until.eq.${job.notify_at},occur_at.eq.${job.notify_at}`)
        .maybeSingle();

      if (occurrence?.id) {
        await admin
          .from('reminder_occurrences')
          .update({
            status: 'done',
            done_at: nowIso,
            snoozed_until: null,
            performed_by: job.user_id,
            performed_at: nowIso
          })
          .eq('id', occurrence.id);

        if (reminder.schedule_type && reminder.schedule_type !== 'once') {
          const next = getNextOccurrence(new Date(occurrence.occur_at), reminder.schedule_type);
          if (next) {
            const { data: nextOccurrence } = await admin
              .from('reminder_occurrences')
              .insert({
                reminder_id: job.reminder_id,
                occur_at: next.toISOString(),
                status: 'open'
              })
              .select('id')
              .single();

            if (nextOccurrence?.id && reminder.created_by) {
              const times = buildNotificationTimes(next).filter((time) => time.getTime() >= Date.now());
              const inserts = buildReminderJobInserts({
                reminderId: job.reminder_id,
                userId: reminder.created_by,
                times,
                channel: 'both'
              });
              if (inserts.length) {
                await admin.from('notification_jobs').insert(inserts);
              }
            }
          }
        }
      }
    }
  }

  if (payload.action === 'snooze') {
    const target = addMinutes(new Date(job.notify_at), SNOOZE_MINUTES);
    if (reminder.kind === 'medication') {
      const channel = job.channel === 'push' ? 'push' : 'email';
      await admin.from('notification_jobs').insert({
        reminder_id: job.reminder_id,
        user_id: job.user_id,
        notify_at: target.toISOString(),
        channel,
        status: 'pending',
        entity_type: job.entity_type ?? 'medication_dose',
        entity_id: job.entity_id ?? job.reminder_id,
        occurrence_at_utc: target.toISOString()
      });
    } else {
      const { data: occurrence } = await admin
        .from('reminder_occurrences')
        .select('id')
        .eq('reminder_id', job.reminder_id)
        .in('status', ['open', 'snoozed'])
        .or(`snoozed_until.eq.${job.notify_at},occur_at.eq.${job.notify_at}`)
        .maybeSingle();
      if (occurrence?.id) {
        await admin
          .from('reminder_occurrences')
          .update({
            snoozed_until: target.toISOString(),
            status: 'snoozed',
            performed_by: job.user_id,
            performed_at: nowIso
          })
          .eq('id', occurrence.id);
      }
      const channel = job.channel === 'push' ? 'push' : 'email';
      await admin.from('notification_jobs').insert({
        reminder_id: job.reminder_id,
        user_id: job.user_id,
        notify_at: target.toISOString(),
        channel,
        status: 'pending',
        entity_type: 'reminder',
        entity_id: job.reminder_id,
        occurrence_at_utc: target.toISOString()
      });
    }
  }

  await admin
    .from('notification_jobs')
    .update({
      status: 'sent',
      action_handled_at: nowIso,
      action_handled_action: payload.action,
      updated_at: nowIso
    })
    .eq('id', job.id);

  return isBrowser
    ? buildResponseRedirect(payload.action, true)
    : NextResponse.json({ ok: true, action: payload.action });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = parseAction(searchParams.get('action'));
  const jobId = searchParams.get('jobId') ?? '';
  const token = searchParams.get('token') ?? '';

  if (!action || !jobId || !token) {
    return buildResponseRedirect('done', false);
  }

  return handleAction({ action, jobId, token }, true);
}

export async function POST(request: NextRequest) {
  let body: { action?: string; jobId?: string; token?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }

  const action = parseAction(body.action);
  const jobId = body.jobId ?? '';
  const token = body.token ?? '';
  if (!action || !jobId || !token) {
    return NextResponse.json({ ok: false, error: 'invalid-payload' }, { status: 400 });
  }

  return handleAction({ action, jobId, token }, false);
}
