'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';

export async function updateReminder(formData: FormData) {
  const reminderId = String(formData.get('reminderId'));
  await requireUser(`/app/reminders/${reminderId}`);

  const title = String(formData.get('title') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const dueAtRaw = String(formData.get('due_at') || '').trim();

  const payload: Record<string, string | null> = {
    title,
    notes: notes || null
  };

  if (dueAtRaw) {
    payload.due_at = new Date(dueAtRaw).toISOString();
  }

  const supabase = createServerClient();
  const { error } = await supabase.from('reminders').update(payload).eq('id', reminderId);
  if (error) {
    redirect(`/app/reminders/${reminderId}?error=1`);
  }

  revalidatePath(`/app/reminders/${reminderId}`);
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

  await supabase.from('reminder_occurrences').insert({
    reminder_id: cloned.id,
    occur_at: dueAt.toISOString(),
    status: 'open'
  });

  redirect(`/app/reminders/${cloned.id}`);
}
