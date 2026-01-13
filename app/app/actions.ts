'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getNextOccurrence, snoozeByMinutes, snoozeTomorrow, type ScheduleType } from '@/lib/reminders';

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
}

export async function markDone(formData: FormData) {
  const occurrenceId = String(formData.get('occurrenceId'));
  const reminderId = String(formData.get('reminderId'));
  const occurAt = String(formData.get('occurAt'));
  const doneComment = String(formData.get('done_comment') || '').trim();
  await requireUser();

  const supabase = createServerClient();
  await supabase
    .from('reminder_occurrences')
    .update({
      status: 'done',
      done_at: new Date().toISOString(),
      done_comment: doneComment || null
    })
    .eq('id', occurrenceId);

  const { data: reminder } = await supabase
    .from('reminders')
    .select('schedule_type')
    .eq('id', reminderId)
    .single();

  if (reminder?.schedule_type) {
    await createNextOccurrence(reminderId, new Date(occurAt), reminder.schedule_type);
  }

  revalidatePath('/app');
}

export async function snoozeOccurrence(formData: FormData) {
  const occurrenceId = String(formData.get('occurrenceId'));
  const remindAt = new Date(String(formData.get('occurAt')));
  const mode = String(formData.get('mode'));
  const customMinutesRaw = String(formData.get('custom_minutes') || '').trim();
  await requireUser();

  let nextOccurAt: Date;
  if (mode === 'custom') {
    const customMinutes = Number(customMinutesRaw);
    const minutes = Number.isFinite(customMinutes) && customMinutes > 0 ? customMinutes : 10;
    nextOccurAt = snoozeByMinutes(new Date(), minutes);
  } else if (mode === 'tomorrow') {
    nextOccurAt = snoozeTomorrow(new Date());
  } else {
    const minutes = Number(mode);
    nextOccurAt = snoozeByMinutes(remindAt, Number.isFinite(minutes) ? minutes : 10);
  }

  const supabase = createServerClient();
  await supabase
    .from('reminder_occurrences')
    .update({
      occur_at: nextOccurAt.toISOString(),
      snoozed_until: nextOccurAt.toISOString(),
      status: 'snoozed'
    })
    .eq('id', occurrenceId);

  revalidatePath('/app');
}
