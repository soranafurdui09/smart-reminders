'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getUserHousehold } from '@/lib/data';

export async function createReminder(formData: FormData) {
  const user = await requireUser('/app/reminders/new');
  const membership = await getUserHousehold(user.id);
  if (!membership?.households) {
    redirect('/app');
  }

  const title = String(formData.get('title') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const scheduleTypeRaw = String(formData.get('schedule_type') || 'once');
  const scheduleType = ['once', 'daily', 'weekly', 'monthly'].includes(scheduleTypeRaw) ? scheduleTypeRaw : 'once';
  const dueAtRaw = String(formData.get('due_at') || '').trim();

  if (!title) {
    redirect('/app/reminders/new?error=missing-title');
  }

  const dueAt = dueAtRaw ? new Date(dueAtRaw) : new Date();

  const supabase = createServerClient();
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
      is_active: true
    })
    .select('id')
    .single();

  if (error || !reminder) {
    redirect('/app/reminders/new?error=failed');
  }

  await supabase.from('reminder_occurrences').insert({
    reminder_id: reminder.id,
    occur_at: dueAt.toISOString(),
    status: 'open'
  });

  redirect('/app');
}
