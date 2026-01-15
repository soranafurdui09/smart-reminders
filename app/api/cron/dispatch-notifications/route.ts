import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { addMinutes } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, sendEmail } from '@/lib/notifications';
import { sendPushNotification } from '@/lib/push';
import { reminderEmailTemplate } from '@/lib/templates';
import { evaluateReminderContext, parseContextSettings } from '@/lib/reminders/context';
import { getFreeBusyIntervalsForUser } from '@/lib/google/calendar';
import { deferNotificationJob, rescheduleNotificationJob } from '@/lib/notifications/jobs';
import { computePostponeUntil, findBusyIntervalAt, FREEBUSY_CACHE_WINDOW_MS } from '@/lib/google/freebusy-cache';
import { formatDateTimeWithTimeZone, interpretAsTimeZone, resolveReminderTimeZone } from '@/lib/dates';

export const runtime = 'nodejs';

type NotificationStatus = 'sent' | 'skipped' | 'failed';

type NotificationJob = {
  id: string;
  reminder_id: string;
  user_id: string;
  notify_at: string;
  channel: 'email' | 'push' | 'both';
  status: string;
  action_token?: string | null;
  action_token_expires_at?: string | null;
};

type ReminderRecord = {
  id: string;
  title: string;
  household_id: string | null;
  is_active: boolean | null;
  created_by: string | null;
  context_settings?: any;
  kind?: string | null;
  medication_details?: any;
  tz?: string | null;
};

export async function GET() {
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const windowMinutes = 15;
  const tzPaddingMinutes = 14 * 60;
  const windowStart = addMinutes(now, -windowMinutes);
  const windowStartIso = windowStart.toISOString();
  const windowEndIso = nowIso;
  const fetchStartIso = addMinutes(now, -(windowMinutes + tzPaddingMinutes)).toISOString();
  const fetchEndIso = addMinutes(now, tzPaddingMinutes).toISOString();
  const appUrl = getAppUrl();
  console.log('[cron] dispatch notifications', {
    windowStart: windowStartIso,
    windowEnd: windowEndIso,
    fetchStart: fetchStartIso,
    fetchEnd: fetchEndIso
  });

  const { data: existingJobs, error: existingError } = await admin
    .from('notification_jobs')
    .select('reminder_id, notify_at')
    .gte('notify_at', windowStartIso)
    .lte('notify_at', windowEndIso);

  if (existingError) {
    console.error('[notifications] fetch existing jobs failed', existingError);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  console.log('[cron] existing jobs in window', { count: existingJobs?.length ?? 0 });

  const jobKeySet = new Set(
    (existingJobs ?? []).map((job: any) => `${job.reminder_id}:${job.notify_at}`)
  );

  const { data: occurrenceSeeds } = await admin
    .from('reminder_occurrences')
    .select('id, occur_at, snoozed_until, reminder:reminders!inner(id, created_by, is_active)')
    .in('status', ['open', 'snoozed'])
    .or(
      `and(snoozed_until.gte.${windowStartIso},snoozed_until.lte.${windowEndIso}),and(snoozed_until.is.null,occur_at.gte.${windowStartIso},occur_at.lte.${windowEndIso})`
    );

  const occurrenceInserts = (occurrenceSeeds ?? [])
    .map((occurrence: any) => {
      const reminder = Array.isArray(occurrence.reminder) ? occurrence.reminder[0] : occurrence.reminder;
      if (!reminder?.id || !reminder?.created_by || reminder.is_active === false) {
        return null;
      }
      const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
      const key = `${reminder.id}:${effectiveAt}`;
      if (jobKeySet.has(key)) {
        return null;
      }
      jobKeySet.add(key);
      return {
        reminder_id: reminder.id,
        user_id: reminder.created_by,
        notify_at: effectiveAt,
        channel: 'both',
        status: 'pending'
      };
    })
    .filter(Boolean) as {
      reminder_id: string;
      user_id: string;
      notify_at: string;
      channel: 'both';
      status: 'pending';
    }[];

  const { data: medicationSeeds } = await admin
    .from('medication_doses')
    .select('scheduled_at, reminder:reminders!inner(id, created_by, is_active)')
    .eq('status', 'pending')
    .gte('scheduled_at', windowStartIso)
    .lte('scheduled_at', windowEndIso);

  const medicationInserts = (medicationSeeds ?? [])
    .map((dose: any) => {
      const reminder = Array.isArray(dose.reminder) ? dose.reminder[0] : dose.reminder;
      if (!reminder?.id || !reminder?.created_by || reminder.is_active === false) {
        return null;
      }
      const key = `${reminder.id}:${dose.scheduled_at}`;
      if (jobKeySet.has(key)) {
        return null;
      }
      jobKeySet.add(key);
      return {
        reminder_id: reminder.id,
        user_id: reminder.created_by,
        notify_at: dose.scheduled_at,
        channel: 'both',
        status: 'pending'
      };
    })
    .filter(Boolean) as {
      reminder_id: string;
      user_id: string;
      notify_at: string;
      channel: 'both';
      status: 'pending';
    }[];

  const seedInserts = [...occurrenceInserts, ...medicationInserts];
  console.log('[cron] seed candidates', {
    occurrences: occurrenceInserts.length,
    medications: medicationInserts.length
  });
  if (seedInserts.length) {
    const { error: seedError } = await admin.from('notification_jobs').insert(seedInserts);
    if (seedError) {
      console.error('[notifications] seed jobs failed', seedError);
    }
  }

  const { data: jobs, error } = await admin
    .from('notification_jobs')
    .select('id, reminder_id, user_id, notify_at, channel, status, action_token, action_token_expires_at')
    .eq('status', 'pending')
    .gte('notify_at', fetchStartIso)
    .lte('notify_at', fetchEndIso)
    .order('notify_at', { ascending: true })
    .limit(1000);

  if (error) {
    console.error('[notifications] fetch jobs failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  console.log('[cron] pending jobs', {
    count: jobs?.length ?? 0,
    sample: (jobs ?? []).slice(0, 3).map((job: any) => job.id)
  });

  if (!jobs?.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const reminderIds = Array.from(new Set(jobs.map((job) => job.reminder_id)));
  const userIds = Array.from(new Set(jobs.map((job) => job.user_id)));

  const { data: reminders, error: reminderError } = await admin
    .from('reminders')
    .select('id, title, household_id, is_active, created_by, context_settings, kind, medication_details, tz')
    .in('id', reminderIds);

  if (reminderError) {
    console.error('[notifications] fetch reminders failed', reminderError);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }

  const reminderMap = new Map((reminders ?? []).map((reminder: ReminderRecord) => [reminder.id, reminder]));
  console.log('[cron] loaded reminders', { count: reminderMap.size });

  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, email, time_zone, context_defaults')
    .in('user_id', userIds);
  const profileMap = new Map(
    (profiles ?? []).map((profile: any) => [
      profile.user_id,
      {
        email: profile.email,
        timeZone: profile.time_zone,
        contextDefaults: parseContextSettings(profile.context_defaults ?? null)
      }
    ])
  );

  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  const pushMap = new Map<string, { endpoint: string; p256dh: string; auth: string }[]>();
  (subscriptions ?? []).forEach((sub: any) => {
    const existing = pushMap.get(sub.user_id) ?? [];
    existing.push({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth });
    pushMap.set(sub.user_id, existing);
  });

  const { data: occurrences } = await admin
    .from('reminder_occurrences')
    .select('id, reminder_id, occur_at, snoozed_until, status')
    .in('reminder_id', reminderIds)
    .in('status', ['open', 'snoozed']);
  const occurrenceMap = new Map<string, { id: string; occur_at: string; snoozed_until?: string | null }>();
  (occurrences ?? []).forEach((occurrence: any) => {
    const existing = occurrenceMap.get(occurrence.reminder_id);
    if (!existing) {
      occurrenceMap.set(occurrence.reminder_id, occurrence);
      return;
    }
    if (new Date(occurrence.occur_at).getTime() < new Date(existing.occur_at).getTime()) {
      occurrenceMap.set(occurrence.reminder_id, occurrence);
    }
  });

  const { data: medicationDoses } = await admin
    .from('medication_doses')
    .select('id, reminder_id, scheduled_at, status')
    .in('reminder_id', reminderIds)
    .eq('status', 'pending')
    .gte('scheduled_at', windowStartIso)
    .lte('scheduled_at', windowEndIso);
  const medicationDoseMap = new Map<string, { id: string; scheduled_at: string }>();
  (medicationDoses ?? []).forEach((dose: any) => {
    medicationDoseMap.set(`${dose.reminder_id}:${dose.scheduled_at}`, dose);
  });

  const updateJobStatus = async (jobId: string, status: NotificationStatus, lastError?: string | null) => {
    await admin
      .from('notification_jobs')
      .update({ status, last_error: lastError ?? null, updated_at: new Date().toISOString() })
      .eq('id', jobId);
  };

  const updateLogStatus = async (logId: string, status: NotificationStatus) => {
    await admin
      .from('notification_log')
      .update({ status })
      .eq('id', logId);
  };

  const updateMedicationLogStatus = async (logId: string, status: NotificationStatus) => {
    await admin
      .from('medication_notification_log')
      .update({ status })
      .eq('id', logId);
  };

  const ensureActionToken = async (job: NotificationJob) => {
    const nowTs = Date.now();
    const expiresAt = job.action_token_expires_at ? new Date(job.action_token_expires_at).getTime() : 0;
    if (job.action_token && expiresAt > nowTs) {
      return { token: job.action_token, expiresAt: job.action_token_expires_at as string };
    }
    const token = crypto.randomBytes(20).toString('hex');
    const nextExpires = new Date(nowTs + 7 * 24 * 60 * 60 * 1000).toISOString();
    await admin
      .from('notification_jobs')
      .update({ action_token: token, action_token_expires_at: nextExpires, updated_at: new Date().toISOString() })
      .eq('id', job.id);
    return { token, expiresAt: nextExpires };
  };

  const settingsMap = new Map<string, ReturnType<typeof parseContextSettings>>();
  const calendarBusyUsers = new Set<string>();
  (reminders ?? []).forEach((reminder: ReminderRecord) => {
    const profileDefaults = reminder.created_by ? profileMap.get(reminder.created_by)?.contextDefaults : null;
    const settings = parseContextSettings(reminder.context_settings ?? null, profileDefaults ?? undefined);
    settingsMap.set(reminder.id, settings);
    if (settings.calendarBusy?.enabled && reminder.created_by) {
      calendarBusyUsers.add(reminder.created_by);
    }
  });

  const busyIntervalMap = new Map<string, ReturnType<typeof findBusyIntervalAt> | null>();
  if (calendarBusyUsers.size) {
    const freeBusyWindowEnd = new Date(now.getTime() + FREEBUSY_CACHE_WINDOW_MS);
    for (const userId of calendarBusyUsers) {
      try {
        const profile = profileMap.get(userId);
        const timeZone = profile?.timeZone || 'UTC';
        const busyIntervals = await getFreeBusyIntervalsForUser({
          userId,
          timeMin: now,
          timeMax: freeBusyWindowEnd,
          timeZone,
          supabase: admin
        });
        busyIntervalMap.set(userId, findBusyIntervalAt(busyIntervals, now));
      } catch (error) {
        console.error('[google] freeBusy cache failed', error);
        busyIntervalMap.set(userId, null);
      }
    }
  }

  for (const job of jobs as NotificationJob[]) {
    if (job.status !== 'pending') continue;
    console.log('[cron] processing job', {
      jobId: job.id,
      reminderId: job.reminder_id,
      userId: job.user_id,
      channel: job.channel,
      notifyAt: job.notify_at
    });
    const reminder = reminderMap.get(job.reminder_id);
    if (!reminder?.household_id || !reminder?.is_active || !reminder.created_by) {
      await updateJobStatus(job.id, 'failed', 'reminder_inactive');
      continue;
    }

    const profile = profileMap.get(job.user_id);
    const userTimeZone = profile?.timeZone || 'UTC';
    const displayTimeZone = resolveReminderTimeZone(reminder.tz ?? null, userTimeZone);
    const dueAt = displayTimeZone && displayTimeZone !== 'UTC'
      ? interpretAsTimeZone(job.notify_at, displayTimeZone)
      : new Date(job.notify_at);
    if (dueAt < windowStart || dueAt > now) {
      continue;
    }
    const occurAtLabel = formatDateTimeWithTimeZone(dueAt, displayTimeZone);
    const settings = settingsMap.get(reminder.id)
      ?? parseContextSettings(
        reminder.context_settings ?? null,
        profileMap.get(reminder.created_by)?.contextDefaults ?? undefined
      );
    const busyInterval = settings.calendarBusy?.enabled
      ? busyIntervalMap.get(reminder.created_by) ?? null
      : null;
    const isBusy = Boolean(busyInterval);
    const decision = evaluateReminderContext({
      now,
      reminderDueAt: dueAt,
      settings,
      isCalendarBusy: isBusy
    });

    if (decision.type === 'auto_snooze' && decision.newScheduledAt) {
      const snoozeMinutes = settings.calendarBusy?.snoozeMinutes ?? 15;
      const adjusted = computePostponeUntil(now, snoozeMinutes, busyInterval);
      const nextScheduledAt = adjusted.toISOString();
      console.log('[cron] auto-snooze job', {
        jobId: job.id,
        nextScheduledAt
      });
      if (reminder.kind !== 'medication') {
        const occurrence = occurrenceMap.get(reminder.id);
        if (occurrence) {
          await admin
            .from('reminder_occurrences')
            .update({ snoozed_until: nextScheduledAt, status: 'snoozed' })
            .eq('id', occurrence.id);
        }
      }
      await rescheduleNotificationJob({ jobId: job.id, notifyAt: new Date(nextScheduledAt) });
      continue;
    }

    if (decision.type === 'skip_for_now') {
      console.log('[cron] skip for now', { jobId: job.id });
      await deferNotificationJob({ jobId: job.id, minutes: 15 });
      continue;
    }

    const channel = job.channel;
    let emailStatus: NotificationStatus = 'skipped';
    let pushStatus: NotificationStatus = 'skipped';
    let errorMessage: string | null = null;

    const isMedication = reminder.kind === 'medication';
    const details = reminder.medication_details || {};
    const medicationLabel = details.name ? `💊 ${details.name}` : `💊 ${reminder.title}`;
    const doseLabel = details.dose ? ` – ${details.dose}` : '';
    const title = isMedication ? `${medicationLabel}${doseLabel}` : reminder.title;
    const body = isMedication
      ? `Este timpul pentru medicament • ${occurAtLabel}`
      : `Scadenta: ${occurAtLabel}`;
    const url = isMedication ? `${appUrl}/app` : `${appUrl}/app/reminders/${reminder.id}`;

    const { token } = await ensureActionToken(job);
    const actionBase = `${appUrl}/api/notifications/action?jobId=${job.id}&token=${token}`;
    const actionUrls = {
      done: `${actionBase}&action=done`,
      snooze: `${actionBase}&action=snooze`
    };

    if (channel === 'email' || channel === 'both') {
      const email = profile?.email;
      if (email) {
        let logRow: { id?: string } | null = null;
        let logError: unknown = null;
        if (isMedication) {
          const doseId = medicationDoseMap.get(`${reminder.id}:${job.notify_at}`)?.id;
          if (doseId) {
            const result = await admin
              .from('medication_notification_log')
              .insert({
                medication_dose_id: doseId,
                channel: 'email',
                status: 'sent',
                sent_at: nowIso
              })
              .select('id')
              .single();
            logRow = result.data ?? null;
            logError = result.error;
          }
        } else {
          const occurrenceId = occurrenceMap.get(reminder.id)?.id;
          if (occurrenceId) {
            const result = await admin
              .from('notification_log')
              .insert({
                reminder_occurrence_id: occurrenceId,
                channel: 'email',
                status: 'sent',
                sent_at: nowIso
              })
              .select('id')
              .single();
            logRow = result.data ?? null;
            logError = result.error;
          }
        }

        const emailResult = await sendEmail({
          to: email,
          subject: isMedication ? title : `Reminder: ${title}`,
          html: reminderEmailTemplate({ title, occurAt: occurAtLabel, actionUrls })
        });
        emailStatus = emailResult.status;
        if (emailResult.status === 'failed') {
          errorMessage = emailResult.error || 'email_failed';
        }
        console.log('[cron] email result', { jobId: job.id, status: emailResult.status });
        if (!logError && logRow?.id) {
          if (isMedication) {
            await updateMedicationLogStatus(logRow.id, emailResult.status);
          } else {
            await updateLogStatus(logRow.id, emailResult.status);
          }
        }
      }
    }

    if (channel === 'push' || channel === 'both') {
      const subs = pushMap.get(job.user_id) ?? [];
      const pushResult = await sendPushNotification(subs, { title, body, url, jobId: job.id, token });
      pushStatus = pushResult.status;
      if (pushResult.status === 'failed') {
        errorMessage = errorMessage || 'push_failed';
      }
      console.log('[cron] push result', { jobId: job.id, status: pushResult.status });
      if (pushResult.staleEndpoints.length) {
        await admin
          .from('push_subscriptions')
          .delete()
          .in('endpoint', pushResult.staleEndpoints);
      }
      let logRow: { id?: string } | null = null;
      let logError: unknown = null;
      if (isMedication) {
        const doseId = medicationDoseMap.get(`${reminder.id}:${job.notify_at}`)?.id;
        if (doseId) {
          const result = await admin
            .from('medication_notification_log')
            .insert({
              medication_dose_id: doseId,
              channel: 'push',
              status: 'sent',
              sent_at: nowIso
            })
            .select('id')
            .single();
          logRow = result.data ?? null;
          logError = result.error;
        }
      } else {
        const occurrenceId = occurrenceMap.get(reminder.id)?.id;
        if (occurrenceId) {
          const result = await admin
            .from('notification_log')
            .insert({
              reminder_occurrence_id: occurrenceId,
              channel: 'push',
              status: 'sent',
              sent_at: nowIso
            })
            .select('id')
            .single();
          logRow = result.data ?? null;
          logError = result.error;
        }
      }

      if (!logError && logRow?.id) {
        if (isMedication) {
          await updateMedicationLogStatus(logRow.id, pushResult.status);
        } else {
          await updateLogStatus(logRow.id, pushResult.status);
        }
      }
    }

    const failed = emailStatus === 'failed' || pushStatus === 'failed';
    console.log('[cron] job final status', { jobId: job.id, status: failed ? 'failed' : 'sent' });
    await updateJobStatus(job.id, failed ? 'failed' : 'sent', failed ? errorMessage : null);
  }

  return NextResponse.json({ ok: true, processed: jobs.length });
}
