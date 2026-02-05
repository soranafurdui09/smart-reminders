'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getUserContextDefaults, getUserHousehold } from '@/lib/data';
import { generateReminderEmbedding } from '@/lib/ai/embeddings';
import { setReminderAssignment } from '@/lib/reminderAssignments';
import { getDefaultContextSettings, isDefaultContextSettings, type DayOfWeek } from '@/lib/reminders/context';
import { isReminderCategoryId } from '@/lib/categories';
import {
  ensureMedicationDoses,
  getFirstMedicationDose,
  type MedicationDetails
} from '@/lib/reminders/medication';
import { createCalendarEventForMedication, getUserGoogleConnection } from '@/lib/google/calendar';
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
  return new Date();
}

export async function createReminder(formData: FormData) {
  const user = await requireUser('/app/reminders/new');
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    redirect('/app');
  }
  const contextDefaults = await getUserContextDefaults(user.id);

  const kindRaw = String(formData.get('kind') || 'generic');
  const kind = kindRaw === 'medication' ? 'medication' : 'generic';
  const title = String(formData.get('title') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const scheduleTypeRaw = String(formData.get('schedule_type') || 'once');
  const scheduleType = ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(scheduleTypeRaw)
    ? scheduleTypeRaw
    : 'once';
  const dueAtRaw = String(formData.get('due_at') || '').trim();
  const dueAtIso = String(formData.get('due_at_iso') || '').trim();
  const recurrenceRuleRaw = String(formData.get('recurrence_rule') || '').trim();
  const preReminderRaw = String(formData.get('pre_reminder_minutes') || '').trim();
  const assignedMemberRaw = String(formData.get('assigned_member_id') || '').trim();
  const voiceAuto = String(formData.get('voice_auto') || '') === '1';
  const tz = String(formData.get('tz') || '').trim() || 'UTC';
  const forceTask = String(formData.get('force_task') || '') === '1';
  const contextSettings = buildContextSettings(formData, contextDefaults);
  const listIdRaw = String(formData.get('context_list_id') || '').trim();
  const contextSettingsWithList = listIdRaw
    ? (contextSettings ? { ...contextSettings, list_id: listIdRaw } : { list_id: listIdRaw })
    : contextSettings;
  const medicationDetailsRaw = String(formData.get('medication_details') || '').trim();
  const medicationAddCalendar = String(formData.get('medication_add_to_calendar') || '') === '1';

  let medicationDetails: MedicationDetails | null = null;
  if (kind === 'medication' && medicationDetailsRaw) {
    try {
      medicationDetails = JSON.parse(medicationDetailsRaw) as MedicationDetails;
    } catch (error) {
      console.error('[medication] invalid details', error);
    }
  }

  if (kind === 'medication' && (!medicationDetails || !medicationDetails.name || !medicationDetails.startDate)) {
    redirect('/app/reminders/new?error=missing-medication');
  }

  if (!title && kind !== 'medication') {
    redirect('/app/reminders/new?error=missing-title');
  }

  const medicationName = medicationDetails?.name?.trim() || '';
  const medicationDose = medicationDetails?.dose?.trim() || '';
  const resolvedTitle = kind === 'medication'
    ? medicationName || 'Medicament'
    : title;
  const resolvedNotes = kind === 'medication'
    ? medicationDose
      ? `Doza: ${medicationDose}`
      : notes
    : notes;
  const dueAt = kind === 'medication'
    ? medicationDetails
      ? new Date(getFirstMedicationDose(medicationDetails, tz) || new Date().toISOString())
      : new Date()
    : forceTask
      ? null
      : resolveDueAtFromForm(dueAtIso, dueAtRaw, tz);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[debug][createReminder] due_at inputs', {
      dueAtRaw,
      dueAtIso,
      tz,
      resolvedLocal: dueAtRaw,
      resolvedIso: dueAt ? dueAt.toISOString() : null,
      forceTask
    });
  }

  const supabase = createServerClient();
  let assignedMemberId: string | null = assignedMemberRaw || null;
  if (kind === 'medication' && medicationDetails?.personId) {
    assignedMemberId = medicationDetails.personId;
  }
  let assignedUserId: string | null = null;
  if (assignedMemberId) {
    const { data: member } = await supabase
      .from('household_members')
      .select('id, user_id')
      .eq('id', assignedMemberId)
      .eq('household_id', membership.households.id)
      .maybeSingle();
    if (!member) {
      assignedMemberId = null;
    } else {
      assignedUserId = member.user_id;
    }
  }
  const preReminderMinutes = preReminderRaw ? Number(preReminderRaw) : null;
  const preReminderValue = Number.isFinite(preReminderMinutes) ? preReminderMinutes : null;
  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      household_id: membership.households.id,
      created_by: user.id,
      title: resolvedTitle,
      notes: resolvedNotes || null,
      schedule_type: scheduleType,
      due_at: dueAt ? dueAt.toISOString() : null,
      tz,
      is_active: true,
      recurrence_rule: recurrenceRuleRaw || null,
      pre_reminder_minutes: preReminderValue,
      assigned_member_id: assignedMemberId,
      context_settings: contextSettingsWithList,
      kind,
      medication_details: medicationDetails ? medicationDetails : null
    })
    .select('id')
    .single();

  if (error || !reminder) {
    console.error('[reminders] create failed', error);
    redirect('/app/reminders/new?error=failed');
  }

  if (assignedUserId) {
    const result = await setReminderAssignment(reminder.id, assignedUserId, user.id);
    if (!result.ok) {
      console.error('[reminders] assignment failed', result.error);
    }
  }

  if (kind === 'medication' && medicationDetails) {
    await ensureMedicationDoses(reminder.id, medicationDetails, tz);
    await scheduleNotificationJobsForMedication({
      reminderId: reminder.id,
      userId: user.id
    });
    if (medicationAddCalendar) {
      try {
        const googleConnection = await getUserGoogleConnection(user.id);
        if (googleConnection) {
          await createCalendarEventForMedication({
            userId: user.id,
            reminderId: reminder.id,
            details: medicationDetails
          });
        }
      } catch (error) {
        console.error('[google] medication calendar create failed', error);
      }
    }
  }

  try {
    const embedding = await generateReminderEmbedding(resolvedTitle, resolvedNotes || null);
    if (embedding) {
      await supabase.from('reminders').update({ embedding }).eq('id', reminder.id);
    }
  } catch (error) {
    console.error('[embeddings] create reminder failed', error);
  }

  if (kind !== 'medication' && dueAt) {
    const { error: occurrenceError } = await supabase.from('reminder_occurrences').insert({
      reminder_id: reminder.id,
      occur_at: dueAt.toISOString(),
      status: 'open'
    });
    if (occurrenceError) {
      console.error('[reminders] create occurrence failed', occurrenceError);
    }
    await scheduleNotificationJobsForReminder({
      reminderId: reminder.id,
      userId: user.id,
      dueAt,
      preReminderMinutes: preReminderValue ?? undefined,
      channel: 'both'
    });
  }

  revalidatePath('/app');

  if (voiceAuto) {
    redirect(`/app?voice_created=${reminder.id}`);
  }
  redirect('/app');
}
