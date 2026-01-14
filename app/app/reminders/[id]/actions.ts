'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { generateReminderEmbedding } from '@/lib/ai/embeddings';
import { clearReminderAssignment, setReminderAssignment } from '@/lib/reminderAssignments';
import { createCalendarEventForMedication, deleteCalendarEventForReminder, getUserGoogleConnection } from '@/lib/google/calendar';
import { getDefaultContextSettings, isDefaultContextSettings, type DayOfWeek } from '@/lib/reminders/context';
import { ensureMedicationDoses, getFirstMedicationDose, type MedicationDetails, type MedicationFrequencyType } from '@/lib/reminders/medication';

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

function buildContextSettings(formData: FormData) {
  const defaults = getDefaultContextSettings();
  const timeWindowEnabled = String(formData.get('context_time_window_enabled') || '') === '1';
  const startHour = normalizeHour(formData.get('context_time_start_hour'), defaults.timeWindow?.startHour ?? 9);
  const endHour = normalizeHour(formData.get('context_time_end_hour'), defaults.timeWindow?.endHour ?? 20);
  const daysOfWeek = formData
    .getAll('context_time_days')
    .map((day) => String(day))
    .filter((day): day is DayOfWeek => DAYS.includes(day as DayOfWeek));
  const calendarEnabled = String(formData.get('context_calendar_busy_enabled') || '') === '1';
  const snoozeMinutes = normalizeMinutes(
    formData.get('context_calendar_snooze_minutes'),
    defaults.calendarBusy?.snoozeMinutes ?? 15
  );

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

  return isDefaultContextSettings(settings) ? null : settings;
}

export async function updateReminder(formData: FormData) {
  const reminderId = String(formData.get('reminderId'));
  const user = await requireUser(`/app/reminders/${reminderId}`);

  const supabase = createServerClient();
  const { data: reminderRecord } = await supabase
    .from('reminders')
    .select('id, household_id, kind, google_event_id')
    .eq('id', reminderId)
    .maybeSingle();

  if (!reminderRecord) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  const contextSettings = buildContextSettings(formData);
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
    const firstDose = medicationDetails ? getFirstMedicationDose(medicationDetails) : null;
    payload.title = resolvedTitle;
    payload.notes = resolvedNotes;
    payload.schedule_type = 'once';
    payload.recurrence_rule = null;
    payload.pre_reminder_minutes = null;
    payload.due_at = firstDose ? new Date(firstDose).toISOString() : new Date().toISOString();
    payload.medication_details = medicationDetails;
    assignedMemberId = personId;
    regenerateDoses = Boolean(medicationDetails);
  } else {
    const title = String(formData.get('title') || '').trim();
    const notes = String(formData.get('notes') || '').trim();
    const dueAtRaw = String(formData.get('due_at') || '').trim();
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
    if (dueAtRaw) {
      payload.due_at = new Date(dueAtRaw).toISOString();
    }
    const preReminderMinutes = preReminderRaw ? Number(preReminderRaw) : null;
    payload.pre_reminder_minutes = Number.isFinite(preReminderMinutes) ? preReminderMinutes : null;
    assignedMemberId = assignedMemberRaw || null;
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
    await ensureMedicationDoses(reminderId, medicationDetails);
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
    .select('household_id, title, notes, schedule_type, due_at, tz, is_active')
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
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);

  if (error) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  revalidatePath('/app');
  redirect('/app');
}
