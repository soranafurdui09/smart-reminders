'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getNextOccurrence, type ScheduleType } from '@/lib/reminders';
import { getSmartSnoozeOptions, inferReminderCategory, type SnoozeOptionId } from '@/lib/reminders/snooze';
import { clearNotificationJobsForReminder, scheduleNotificationJobsForReminder } from '@/lib/notifications/jobs';

function parseDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function createNextOccurrence(reminderId: string, occurAt: Date, scheduleType: ScheduleType) {
  const next = getNextOccurrence(occurAt, scheduleType);
  if (!next) {
    return;
  }
  const supabase = createServerClient();
  await supabase.from('reminder_occurrences').insert({
    reminder_id: reminderId,
    occur_at: next.toISOString(),
    status: 'open'
  });
  const { data: reminder } = await supabase
    .from('reminders')
    .select('created_by, pre_reminder_minutes')
    .eq('id', reminderId)
    .maybeSingle();
  if (reminder?.created_by) {
    await scheduleNotificationJobsForReminder({
      reminderId,
      userId: reminder.created_by,
      dueAt: next,
      preReminderMinutes: reminder.pre_reminder_minutes ?? undefined,
      channel: 'both'
    });
  }
}

export async function markDone(formData: FormData) {
  // Done flow: mark the current occurrence complete, then generate the next occurrence from schedule_type.
  const occurrenceId = String(formData.get('occurrenceId'));
  const reminderId = String(formData.get('reminderId'));
  const occurAt = String(formData.get('occurAt'));
  const doneComment = String(formData.get('done_comment') || '').trim();
  const user = await requireUser();
  const performedAt = new Date().toISOString();

  const supabase = createServerClient();
  await supabase
    .from('reminder_occurrences')
    .update({
      status: 'done',
      done_at: performedAt,
      done_comment: doneComment || null,
      snoozed_until: null,
      performed_by: user.id,
      performed_at: performedAt
    })
    .eq('id', occurrenceId);

  const { data: reminder } = await supabase
    .from('reminders')
    .select('schedule_type')
    .eq('id', reminderId)
    .single();

  await clearNotificationJobsForReminder(reminderId);
  if (reminder?.schedule_type) {
    await createNextOccurrence(reminderId, new Date(occurAt), reminder.schedule_type);
  }
  revalidatePath('/app');
}

export async function snoozeOccurrence(formData: FormData) {
  // Snooze flow: keep the occurrence open and set snoozed_until as the next due time.
  const occurrenceId = String(formData.get('occurrenceId'));
  const optionIdRaw = String(formData.get('option_id') || '').trim();
  const customAtRaw = String(formData.get('custom_at') || '').trim();
  const legacyMode = String(formData.get('mode') || '').trim();
  const user = await requireUser();
  const now = new Date();

  const supabase = createServerClient();
  const { data: occurrence } = await supabase
    .from('reminder_occurrences')
    .select('id, occur_at, reminder:reminders(id, title, notes, due_at, household_id, is_active, created_by, pre_reminder_minutes)')
    .eq('id', occurrenceId)
    .maybeSingle();

  if (!occurrence) {
    return;
  }

  const reminder = Array.isArray(occurrence.reminder) ? occurrence.reminder[0] : occurrence.reminder;
  if (!reminder?.household_id || reminder.is_active === false) {
    return;
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', reminder.household_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) {
    return;
  }

  const dueAt = occurrence.occur_at ? new Date(occurrence.occur_at) : reminder.due_at ? new Date(reminder.due_at) : null;
  const category = inferReminderCategory({
    title: reminder.title,
    notes: reminder.notes,
    category: (reminder as { category?: string | null })?.category
  });

  let target: Date | null = null;
  const optionId = optionIdRaw as SnoozeOptionId;
  if (optionId && optionId !== 'custom') {
    const options = getSmartSnoozeOptions({ now, category, dueAt });
    const selected = options.find((option) => option.id === optionId);
    if (selected && selected.target !== 'custom') {
      target = selected.target;
    }
  } else if (customAtRaw) {
    target = parseDateTimeLocal(customAtRaw);
  } else if (legacyMode) {
    const minutes = Number(legacyMode);
    if (Number.isFinite(minutes) && minutes > 0) {
      target = new Date(now.getTime() + minutes * 60 * 1000);
    }
  }

  if (!target || target.getTime() <= now.getTime()) {
    return;
  }

  await supabase
    .from('reminder_occurrences')
    .update({
      snoozed_until: target.toISOString(),
      status: 'snoozed',
      performed_by: user.id,
      performed_at: new Date().toISOString()
    })
    .eq('id', occurrenceId);

  if (reminder?.created_by) {
    await scheduleNotificationJobsForReminder({
      reminderId: reminder.id,
      userId: reminder.created_by,
      dueAt: target,
      preReminderMinutes: reminder.pre_reminder_minutes ?? undefined,
      channel: 'both'
    });
  }

  revalidatePath('/app');
  revalidatePath('/app/calendar');
}
