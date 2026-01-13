'use server';

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getUserHousehold } from '@/lib/data';
import { generateReminderEmbedding } from '@/lib/ai/embeddings';
import { setReminderAssignment } from '@/lib/reminderAssignments';

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
      assigned_member_id: assignedMemberId
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
