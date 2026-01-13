'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getUserHousehold } from '@/lib/data';
import { generateReminderEmbedding } from '@/lib/ai/embeddings';
import { setReminderAssignment } from '@/lib/reminderAssignments';
import { getDefaultContextSettings, isDefaultContextSettings, type DayOfWeek } from '@/lib/reminders/context';

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

export async function createReminder(formData: FormData) {
  const user = await requireUser('/app/reminders/new');
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    redirect('/app');
  }

  const title = String(formData.get('title') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const scheduleTypeRaw = String(formData.get('schedule_type') || 'once');
  const scheduleType = ['once', 'daily', 'weekly', 'monthly', 'yearly'].includes(scheduleTypeRaw)
    ? scheduleTypeRaw
    : 'once';
  const dueAtRaw = String(formData.get('due_at') || '').trim();
  const recurrenceRuleRaw = String(formData.get('recurrence_rule') || '').trim();
  const preReminderRaw = String(formData.get('pre_reminder_minutes') || '').trim();
  const assignedMemberRaw = String(formData.get('assigned_member_id') || '').trim();
  const voiceAuto = String(formData.get('voice_auto') || '') === '1';
  const contextSettings = buildContextSettings(formData);

  if (!title) {
    redirect('/app/reminders/new?error=missing-title');
  }

  const dueAt = dueAtRaw ? new Date(dueAtRaw) : new Date();

  const supabase = createServerClient();
  let assignedMemberId: string | null = assignedMemberRaw || null;
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
      title,
      notes: notes || null,
      schedule_type: scheduleType,
      due_at: dueAt.toISOString(),
      tz: 'UTC',
      is_active: true,
      recurrence_rule: recurrenceRuleRaw || null,
      pre_reminder_minutes: preReminderValue,
      assigned_member_id: assignedMemberId,
      context_settings: contextSettings
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

  try {
    const embedding = await generateReminderEmbedding(title, notes || null);
    if (embedding) {
      await supabase.from('reminders').update({ embedding }).eq('id', reminder.id);
    }
  } catch (error) {
    console.error('[embeddings] create reminder failed', error);
  }

  const { error: occurrenceError } = await supabase.from('reminder_occurrences').insert({
    reminder_id: reminder.id,
    occur_at: dueAt.toISOString(),
    status: 'open'
  });
  if (occurrenceError) {
    console.error('[reminders] create occurrence failed', occurrenceError);
  }

  if (voiceAuto) {
    redirect(`/app?voice_created=${reminder.id}`);
  }
  redirect('/app');
}
