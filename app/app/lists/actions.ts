'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { getUserHousehold, getUserTimeZone } from '@/lib/data';
import { createTaskList, deleteTaskList } from '@/lib/tasks';
import { scheduleNotificationJobsForReminder } from '@/lib/notifications/jobs';
import { localDateAndTimeToUtc, resolveTimeZone } from '@/lib/time/schedule';
import { addDays, addMinutes } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

export async function createTaskListAction(input: { name: string; type?: 'generic' | 'shopping' }) {
  const user = await requireUser('/app/lists');
  const list = await createTaskList(user.id, {
    name: input.name,
    type: input.type ?? 'generic'
  });
  revalidatePath('/app/lists');
  return list;
}

export async function deleteTaskListAction(listId: string) {
  const user = await requireUser('/app/lists');
  await deleteTaskList(user.id, listId);
  revalidatePath('/app/lists');
}

export async function shareTaskListAction(listId: string) {
  const user = await requireUser('/app/lists');
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    return { ok: false, error: 'no-household' as const };
  }
  const supabase = createServerClient();
  const { error } = await supabase
    .from('task_lists')
    .update({ household_id: membership.households.id })
    .eq('id', listId)
    .eq('owner_id', user.id);
  if (error) {
    console.error('[lists] share failed', error);
    return { ok: false, error: 'share-failed' as const };
  }
  revalidatePath('/app/lists');
  revalidatePath('/app');
  return { ok: true };
}

export async function createListReminderAction(input: {
  listId: string;
  preset: 'today_evening' | 'tomorrow_morning' | 'in_1_hour' | 'today_18' | 'tomorrow_09' | 'custom';
  customAt?: string;
}) {
  const user = await requireUser('/app/lists');
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    return { ok: false, error: 'no-household' as const };
  }
  const supabase = createServerClient();
  const { data: list } = await supabase
    .from('task_lists')
    .select('id, name')
    .eq('id', input.listId)
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!list) {
    return { ok: false, error: 'list-not-found' as const };
  }

  const userTimeZone = await getUserTimeZone(user.id);
  const tz = resolveTimeZone(userTimeZone || 'UTC');
  const now = new Date();
  const preset = input.preset === 'today_evening'
    ? 'today_18'
    : input.preset === 'tomorrow_morning'
      ? 'tomorrow_09'
      : input.preset;
  let dueAt: Date | null = null;
  if (preset === 'in_1_hour') {
    dueAt = addMinutes(now, 60);
  } else if (preset === 'today_18' || preset === 'tomorrow_09') {
    const base = preset === 'tomorrow_09' ? addDays(toZonedTime(now, tz), 1) : toZonedTime(now, tz);
    const dateKey = formatInTimeZone(base, tz, 'yyyy-MM-dd');
    const timeKey = preset === 'today_18' ? '18:00' : '09:00';
    dueAt = localDateAndTimeToUtc(dateKey, timeKey, tz);
  } else if (preset === 'custom') {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(input.customAt || '').trim());
    if (match) {
      const [, year, month, day, hour, minute] = match;
      const dateKey = `${year}-${month}-${day}`;
      const timeKey = `${hour}:${minute}`;
      dueAt = localDateAndTimeToUtc(dateKey, timeKey, tz);
    }
  }
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return { ok: false, error: 'invalid-time' as const };
  }

  const { data: reminder, error } = await supabase
    .from('reminders')
    .insert({
      household_id: membership.households.id,
      created_by: user.id,
      title: `Verifică lista: ${list.name}`,
      notes: null,
      schedule_type: 'once',
      due_at: dueAt.toISOString(),
      tz,
      is_active: true,
      recurrence_rule: null,
      pre_reminder_minutes: 0,
      assigned_member_id: null,
      kind: 'generic',
      context_settings: { list_id: list.id }
    })
    .select('id')
    .maybeSingle();
  if (error || !reminder) {
    console.error('[list-reminder] create reminder failed', error);
    return { ok: false, error: 'create-reminder' as const };
  }

  const { error: occurrenceError } = await supabase.from('reminder_occurrences').insert({
    reminder_id: reminder.id,
    occur_at: dueAt.toISOString(),
    status: 'open'
  });
  if (occurrenceError) {
    console.error('[list-reminder] create occurrence failed', occurrenceError);
  }
  await scheduleNotificationJobsForReminder({
    reminderId: reminder.id,
    userId: user.id,
    dueAt,
    channel: 'both'
  });
  revalidatePath('/app');
  revalidatePath('/app/lists');
  return { ok: true, reminderId: reminder.id };
}
