import { createServerClient } from '@/lib/supabase/server';

// Schema summary:
// - households: household container (owner_user_id).
// - household_members: membership rows with role per household.
// - reminders: reminder records tied to household_id.
// - reminder_occurrences: generated occurrences and status tracking.

export type HouseholdRole = 'OWNER' | 'MEMBER' | 'VIEWER';

export type HouseholdActionResult = { ok: true } | { ok: false; error: string };

const ALLOWED_ROLES: HouseholdRole[] = ['OWNER', 'MEMBER', 'VIEWER'];

async function isOwner(householdId: string, actorUserId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', actorUserId)
    .maybeSingle();
  return data?.role === 'OWNER';
}

async function getOwnerCount(householdId: string) {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('household_members')
    .select('id', { count: 'exact', head: true })
    .eq('household_id', householdId)
    .eq('role', 'OWNER');
  return count ?? 0;
}

export async function listHouseholdMembersWithRoles(householdId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('household_members')
    .select('id, user_id, role')
    .eq('household_id', householdId)
    .order('created_at');
  if (error) {
    console.error('[household] list members failed', error);
    return [];
  }
  return data ?? [];
}

export async function changeHouseholdMemberRole(
  householdId: string,
  memberId: string,
  nextRole: HouseholdRole,
  actorUserId: string
): Promise<HouseholdActionResult> {
  if (!ALLOWED_ROLES.includes(nextRole)) {
    return { ok: false, error: 'invalid-role' };
  }

  const owner = await isOwner(householdId, actorUserId);
  if (!owner) {
    return { ok: false, error: 'not-authorized' };
  }

  const supabase = createServerClient();
  const { data: member } = await supabase
    .from('household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('id', memberId)
    .maybeSingle();
  if (!member) {
    return { ok: false, error: 'member-not-found' };
  }

  if (member.role === 'OWNER' && nextRole !== 'OWNER') {
    const ownerCount = await getOwnerCount(householdId);
    if (ownerCount <= 1) {
      return { ok: false, error: 'last-owner' };
    }
  }

  const { error } = await supabase
    .from('household_members')
    .update({ role: nextRole })
    .eq('id', memberId);
  if (error) {
    console.error('[household] role update failed', error);
    return { ok: false, error: 'update-failed' };
  }

  return { ok: true };
}

export async function removeHouseholdMember(
  householdId: string,
  memberId: string,
  actorUserId: string
): Promise<HouseholdActionResult> {
  const owner = await isOwner(householdId, actorUserId);
  if (!owner) {
    return { ok: false, error: 'not-authorized' };
  }

  const supabase = createServerClient();
  const { data: member } = await supabase
    .from('household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('id', memberId)
    .maybeSingle();
  if (!member) {
    return { ok: false, error: 'member-not-found' };
  }

  if (member.role === 'OWNER') {
    const ownerCount = await getOwnerCount(householdId);
    if (ownerCount <= 1) {
      return { ok: false, error: 'last-owner' };
    }
  }

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', memberId);
  if (error) {
    console.error('[household] remove member failed', error);
    return { ok: false, error: 'remove-failed' };
  }

  return { ok: true };
}
