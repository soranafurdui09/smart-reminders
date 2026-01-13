import { createServerClient } from '@/lib/supabase/server';

// Schema summary:
// - households: household container (owner_user_id).
// - household_members: membership rows (role) per household.
// - reminders: reminder records linked to household_id.
// - reminder_occurrences: generated instances for reminders.
// - reminder_assignments: assignees per reminder (user_id).

export type AssignmentResult = { ok: true } | { ok: false; error: string };

const ALLOWED_ROLES = ['OWNER', 'MEMBER'] as const;

export async function getReminderAssignments(reminderId: string, userId: string) {
  const supabase = createServerClient();

  const { data: reminder } = await supabase
    .from('reminders')
    .select('household_id')
    .eq('id', reminderId)
    .maybeSingle();

  if (!reminder) {
    return [];
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', reminder.household_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return [];
  }

  const { data } = await supabase
    .from('reminder_assignments')
    .select('id, reminder_id, user_id, created_at')
    .eq('reminder_id', reminderId);

  return data ?? [];
}

export async function setReminderAssignment(
  reminderId: string,
  targetUserId: string,
  actorUserId: string
): Promise<AssignmentResult> {
  const supabase = createServerClient();

  const { data: reminder } = await supabase
    .from('reminders')
    .select('household_id')
    .eq('id', reminderId)
    .maybeSingle();

  if (!reminder) {
    return { ok: false, error: 'Reminder not found.' };
  }

  const { data: actor } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', reminder.household_id)
    .eq('user_id', actorUserId)
    .maybeSingle();

  if (!actor || !ALLOWED_ROLES.includes(actor.role as (typeof ALLOWED_ROLES)[number])) {
    return { ok: false, error: 'Not authorized.' };
  }

  const { data: target } = await supabase
    .from('household_members')
    .select('user_id')
    .eq('household_id', reminder.household_id)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: 'Invalid assignee.' };
  }

  await supabase
    .from('reminder_assignments')
    .delete()
    .eq('reminder_id', reminderId);

  const { error } = await supabase
    .from('reminder_assignments')
    .insert({ reminder_id: reminderId, user_id: targetUserId });

  if (error) {
    return { ok: false, error: 'Assignment failed.' };
  }

  return { ok: true };
}

export async function clearReminderAssignment(
  reminderId: string,
  actorUserId: string
): Promise<AssignmentResult> {
  const supabase = createServerClient();

  const { data: reminder } = await supabase
    .from('reminders')
    .select('household_id')
    .eq('id', reminderId)
    .maybeSingle();

  if (!reminder) {
    return { ok: false, error: 'Reminder not found.' };
  }

  const { data: actor } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', reminder.household_id)
    .eq('user_id', actorUserId)
    .maybeSingle();

  if (!actor || !ALLOWED_ROLES.includes(actor.role as (typeof ALLOWED_ROLES)[number])) {
    return { ok: false, error: 'Not authorized.' };
  }

  const { error } = await supabase
    .from('reminder_assignments')
    .delete()
    .eq('reminder_id', reminderId);

  if (error) {
    return { ok: false, error: 'Clear failed.' };
  }

  return { ok: true };
}
