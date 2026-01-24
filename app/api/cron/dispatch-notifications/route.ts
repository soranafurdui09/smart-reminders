import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, sendEmail } from '@/lib/notifications';
import { sendPushNotification } from '@/lib/push';
import { reminderEmailTemplate } from '@/lib/templates';
import { evaluateReminderContext, parseContextSettings } from '@/lib/reminders/context';
import { getFreeBusyIntervalsForUser } from '@/lib/google/calendar';
import { deferNotificationJob, rescheduleNotificationJob } from '@/lib/notifications/jobs';
import { buildNotificationJobKey } from '@/lib/notifications/keys';
import { buildCronWindow, isJobDue } from '@/lib/notifications/scheduling';
import { DEFAULT_MAX_RETRIES, getNextRetryAt, shouldRetry } from '@/lib/notifications/retry';
import { computePostponeUntil, findBusyIntervalAt, FREEBUSY_CACHE_WINDOW_MS } from '@/lib/google/freebusy-cache';
import { formatDateTimeWithTimeZone, resolveReminderTimeZone } from '@/lib/dates';
import { buildMedicationDoseInstances, type MedicationRecord, type MedicationScheduleInput } from '@/lib/reminders/medication';

export const runtime = 'nodejs';

type NotificationStatus = 'sent' | 'skipped' | 'failed';

type NotificationJob = {
  id: string;
  reminder_id: string;
  user_id: string;
  notify_at: string;
  channel: 'email' | 'push';
  status: string;
  action_token?: string | null;
  action_token_expires_at?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  occurrence_at_utc?: string | null;
  retry_count?: number | null;
  next_retry_at?: string | null;
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
  const { data: nowValue, error: nowError } = await admin.rpc('get_utc_now');
  if (nowError || !nowValue) {
    console.error('[cron] failed to read utc now', nowError);
    return NextResponse.json({ error: 'now_failed' }, { status: 500 });
  }
  const now = new Date(nowValue as string);
  const nowIso = now.toISOString();
  const windowMinutes = 15;
  const { windowStart, windowEnd } = buildCronWindow(now, {
    graceMinutes: 120,
    lookaheadMinutes: windowMinutes + 2
  });
  const windowStartIso = windowStart.toISOString();
  const windowEndIso = windowEnd.toISOString();
  const appUrl = getAppUrl();
  console.log('[cron] dispatch notifications', {
    now: nowIso,
    windowStart: windowStartIso,
    windowEnd: windowEndIso
  });

  const horizonDays = 7;
  const seedMedicationDoses = async () => {
    const { data: schedules, error: scheduleError } = await admin
      .from('medication_schedules')
      .select(
        'id, schedule_type, days_of_week, times_local, start_date, end_date, interval_hours, dose_amount, dose_unit, reminder_window_minutes, allow_snooze, medication:medications!inner(id, reminder_id, household_id, created_by, patient_member_id, timezone, is_active)'
      )
      .eq('medication.is_active', true);

    if (scheduleError) {
      console.error('[cron] load medication schedules failed', scheduleError);
      return;
    }

    for (const row of schedules ?? []) {
      const medication = Array.isArray(row.medication) ? row.medication[0] : row.medication;
      if (!medication?.id || !medication.reminder_id) continue;
      const schedule: MedicationScheduleInput = {
        schedule_type: row.schedule_type,
        days_of_week: row.days_of_week,
        times_local: row.times_local,
        start_date: row.start_date,
        end_date: row.end_date,
        interval_hours: row.interval_hours,
        dose_amount: row.dose_amount,
        dose_unit: row.dose_unit,
        reminder_window_minutes: row.reminder_window_minutes,
        allow_snooze: row.allow_snooze
      };

      const tz = medication.timezone ?? 'UTC';
      const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(now)
        .replace(/\//g, '-');
      const startDate = schedule.start_date < localToday ? localToday : schedule.start_date;
      if (schedule.end_date && schedule.end_date < startDate) {
        continue;
      }
      const effectiveSchedule: MedicationScheduleInput = {
        ...schedule,
        start_date: startDate
      };

      const planned = buildMedicationDoseInstances({
        medication: medication as MedicationRecord,
        schedule: effectiveSchedule,
        horizonDays,
        timeZone: tz
      });
      if (!planned.length) continue;
      const start = planned[0].scheduled_at;
      const end = planned[planned.length - 1].scheduled_at;
      const { data: existing, error: existingError } = await admin
        .from('medication_doses')
        .select('scheduled_at')
        .eq('medication_id', medication.id)
        .gte('scheduled_at', start)
        .lte('scheduled_at', end);
      if (existingError) {
        console.error('[cron] load medication doses failed', existingError);
        continue;
      }
      const existingSet = new Set((existing ?? []).map((item: any) => item.scheduled_at));
      const inserts = planned
        .filter((dose) => !existingSet.has(dose.scheduled_at))
        .map((dose) => ({
          reminder_id: medication.reminder_id,
          medication_id: medication.id,
          household_id: medication.household_id,
          patient_member_id: medication.patient_member_id ?? null,
          scheduled_at: dose.scheduled_at,
          scheduled_local_date: dose.scheduled_local_date,
          scheduled_local_time: dose.scheduled_local_time,
          confirmation_deadline: dose.confirmation_deadline,
          status: 'pending',
          stock_decremented: false
        }));
      if (!inserts.length) continue;
      const { error: insertError } = await admin.from('medication_doses').insert(inserts);
      if (insertError) {
        console.error('[cron] insert medication doses failed', insertError);
      }
    }
  };

  const markMissedDoses = async () => {
    const { error } = await admin
      .from('medication_doses')
      .update({ status: 'missed', missed_at: nowIso })
      .eq('status', 'pending')
      .lt('confirmation_deadline', nowIso);
    if (error) {
      console.error('[cron] mark missed doses failed', error);
    }
  };

  await seedMedicationDoses();
  await markMissedDoses();

  const seedKeySet = new Set<string>();
  const addSeedKey = (key: string) => {
    if (seedKeySet.has(key)) return false;
    seedKeySet.add(key);
    return true;
  };

  const { data: occurrenceSeeds } = await admin
    .from('reminder_occurrences')
    .select('id, occur_at, snoozed_until, reminder:reminders!inner(id, created_by, is_active)')
    .in('status', ['open', 'snoozed'])
    .or(
      `and(snoozed_until.gte.${windowStartIso},snoozed_until.lte.${windowEndIso}),and(snoozed_until.is.null,occur_at.gte.${windowStartIso},occur_at.lte.${windowEndIso})`
    );

  const seedChannels: Array<'email' | 'push'> = ['email', 'push'];

  const occurrenceInserts = (occurrenceSeeds ?? [])
    .flatMap((occurrence: any) => {
      const reminder = Array.isArray(occurrence.reminder) ? occurrence.reminder[0] : occurrence.reminder;
      if (!reminder?.id || !reminder?.created_by || reminder.is_active === false) {
        return [];
      }
      const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
      return seedChannels
        .map((channel) => ({
          reminder_id: reminder.id,
          user_id: reminder.created_by,
          notify_at: effectiveAt,
          channel,
          status: 'pending' as const,
          entity_type: 'reminder' as const,
          entity_id: reminder.id,
          occurrence_at_utc: effectiveAt
        }))
        .filter((job) =>
          addSeedKey(
            buildNotificationJobKey({
              entityType: job.entity_type,
              entityId: job.entity_id,
              occurrenceAtUtc: job.occurrence_at_utc,
              channel: job.channel,
              userId: job.user_id
            })
          )
        );
    });

  const { data: medicationSeeds } = await admin
    .from('medication_doses')
    .select('id, scheduled_at, snoozed_until, confirmation_deadline, reminder:reminders!inner(id, created_by, is_active)')
    .eq('status', 'pending')
    .or(
      `and(snoozed_until.gte.${windowStartIso},snoozed_until.lte.${windowEndIso}),and(snoozed_until.is.null,scheduled_at.gte.${windowStartIso},scheduled_at.lte.${windowEndIso})`
    );

  const medicationInserts = (medicationSeeds ?? [])
    .flatMap((dose: any) => {
      const reminder = Array.isArray(dose.reminder) ? dose.reminder[0] : dose.reminder;
      if (!reminder?.id || !reminder?.created_by || reminder.is_active === false) {
        return [];
      }
      const effectiveAt = dose.snoozed_until ?? dose.scheduled_at;
      const followUpAt = dose.confirmation_deadline
        ? new Date(new Date(effectiveAt).getTime() + 10 * 60000)
        : null;
      const followUpIso =
        followUpAt && new Date(dose.confirmation_deadline).getTime() > followUpAt.getTime()
          ? followUpAt.toISOString()
          : null;

      const baseJobs = seedChannels.map((channel) => ({
        reminder_id: reminder.id,
        user_id: reminder.created_by,
        notify_at: effectiveAt,
        channel,
        status: 'pending' as const,
        entity_type: 'medication_dose' as const,
        entity_id: dose.id,
        occurrence_at_utc: effectiveAt
      }));
      const followUpJobs = followUpIso
        ? seedChannels.map((channel) => ({
            reminder_id: reminder.id,
            user_id: reminder.created_by,
            notify_at: followUpIso,
            channel,
            status: 'pending' as const,
            entity_type: 'medication_dose' as const,
            entity_id: dose.id,
            occurrence_at_utc: followUpIso
          }))
        : [];

      return [...baseJobs, ...followUpJobs].filter((job) =>
        addSeedKey(
          buildNotificationJobKey({
            entityType: job.entity_type,
            entityId: job.entity_id,
            occurrenceAtUtc: job.occurrence_at_utc,
            channel: job.channel,
            userId: job.user_id
          })
        )
      );
    });

  const seedInserts = [...occurrenceInserts, ...medicationInserts];
  console.log('[cron] seed candidates', {
    occurrences: occurrenceInserts.length,
    medications: medicationInserts.length
  });
  if (seedInserts.length) {
    const { error: seedError } = await admin
      .from('notification_jobs')
      .upsert(seedInserts, {
        onConflict: 'entity_type,entity_id,occurrence_at_utc,channel,user_id',
        ignoreDuplicates: true
      });
    if (seedError) {
      console.error('[notifications] seed jobs failed', seedError);
    }
  }

  const seedCaregiverEscalations = async () => {
    const escalationStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: doses, error: dosesError } = await admin
      .from('medication_doses')
      .select('id, medication_id, reminder_id, scheduled_at, snoozed_until, escalation_notified_at, patient_member_id, medication:medications!inner(id, name, household_id, created_by)')
      .eq('status', 'pending')
      .is('escalation_notified_at', null)
      .not('patient_member_id', 'is', null)
      .gte('scheduled_at', escalationStart)
      .lte('scheduled_at', nowIso);

    if (dosesError) {
      console.error('[cron] load escalation doses failed', dosesError);
      return;
    }
    if (!doses?.length) return;

    const patientIds = Array.from(new Set(doses.map((dose: any) => dose.patient_member_id).filter(Boolean)));
    const { data: caregivers, error: caregiversError } = await admin
      .from('medication_caregivers')
      .select('patient_member_id, caregiver_member_id, escalation_after_minutes, escalation_channels, escalation_enabled')
      .in('patient_member_id', patientIds)
      .eq('escalation_enabled', true);

    if (caregiversError) {
      console.error('[cron] load caregivers failed', caregiversError);
      return;
    }

    const caregiverIds = Array.from(
      new Set((caregivers ?? []).map((row: any) => row.caregiver_member_id).filter(Boolean))
    );
    const { data: caregiverMembers } = await admin
      .from('household_members')
      .select('id, user_id')
      .in('id', caregiverIds);
    const caregiverUserMap = new Map((caregiverMembers ?? []).map((row: any) => [row.id, row.user_id]));

    const inserts: any[] = [];
    const notifiedDoseIds: string[] = [];
    const doseMetaMap = new Map(
      doses.map((dose: any) => [
        dose.id,
        {
          householdId: dose.medication?.household_id ?? null,
          medicationId: dose.medication_id,
          actorId: dose.medication?.created_by ?? null
        }
      ])
    );

    doses.forEach((dose: any) => {
      const caregiversForPatient = (caregivers ?? []).filter(
        (row: any) => row.patient_member_id === dose.patient_member_id
      );
      if (!caregiversForPatient.length) return;

      const effectiveAt = new Date(dose.snoozed_until ?? dose.scheduled_at);
      let insertedForDose = false;
      caregiversForPatient.forEach((row: any) => {
        const delayMinutes = Math.max(5, Number(row.escalation_after_minutes || 30));
        const escalationAt = new Date(effectiveAt.getTime() + delayMinutes * 60000);
        if (escalationAt.getTime() > now.getTime()) return;

        const caregiverUserId = caregiverUserMap.get(row.caregiver_member_id);
        if (!caregiverUserId) return;
        const channels = Array.isArray(row.escalation_channels) && row.escalation_channels.length
          ? row.escalation_channels
          : ['push'];

        channels.forEach((channel: string) => {
          if (!['email', 'push'].includes(channel)) return;
          const channelValue = channel === 'email' ? 'email' : 'push';
          const job = {
            reminder_id: dose.reminder_id,
            user_id: caregiverUserId,
            notify_at: escalationAt.toISOString(),
            channel: channelValue,
            status: 'pending' as const,
            entity_type: 'medication_dose' as const,
            entity_id: dose.id,
            occurrence_at_utc: escalationAt.toISOString()
          };
          if (
            addSeedKey(
              buildNotificationJobKey({
                entityType: job.entity_type,
                entityId: job.entity_id,
                occurrenceAtUtc: job.occurrence_at_utc,
                channel: job.channel,
                userId: job.user_id
              })
            )
          ) {
            inserts.push(job);
            insertedForDose = true;
          }
        });
      });

      if (insertedForDose) {
        notifiedDoseIds.push(dose.id);
      }
    });

    if (inserts.length) {
      const { error: insertError } = await admin
        .from('notification_jobs')
        .upsert(inserts, {
          onConflict: 'entity_type,entity_id,occurrence_at_utc,channel,user_id',
          ignoreDuplicates: true
        });
      if (insertError) {
        console.error('[cron] caregiver job insert failed', insertError);
      }
    }

    if (notifiedDoseIds.length) {
      await admin
        .from('medication_doses')
        .update({ escalation_notified_at: nowIso })
        .in('id', notifiedDoseIds);

      const events = notifiedDoseIds
        .map((doseId) => {
          const meta = doseMetaMap.get(doseId);
          if (!meta?.householdId || !meta?.medicationId || !meta?.actorId) return null;
          return {
            household_id: meta.householdId,
            medication_id: meta.medicationId,
            dose_instance_id: doseId,
            actor_profile_id: meta.actorId,
            event_type: 'caregiver_notified',
            payload: { reason: 'unconfirmed' }
          };
        })
        .filter(Boolean);
      if (events.length) {
        await admin.from('medication_events').insert(events);
      }
    }
  };

  await seedCaregiverEscalations();

  const claimToken = crypto.randomBytes(16).toString('hex');
  const { data: jobs, error } = await admin.rpc('claim_notification_jobs', {
    p_window_start: windowStartIso,
    p_window_end: windowEndIso,
    p_limit: 1000,
    p_claim_token: claimToken
  });

  if (error) {
    console.error('[notifications] claim jobs failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
  const claimedJobs = (jobs ?? []) as NotificationJob[];
  console.log('[cron] claimed jobs', {
    count: claimedJobs.length,
    sample: claimedJobs.slice(0, 3).map((job) => job.id)
  });

  if (!claimedJobs.length) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const reminderIds = Array.from(new Set(claimedJobs.map((job) => job.reminder_id)));
  const userIds = Array.from(new Set(claimedJobs.map((job) => job.user_id)));

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
    .select('user_id, email, time_zone, context_defaults, notify_by_email, notify_by_push')
    .in('user_id', userIds);
  const profileMap = new Map(
    (profiles ?? []).map((profile: any) => [
      profile.user_id,
      {
        email: profile.email,
        timeZone: profile.time_zone,
        contextDefaults: parseContextSettings(profile.context_defaults ?? null),
        notifyByEmail: profile.notify_by_email ?? true,
        notifyByPush: profile.notify_by_push ?? false
      }
    ])
  );

  const { data: subscriptions, error: subscriptionsError } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds)
    .eq('is_disabled', false);
  if (subscriptionsError) {
    console.warn('[cron] failed to load push subscriptions', subscriptionsError);
  }
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
    const times = [occurrence.occur_at, occurrence.snoozed_until].filter(Boolean);
    times.forEach((time) => {
      occurrenceMap.set(`${occurrence.reminder_id}:${time}`, occurrence);
    });
  });

  const { data: medicationDoses } = await admin
    .from('medication_doses')
    .select('id, reminder_id, scheduled_at, snoozed_until, confirmation_deadline, status')
    .in('reminder_id', reminderIds)
    .eq('status', 'pending')
    .gte('scheduled_at', windowStartIso)
    .lte('scheduled_at', windowEndIso);
  const medicationDoseMap = new Map<string, { id: string; scheduled_at: string; reminder_id: string; status: string; snoozed_until?: string | null; confirmation_deadline?: string | null }>();
  (medicationDoses ?? []).forEach((dose: any) => {
    medicationDoseMap.set(`${dose.reminder_id}:${dose.scheduled_at}`, dose);
    medicationDoseMap.set(dose.id, dose);
  });

  const releaseJob = async (jobId: string) => {
    await admin
      .from('notification_jobs')
      .update({
        status: 'pending',
        claimed_at: null,
        claim_token: null,
        updated_at: nowIso
      })
      .eq('id', jobId);
  };

  const markJobSent = async (jobId: string) => {
    await admin
      .from('notification_jobs')
      .update({
        status: 'sent',
        last_error: null,
        delivered_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', jobId);
  };

  const markJobSkipped = async (jobId: string, reason?: string | null) => {
    await admin
      .from('notification_jobs')
      .update({
        status: 'skipped',
        last_error: reason ?? null,
        updated_at: nowIso
      })
      .eq('id', jobId);
  };

  const markJobFailed = async (job: NotificationJob, errorMessage: string | null) => {
    const currentRetry = job.retry_count ?? 0;
    const nextRetryCount = currentRetry + 1;
    if (shouldRetry(currentRetry, DEFAULT_MAX_RETRIES)) {
      const nextRetryAt = getNextRetryAt(now, nextRetryCount).toISOString();
      await admin
        .from('notification_jobs')
        .update({
          status: 'pending',
          retry_count: nextRetryCount,
          next_retry_at: nextRetryAt,
          last_error: errorMessage ?? null,
          claimed_at: null,
          claim_token: null,
          updated_at: nowIso
        })
        .eq('id', job.id);
      return;
    }

    await admin
      .from('notification_jobs')
      .update({
        status: 'failed',
        retry_count: nextRetryCount,
        last_error: errorMessage ?? null,
        updated_at: nowIso
      })
      .eq('id', job.id);
  };

  const updateLogStatus = async (logId: string, status: NotificationStatus, errorMessage?: string | null) => {
    await admin
      .from('notification_log')
      .update({ status, error: errorMessage ?? null })
      .eq('id', logId);
  };

  const updateMedicationLogStatus = async (logId: string, status: NotificationStatus) => {
    await admin
      .from('medication_notification_log')
      .update({ status })
      .eq('id', logId);
  };

  const isUniqueViolation = (error: any) => error?.code === '23505';

  const insertReminderLog = async (options: {
    occurrenceId: string;
    reminderId: string;
    occurrenceAtUtc: string;
    channel: 'email' | 'push';
  }) => {
    const { data, error: insertError } = await admin
      .from('notification_log')
      .insert({
        reminder_occurrence_id: options.occurrenceId,
        reminder_id: options.reminderId,
        occurrence_at_utc: options.occurrenceAtUtc,
        channel: options.channel,
        status: 'sent',
        sent_at: nowIso
      })
      .select('id')
      .single();
    if (isUniqueViolation(insertError)) {
      return { skip: true, id: null };
    }
    if (insertError) {
      console.error('[notifications] log insert failed', insertError);
      return { skip: false, id: null, error: insertError };
    }
    return { skip: false, id: data?.id ?? null };
  };

  const insertMedicationLog = async (options: { doseId: string; channel: 'email' | 'push'; userId: string }) => {
    const { data, error: insertError } = await admin
      .from('medication_notification_log')
      .insert({
        medication_dose_id: options.doseId,
        user_id: options.userId,
        channel: options.channel,
        status: 'sent',
        sent_at: nowIso
      })
      .select('id')
      .single();
    if (isUniqueViolation(insertError)) {
      return { skip: true, id: null };
    }
    if (insertError) {
      console.error('[notifications] medication log insert failed', insertError);
      return { skip: false, id: null, error: insertError };
    }
    return { skip: false, id: data?.id ?? null };
  };

  const toWallClockDate = (date: Date, timeZone: string) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const lookup: Record<string, string> = {};
    parts.forEach((part) => {
      if (part.type !== 'literal') {
        lookup[part.type] = part.value;
      }
    });
    const year = Number(lookup.year);
    const month = Number(lookup.month);
    const day = Number(lookup.day);
    const hour = Number(lookup.hour);
    const minute = Number(lookup.minute);
    return new Date(Date.UTC(year, month - 1, day, hour, minute));
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

  let processedCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let maxLagMinutes = 0;

  for (const job of claimedJobs) {
    if (job.status !== 'processing') continue;
    processedCount += 1;
    console.log('[cron] processing job', {
      jobId: job.id,
      reminderId: job.reminder_id,
      userId: job.user_id,
      channel: job.channel,
      notifyAt: job.notify_at,
      occurrenceAtUtc: job.occurrence_at_utc ?? null,
      reminderTimeZone: reminderMap.get(job.reminder_id)?.tz ?? null
    });

    const notifyAt = new Date(job.notify_at);
    const lagMinutes = Math.max(0, Math.round((now.getTime() - notifyAt.getTime()) / 60000));
    maxLagMinutes = Math.max(maxLagMinutes, lagMinutes);

    if (!isJobDue(now, windowStart, notifyAt)) {
      await releaseJob(job.id);
      continue;
    }

    const reminder = reminderMap.get(job.reminder_id);
    if (!reminder?.household_id || !reminder?.is_active || !reminder.created_by) {
      await markJobFailed(job, 'reminder_inactive');
      failedCount += 1;
      continue;
    }

    const isMedication = reminder.kind === 'medication';
    const doseRecord = isMedication
      ? (job.entity_type === 'medication_dose'
          ? medicationDoseMap.get(job.entity_id ?? '')
          : medicationDoseMap.get(`${reminder.id}:${job.notify_at}`))
      : null;
    if (isMedication) {
      if (!doseRecord) {
        await markJobFailed(job, 'dose_missing');
        failedCount += 1;
        continue;
      }
      if (doseRecord.status !== 'pending') {
        await markJobSkipped(job.id, 'dose_not_pending');
        skippedCount += 1;
        continue;
      }
      const effectiveAt = doseRecord.snoozed_until ?? doseRecord.scheduled_at;
      if (new Date(job.notify_at).getTime() < new Date(effectiveAt).getTime()) {
        await rescheduleNotificationJob({ jobId: job.id, notifyAt: new Date(effectiveAt) });
        continue;
      }
    }

    const profile = profileMap.get(job.user_id);
    const userTimeZone = profile?.timeZone || 'UTC';
    const displayTimeZone = resolveReminderTimeZone(reminder.tz ?? null, userTimeZone);
    const occurrenceAtUtc = job.occurrence_at_utc ?? job.notify_at;
    const occurAtLabel = formatDateTimeWithTimeZone(notifyAt, displayTimeZone);
    const settings = settingsMap.get(reminder.id)
      ?? parseContextSettings(
        reminder.context_settings ?? null,
        profileMap.get(reminder.created_by)?.contextDefaults ?? undefined
      );
    const busyInterval = settings.calendarBusy?.enabled
      ? busyIntervalMap.get(reminder.created_by) ?? null
      : null;
    const isBusy = Boolean(busyInterval);
    const contextNow = displayTimeZone ? toWallClockDate(now, displayTimeZone) : now;
    const contextDueAt = displayTimeZone ? toWallClockDate(notifyAt, displayTimeZone) : notifyAt;
    const decision = evaluateReminderContext({
      now: contextNow,
      reminderDueAt: contextDueAt,
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
        const occurrence = occurrenceMap.get(`${reminder.id}:${job.notify_at}`);
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
      await deferNotificationJob({ jobId: job.id, minutes: 15, now });
      continue;
    }

    const allowEmail = profile?.notifyByEmail ?? true;
    const allowPush = profile?.notifyByPush ?? false;
    if (job.channel === 'email' && !allowEmail) {
      await markJobSkipped(job.id, 'pref_email_off');
      skippedCount += 1;
      continue;
    }
    if (job.channel === 'push' && !allowPush) {
      await markJobSkipped(job.id, 'pref_push_off');
      skippedCount += 1;
      continue;
    }

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

    if (job.channel === 'email') {
      const email = profile?.email;
      if (!email) {
        await markJobSkipped(job.id, 'missing_email');
        skippedCount += 1;
        continue;
      }

      let logId: string | null = null;
      let skip = false;
      if (isMedication) {
        const doseId = doseRecord?.id ?? (job.entity_type === 'medication_dose' ? job.entity_id : null);
        if (doseId) {
          const logResult = await insertMedicationLog({ doseId, channel: 'email', userId: job.user_id });
          skip = logResult.skip;
          logId = logResult.id;
          if (logResult.error) {
            await markJobFailed(job, 'log_insert_failed');
            failedCount += 1;
            continue;
          }
        } else {
          await markJobFailed(job, 'dose_missing');
          failedCount += 1;
          continue;
        }
      } else {
        const occurrenceId = occurrenceMap.get(`${reminder.id}:${job.notify_at}`)?.id;
        if (occurrenceId) {
          const logResult = await insertReminderLog({
            occurrenceId,
            reminderId: reminder.id,
            occurrenceAtUtc,
            channel: 'email'
          });
          skip = logResult.skip;
          logId = logResult.id;
          if (logResult.error) {
            await markJobFailed(job, 'log_insert_failed');
            failedCount += 1;
            continue;
          }
        } else {
          await markJobFailed(job, 'occurrence_missing');
          failedCount += 1;
          continue;
        }
      }

      if (skip) {
        await markJobSkipped(job.id, 'duplicate');
        skippedCount += 1;
        continue;
      }

      if (logId) {
        const emailResult = await sendEmail({
          to: email,
          subject: isMedication ? title : `Reminder: ${title}`,
          html: reminderEmailTemplate({ title, occurAt: occurAtLabel, actionUrls })
        });
        console.log('[cron] email result', { jobId: job.id, status: emailResult.status });
        if (isMedication) {
          await updateMedicationLogStatus(logId, emailResult.status);
        } else {
          await updateLogStatus(logId, emailResult.status, emailResult.error ?? null);
        }
        if (emailResult.status === 'failed') {
          await markJobFailed(job, emailResult.error ?? 'email_failed');
          failedCount += 1;
          continue;
        }
        if (emailResult.status === 'skipped') {
          await markJobSkipped(job.id, 'email_skipped');
          skippedCount += 1;
          continue;
        }
      }
    }

    if (job.channel === 'push') {
      if (subscriptionsError) {
        await markJobFailed(job, 'push_subscriptions_query_failed');
        failedCount += 1;
        continue;
      }
      const subs = pushMap.get(job.user_id) ?? [];
      if (!subs.length) {
        await markJobSkipped(job.id, 'missing_push');
        skippedCount += 1;
        continue;
      }

      let logId: string | null = null;
      let skip = false;
      if (isMedication) {
        const doseId = doseRecord?.id ?? (job.entity_type === 'medication_dose' ? job.entity_id : null);
        if (doseId) {
          const logResult = await insertMedicationLog({ doseId, channel: 'push', userId: job.user_id });
          skip = logResult.skip;
          logId = logResult.id;
          if (logResult.error) {
            await markJobFailed(job, 'log_insert_failed');
            failedCount += 1;
            continue;
          }
        } else {
          await markJobFailed(job, 'dose_missing');
          failedCount += 1;
          continue;
        }
      } else {
        const occurrenceId = occurrenceMap.get(`${reminder.id}:${job.notify_at}`)?.id;
        if (occurrenceId) {
          const logResult = await insertReminderLog({
            occurrenceId,
            reminderId: reminder.id,
            occurrenceAtUtc,
            channel: 'push'
          });
          skip = logResult.skip;
          logId = logResult.id;
          if (logResult.error) {
            await markJobFailed(job, 'log_insert_failed');
            failedCount += 1;
            continue;
          }
        } else {
          await markJobFailed(job, 'occurrence_missing');
          failedCount += 1;
          continue;
        }
      }

      if (skip) {
        await markJobSkipped(job.id, 'duplicate');
        skippedCount += 1;
        continue;
      }

      if (logId) {
        const pushResult = await sendPushNotification(subs, { title, body, url, jobId: job.id, token });
        console.log('[cron] push result', { jobId: job.id, status: pushResult.status });
        if (pushResult.staleEndpoints.length) {
          await admin
            .from('push_subscriptions')
            .delete()
            .in('endpoint', pushResult.staleEndpoints);
        }
        if (isMedication) {
          await updateMedicationLogStatus(logId, pushResult.status);
        } else {
          await updateLogStatus(logId, pushResult.status, pushResult.status === 'failed' ? 'push_failed' : null);
        }
        if (pushResult.status === 'failed') {
          await markJobFailed(job, 'push_failed');
          failedCount += 1;
          continue;
        }
        if (pushResult.status === 'skipped') {
          await markJobSkipped(job.id, 'push_skipped');
          skippedCount += 1;
          continue;
        }
      }
    }

    await markJobSent(job.id);
    sentCount += 1;
  }

  console.log('[cron] run summary', {
    claimed: claimedJobs.length,
    processed: processedCount,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    maxLagMinutes
  });

  return NextResponse.json({
    ok: true,
    processed: processedCount,
    sent: sentCount,
    failed: failedCount,
    skipped: skippedCount,
    maxLagMinutes
  });
}
