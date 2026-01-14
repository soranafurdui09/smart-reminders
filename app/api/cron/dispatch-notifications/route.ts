import { NextResponse } from 'next/server';
import { addMinutes, format } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, sendEmail } from '@/lib/notifications';
import { sendPushNotification } from '@/lib/push';
import { reminderEmailTemplate } from '@/lib/templates';
import { evaluateReminderContext, parseContextSettings } from '@/lib/reminders/context';
import { isUserBusyInCalendarAt } from '@/lib/google/calendar';

export const runtime = 'nodejs';

type NotificationStatus = 'sent' | 'skipped' | 'failed';

export async function GET() {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const windowEnd = addMinutes(now, 15).toISOString();
  const appUrl = getAppUrl();

  const { data: occurrences, error } = await admin
    .from('reminder_occurrences')
    .select(
      'id, occur_at, snoozed_until, status, reminder:reminders(id, title, household_id, is_active, created_by, context_settings)'
    )
    // Notification flow: use snoozed_until as the effective due time when present.
    .or(
      `and(status.eq.snoozed,snoozed_until.lte.${nowIso}),and(status.eq.open,occur_at.lte.${nowIso})`
    );

  if (error) {
    console.error('[notifications] fetch occurrences failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const updateLogStatus = async (logId: string, status: NotificationStatus) => {
    await admin
      .from('notification_log')
      .update({ status })
      .eq('id', logId);
  };

  for (const occurrence of occurrences ?? []) {
    const reminder = Array.isArray(occurrence.reminder) ? occurrence.reminder[0] : occurrence.reminder;
    if (!reminder?.household_id || !reminder?.is_active || !reminder.created_by) {
      continue;
    }

    const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
    const dueAt = new Date(effectiveAt);
    const occurAtLabel = format(dueAt, 'dd MMM yyyy, HH:mm');
    const settings = parseContextSettings(reminder.context_settings ?? null);
    let isBusy = false;
    if (settings.calendarBusy?.enabled) {
      isBusy = await isUserBusyInCalendarAt({ userId: reminder.created_by, at: now });
    }
    const decision = evaluateReminderContext({
      now,
      reminderDueAt: dueAt,
      settings,
      isCalendarBusy: isBusy
    });
    if (decision.type === 'skip_for_now') {
      continue;
    }
    if (decision.type === 'auto_snooze' && decision.newScheduledAt) {
      await admin
        .from('reminder_occurrences')
        .update({
          snoozed_until: decision.newScheduledAt,
          status: 'snoozed'
        })
        .eq('id', occurrence.id);
      continue;
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('user_id', reminder.created_by)
      .maybeSingle();

    if (profile?.email) {
      const { data: emailLog, error: emailLogError } = await admin
        .from('notification_log')
        .insert({
          reminder_occurrence_id: occurrence.id,
          channel: 'email',
          status: 'sent',
          sent_at: nowIso
        })
        .select('id')
        .single();

      if (!emailLogError && emailLog) {
        const emailResult = await sendEmail({
          to: profile.email,
          subject: `Reminder: ${reminder.title}`,
          html: reminderEmailTemplate({ title: reminder.title, occurAt: occurAtLabel })
        });
        if (emailResult.status !== 'sent') {
          await updateLogStatus(emailLog.id, emailResult.status);
        }
      }
    }

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', reminder.created_by);

    const { data: pushLog, error: pushLogError } = await admin
      .from('notification_log')
      .insert({
        reminder_occurrence_id: occurrence.id,
        channel: 'push',
        status: 'sent',
        sent_at: nowIso
      })
      .select('id')
      .single();

    if (!pushLogError && pushLog) {
      const pushResult = await sendPushNotification(subscriptions ?? [], {
        title: reminder.title,
        body: `Scadenta: ${occurAtLabel}`,
        url: `${appUrl}/app/reminders/${reminder.id}`
      });
      if (pushResult.status !== 'sent') {
        await updateLogStatus(pushLog.id, pushResult.status);
      }
      if (pushResult.staleEndpoints.length) {
        await admin
          .from('push_subscriptions')
          .delete()
          .in('endpoint', pushResult.staleEndpoints);
      }
    }
  }

  const { data: medicationDoses, error: medicationError } = await admin
    .from('medication_doses')
    .select('id, scheduled_at, status, reminder:reminders(id, title, household_id, is_active, created_by, context_settings, medication_details)')
    .eq('status', 'pending')
    .gte('scheduled_at', nowIso)
    .lte('scheduled_at', windowEnd);

  if (medicationError) {
    console.error('[notifications] fetch medication doses failed', medicationError);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const updateMedicationLogStatus = async (logId: string, status: NotificationStatus) => {
    await admin
      .from('medication_notification_log')
      .update({ status })
      .eq('id', logId);
  };

  for (const dose of medicationDoses ?? []) {
    const reminder = Array.isArray(dose.reminder) ? dose.reminder[0] : dose.reminder;
    if (!reminder?.household_id || !reminder?.is_active || !reminder.created_by) {
      continue;
    }
    const details = reminder.medication_details || {};
    const medicationLabel = details.name ? `💊 ${details.name}` : `💊 ${reminder.title}`;
    const doseLabel = details.dose ? ` – ${details.dose}` : '';
    const occurAtLabel = format(new Date(dose.scheduled_at), 'dd MMM yyyy, HH:mm');
    const settings = parseContextSettings(reminder.context_settings ?? null);
    let isBusy = false;
    if (settings.calendarBusy?.enabled) {
      isBusy = await isUserBusyInCalendarAt({ userId: reminder.created_by, at: now });
    }
    const decision = evaluateReminderContext({
      now,
      reminderDueAt: new Date(dose.scheduled_at),
      settings,
      isCalendarBusy: isBusy
    });
    if (decision.type !== 'send_now') {
      continue;
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('user_id', reminder.created_by)
      .maybeSingle();

    if (profile?.email) {
      const { data: emailLog, error: emailLogError } = await admin
        .from('medication_notification_log')
        .insert({
          medication_dose_id: dose.id,
          channel: 'email',
          status: 'sent',
          sent_at: nowIso
        })
        .select('id')
        .single();

      if (!emailLogError && emailLog) {
        const emailResult = await sendEmail({
          to: profile.email,
          subject: `${medicationLabel}${doseLabel}`,
          html: reminderEmailTemplate({ title: `${medicationLabel}${doseLabel}`, occurAt: occurAtLabel })
        });
        if (emailResult.status !== 'sent') {
          await updateMedicationLogStatus(emailLog.id, emailResult.status);
        }
      }
    }

    const { data: subscriptions } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', reminder.created_by);

    const { data: pushLog, error: pushLogError } = await admin
      .from('medication_notification_log')
      .insert({
        medication_dose_id: dose.id,
        channel: 'push',
        status: 'sent',
        sent_at: nowIso
      })
      .select('id')
      .single();

    if (!pushLogError && pushLog) {
      const pushResult = await sendPushNotification(subscriptions ?? [], {
        title: `${medicationLabel}${doseLabel}`,
        body: `Este timpul pentru medicament • ${occurAtLabel}`,
        url: `${appUrl}/app`
      });
      if (pushResult.status !== 'sent') {
        await updateMedicationLogStatus(pushLog.id, pushResult.status);
      }
      if (pushResult.staleEndpoints.length) {
        await admin
          .from('push_subscriptions')
          .delete()
          .in('endpoint', pushResult.staleEndpoints);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    processed: (occurrences?.length ?? 0) + (medicationDoses?.length ?? 0)
  });
}
