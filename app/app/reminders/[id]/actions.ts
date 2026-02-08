'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { generateReminderEmbedding } from '@/lib/ai/embeddings';
import { clearReminderAssignment, setReminderAssignment } from '@/lib/reminderAssignments';
import { createCalendarEventForMedication, deleteCalendarEventForReminder, getUserGoogleConnection } from '@/lib/google/calendar';
import { getDefaultContextSettings, isDefaultContextSettings, type DayOfWeek } from '@/lib/reminders/context';
import { getUserContextDefaults } from '@/lib/data';
import { isReminderCategoryId } from '@/lib/categories';
import { ensureMedicationDoses, getFirstMedicationDose, type MedicationDetails, type MedicationFrequencyType } from '@/lib/reminders/medication';
import { scheduleNotificationJobsForMedication, scheduleNotificationJobsForReminder } from '@/lib/notifications/jobs';
import { localDateTimeToUtc, resolveTimeZone } from '@/lib/time/schedule';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

function normalizeHour(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(23, Math.max(0, Math.floor(num)));
}

function normalizeMinutes(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(1440, Math.floor(num));
}

function buildContextSettings(formData: FormData, defaults?: ReturnType<typeof getDefaultContextSettings>) {
  const baseDefaults = defaults ?? getDefaultContextSettings();
  const timeWindowEnabled = String(formData.get('context_time_window_enabled') || '') === '1';
  const startHour = normalizeHour(formData.get('context_time_start_hour'), baseDefaults.timeWindow?.startHour ?? 9);
  const endHour = normalizeHour(formData.get('context_time_end_hour'), baseDefaults.timeWindow?.endHour ?? 20);
  const daysOfWeek = formData
    .getAll('context_time_days')
    .map((day) => String(day))
    .filter((day): day is DayOfWeek => DAYS.includes(day as DayOfWeek));
  const calendarEnabled = String(formData.get('context_calendar_busy_enabled') || '') === '1';
  const snoozeMinutes = normalizeMinutes(
    formData.get('context_calendar_snooze_minutes'),
    baseDefaults.calendarBusy?.snoozeMinutes ?? 15
  );
  const categoryRaw = String(formData.get('context_category') || '').trim();
  const categoryId = categoryRaw && isReminderCategoryId(categoryRaw) ? categoryRaw : null;

  const settings = {
    timeWindow: {
      enabled: timeWindowEnabled,
      startHour,
      endHour,
      daysOfWeek
    },
    calendarBusy: {
      enabled: calendarEnabled,
      snoozeMinutes
    }
  };

  const baseIsDefault = isDefaultContextSettings(settings, baseDefaults);
  if (categoryId) {
    return baseIsDefault ? { category: categoryId } : { ...settings, category: categoryId };
  }
  return baseIsDefault ? null : settings;
}

function resolveDueAtFromForm(dueAtIso: string, dueAtRaw: string, timeZone: string) {
  if (dueAtRaw) {
    const tz = resolveTimeZone(timeZone);
    try {
      return localDateTimeToUtc(dueAtRaw, tz);
    } catch {
      return new Date(dueAtRaw);
    }
  }
  if (dueAtIso) {
    return new Date(dueAtIso);
  }
  return null;
}

export async function updateReminder(formData: FormData) {
  const reminderId = String(formData.get('reminderId'));
  const user = await requireUser(`/app/reminders/${reminderId}`);
  const contextDefaults = await getUserContextDefaults(user.id);
  const hasNotifyPolicy = formData.has('user_notify_until_done');
  const notifyUntilDone = String(formData.get('user_notify_until_done') || '') === '1';
  const notifyIntervalRaw = String(formData.get('user_notify_interval_minutes') || '').trim();

  const supabase = createServerClient();
  const { data: reminderRecord } = await supabase
    .from('reminders')
    .select('id, household_id, kind, created_by, due_at, pre_reminder_minutes, google_event_id, tz')
    .eq('id', reminderId)
    .maybeSingle();

  if (!reminderRecord) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  const contextSettings = buildContextSettings(formData, contextDefaults);
  const payload: Record<string, string | number | null | object> = {
    context_settings: contextSettings
  };

  let assignedMemberId: string | null = null;
  let assignedUserId: string | null = null;
  let resolvedTitle = '';
  let resolvedNotes: string | null = null;
  let regenerateDoses = false;
  let medicationDetails: MedicationDetails | null = null;
  let medicationAddCalendar = false;
  let effectiveDueAt: Date | null = null;
  let effectivePreReminder: number | null = null;
  let medicationTimeZone: string | null = null;

  if (reminderRecord.kind === 'medication') {
    const name = String(formData.get('med_name') || '').trim();
    const dose = String(formData.get('med_dose') || '').trim();
    const frequencyRaw = String(formData.get('med_frequency_type') || 'once_per_day');
    const frequencyType: MedicationFrequencyType = ['once_per_day', 'times_per_day', 'every_n_hours']
      .includes(frequencyRaw)
      ? (frequencyRaw as MedicationFrequencyType)
      : 'once_per_day';
    const timesPerDay = Number(formData.get('med_times_per_day') || 1);
    const everyNHours = Number(formData.get('med_every_n_hours') || 8);
    const startDate = String(formData.get('med_start_date') || '').trim();
    const endDate = String(formData.get('med_end_date') || '').trim();
    const personId = String(formData.get('med_person_id') || '').trim() || null;
    medicationAddCalendar = String(formData.get('med_add_to_calendar') || '') === '1';

    const timeInputs = ['med_time_1', 'med_time_2', 'med_time_3', 'med_time_4']
      .map((key) => String(formData.get(key) || '').trim())
      .filter(Boolean);

    if (!name || !startDate) {
      redirect(`/app/reminders/${reminderId}/edit?error=missing-medication`);
    }

    medicationDetails = {
      name,
      dose: dose || null,
      personId,
      frequencyType,
      timesPerDay: frequencyType === 'times_per_day' ? Math.min(4, Math.max(1, timesPerDay)) : undefined,
      everyNHours: frequencyType === 'every_n_hours' ? Math.max(1, Math.min(24, everyNHours)) : undefined,
      timesOfDay: timeInputs.length ? timeInputs : undefined,
      startDate,
      endDate: endDate || null,
      addToCalendar: medicationAddCalendar
    };

    resolvedTitle = name || 'Medicament';
    resolvedNotes = dose ? `Doza: ${dose}` : null;
    medicationTimeZone = String(formData.get('tz') || '').trim() || reminderRecord?.tz || 'UTC';
    const firstDose = medicationDetails ? getFirstMedicationDose(medicationDetails, medicationTimeZone) : null;
    payload.title = resolvedTitle;
    payload.notes = resolvedNotes;
    payload.schedule_type = 'once';
    payload.recurrence_rule = null;
    payload.pre_reminder_minutes = null;
    payload.due_at = firstDose ? new Date(firstDose).toISOString() : new Date().toISOString();
    payload.medication_details = medicationDetails;
    assignedMemberId = personId;
    regenerateDoses = Boolean(medicationDetails);
    effectiveDueAt = firstDose ? new Date(firstDose) : new Date();
    effectivePreReminder = null;
  } else {
    const title = String(formData.get('title') || '').trim();
    const notes = String(formData.get('notes') || '').trim();
    const dueAtRaw = String(formData.get('due_at') || '').trim();
    const dueAtIso = String(formData.get('due_at_iso') || '').trim();
    const tz = String(formData.get('tz') || '').trim();
    const scheduleTypeRaw = String(formData.get('schedule_type') || 'once');
    const scheduleType = ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(scheduleTypeRaw)
      ? scheduleTypeRaw
      : 'once';
    const recurrenceRuleRaw = String(formData.get('recurrence_rule') || '').trim();
    const preReminderRaw = String(formData.get('pre_reminder_minutes') || '').trim();
    const assignedMemberRaw = String(formData.get('assigned_member_id') || '').trim();

    if (!title) {
      redirect(`/app/reminders/${reminderId}/edit?error=missing-title`);
    }

    resolvedTitle = title;
    resolvedNotes = notes || null;
    payload.title = title;
    payload.notes = notes || null;
    payload.schedule_type = scheduleType;
    payload.recurrence_rule = recurrenceRuleRaw || null;
    const resolvedDueAt = resolveDueAtFromForm(dueAtIso, dueAtRaw, tz);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[debug][updateReminder] due_at inputs', {
        dueAtRaw,
        dueAtIso,
        tz,
        resolvedIso: resolvedDueAt?.toISOString() ?? null
      });
    }
    if (resolvedDueAt) {
      payload.due_at = resolvedDueAt.toISOString();
    }
    const preReminderMinutes = preReminderRaw ? Number(preReminderRaw) : null;
    payload.pre_reminder_minutes = Number.isFinite(preReminderMinutes) ? preReminderMinutes : null;
    assignedMemberId = assignedMemberRaw || null;
    effectiveDueAt = resolvedDueAt
      ? resolvedDueAt
      : reminderRecord.due_at
        ? new Date(reminderRecord.due_at)
        : null;
    effectivePreReminder = Number.isFinite(preReminderMinutes)
      ? preReminderMinutes
      : reminderRecord.pre_reminder_minutes ?? null;
  }

  if (assignedMemberId) {
    const { data: member } = await supabase
      .from('household_members')
      .select('id, user_id')
      .eq('id', assignedMemberId)
      .eq('household_id', reminderRecord.household_id)
      .maybeSingle();
    if (!member) {
      assignedMemberId = null;
    } else {
      assignedUserId = member.user_id;
    }
  }
  payload.assigned_member_id = assignedMemberId;
  const tz = String(formData.get('tz') || '').trim();
  if (tz) {
    payload.tz = tz;
  }
  if (hasNotifyPolicy) {
    const notifyIntervalMinutes = notifyIntervalRaw ? Number(notifyIntervalRaw) : Number.NaN;
    const notifyIntervalValue = Number.isFinite(notifyIntervalMinutes)
      ? Math.min(1440, Math.max(1, Math.floor(notifyIntervalMinutes)))
      : null;
    payload.user_notify_policy = notifyUntilDone ? 'UNTIL_DONE' : 'ONCE';
    payload.user_notify_interval_minutes = notifyUntilDone ? (notifyIntervalValue ?? 120) : null;
  }

  const { error } = await supabase.from('reminders').update(payload).eq('id', reminderId);
  if (error) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  if (assignedUserId) {
    const result = await setReminderAssignment(reminderId, assignedUserId, user.id);
    if (!result.ok) {
      console.error('[reminders] assignment update failed', result.error);
    }
  } else {
    const result = await clearReminderAssignment(reminderId, user.id);
    if (!result.ok) {
      console.error('[reminders] assignment clear failed', result.error);
    }
  }

  if (regenerateDoses && medicationDetails) {
    await supabase.from('medication_doses').delete().eq('reminder_id', reminderId);
    await ensureMedicationDoses(reminderId, medicationDetails, medicationTimeZone);
    await scheduleNotificationJobsForMedication({
      reminderId,
      userId: reminderRecord.created_by || user.id
    });
    try {
      if (!medicationAddCalendar && reminderRecord.google_event_id) {
        await deleteCalendarEventForReminder({ userId: user.id, reminderId });
      }
      if (medicationAddCalendar) {
        const googleConnection = await getUserGoogleConnection(user.id);
        if (googleConnection) {
          if (reminderRecord.google_event_id) {
            await deleteCalendarEventForReminder({ userId: user.id, reminderId });
          }
          await createCalendarEventForMedication({ userId: user.id, reminderId, details: medicationDetails });
        }
      }
    } catch (error) {
      console.error('[google] medication calendar update failed', error);
    }
  }

  try {
    const embedding = await generateReminderEmbedding(resolvedTitle, resolvedNotes || null);
    if (embedding) {
      await supabase.from('reminders').update({ embedding }).eq('id', reminderId);
    }
  } catch (error) {
    console.error('[embeddings] update reminder failed', error);
  }

  if (reminderRecord.kind !== 'medication' && effectiveDueAt) {
    await scheduleNotificationJobsForReminder({
      reminderId,
      userId: reminderRecord.created_by || user.id,
      dueAt: effectiveDueAt,
      preReminderMinutes: effectivePreReminder ?? undefined,
      channel: 'both'
    });
  }

  revalidatePath(`/app/reminders/${reminderId}`);
  revalidatePath('/app');
  revalidatePath('/app/calendar');
  redirect(`/app/reminders/${reminderId}`);
}

export async function cloneReminder(formData: FormData) {
  const reminderId = String(formData.get('reminderId'));
  const user = await requireUser(`/app/reminders/${reminderId}`);

  const supabase = createServerClient();
  const { data: reminder, error } = await supabase
    .from('reminders')
    .select('household_id, title, notes, schedule_type, due_at, tz, is_active, pre_reminder_minutes')
    .eq('id', reminderId)
    .single();

  if (error || !reminder) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  const dueAt = reminder.due_at ? new Date(reminder.due_at) : new Date();
  const { data: cloned, error: cloneError } = await supabase
    .from('reminders')
    .insert({
      household_id: reminder.household_id,
      created_by: user.id,
      title: `${reminder.title} (copie)`,
      notes: reminder.notes,
      schedule_type: reminder.schedule_type,
      due_at: dueAt.toISOString(),
      tz: reminder.tz,
      is_active: reminder.is_active
    })
    .select('id')
    .single();

  if (cloneError || !cloned) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  try {
    const embedding = await generateReminderEmbedding(`${reminder.title} (copie)`, reminder.notes || null);
    if (embedding) {
      await supabase.from('reminders').update({ embedding }).eq('id', cloned.id);
    }
  } catch (error) {
    console.error('[embeddings] clone reminder failed', error);
  }

  await supabase.from('reminder_occurrences').insert({
    reminder_id: cloned.id,
    occur_at: dueAt.toISOString(),
    status: 'open'
  });
  await scheduleNotificationJobsForReminder({
    reminderId: cloned.id,
    userId: user.id,
    dueAt,
    preReminderMinutes: reminder.pre_reminder_minutes ?? undefined,
    channel: 'both'
  });

  redirect(`/app/reminders/${cloned.id}`);
}

export async function deleteReminder(formData: FormData) {
  const reminderId = String(formData.get('reminderId'));
  const user = await requireUser(`/app/reminders/${reminderId}`);
  const deleteFromCalendar = String(formData.get('deleteFromCalendar') || '') === '1';
  if (deleteFromCalendar) {
    try {
      await deleteCalendarEventForReminder({ userId: user.id, reminderId });
    } catch (error) {
      console.error('[google] delete reminder event failed', error);
      redirect(`/app/reminders/${reminderId}?error=calendar-delete`);
    }
  }

  const supabase = createServerClient();

  const { data: deleted, error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId)
    .select('id')
    .maybeSingle();

  if (error || !deleted) {
    redirect(`/app/reminders/${reminderId}?error=not-authorized`);
  }

  revalidatePath('/app');
  redirect('/app');
}
