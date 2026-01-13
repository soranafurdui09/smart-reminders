'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { addDays } from 'date-fns';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth';
import { getAppUrl, isResendConfigured, sendEmail } from '@/lib/notifications';
import { changeHouseholdMemberRole, removeHouseholdMember, type HouseholdRole } from '@/lib/householdRoles';

export async function createHousehold(formData: FormData) {
  const user = await requireUser('/app');
  const name = String(formData.get('name') || '').trim();
  if (!name) {
    redirect('/app?error=missing-name');
  }
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('households')
    .insert({ name, owner_user_id: user.id })
    .select('id')
    .single();

  if (error || !data) {
    redirect('/app?error=failed');
  }

  await supabase.from('household_members').insert({
    household_id: data.id,
    user_id: user.id,
    role: 'OWNER'
  });

  redirect('/app');
}

export async function inviteMember(formData: FormData) {
  const user = await requireUser('/app/household');
  const householdId = String(formData.get('household_id') || '');
  const email = String(formData.get('email') || '').trim();
  const roleRaw = String(formData.get('role') || 'MEMBER');
  const role = roleRaw === 'VIEWER' ? 'VIEWER' : 'MEMBER';
  if (!householdId || !email) {
    redirect('/app/household?error=missing');
  }

  const supabase = createServerClient();
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'OWNER') {
    redirect('/app/household?error=not-authorized');
  }

  const token = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = addDays(new Date(), 7);

  const { error } = await supabase.from('household_invites').insert({
    household_id: householdId,
    email,
    role,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString()
  });

  if (error) {
    redirect('/app/household?error=invite-failed');
  }

  const inviteLink = `${getAppUrl()}/invite?token=${token}`;

  if (isResendConfigured()) {
    const result = await sendEmail({
      to: email,
      subject: 'Invitatie household',
      html: `<p>Ai fost invitat(a) in household. Click: <a href="${inviteLink}">Accepta invitatie</a></p>`
    });
    if (result.status === 'sent') {
      redirect('/app/household?invite=sent');
    }
    if (result.status === 'failed') {
      redirect(`/app/household?invite=${encodeURIComponent(inviteLink)}&error=invite-email-failed`);
    }
  }

  redirect(`/app/household?invite=${encodeURIComponent(inviteLink)}`);
}

export async function acceptInvite(token: string, userId: string) {
  const admin = createAdminClient();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: invite, error } = await admin
    .from('household_invites')
    .select('id, household_id, role, expires_at, accepted_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !invite) {
    throw new Error('Invalid token');
  }
  if (invite.accepted_at) {
    throw new Error('Already accepted');
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    throw new Error('Expired');
  }

  await admin.from('household_members').upsert({
    household_id: invite.household_id,
    user_id: userId,
    role: invite.role
  }, { onConflict: 'household_id,user_id' });

  await admin
    .from('household_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);
}

function normalizeRole(value: string): HouseholdRole {
  if (value === 'OWNER') return 'OWNER';
  if (value === 'VIEWER') return 'VIEWER';
  return 'MEMBER';
}

export async function updateMemberRole(formData: FormData) {
  const user = await requireUser('/app/household');
  const householdId = String(formData.get('household_id') || '');
  const memberId = String(formData.get('member_id') || '');
  const roleRaw = String(formData.get('role') || '');
  if (!householdId || !memberId || !roleRaw) {
    redirect('/app/household?error=missing');
  }

  const result = await changeHouseholdMemberRole(
    householdId,
    memberId,
    normalizeRole(roleRaw),
    user.id
  );
  if (!result.ok) {
    redirect(`/app/household?error=${encodeURIComponent(result.error)}`);
  }

  redirect('/app/household');
}

export async function removeMember(formData: FormData) {
  const user = await requireUser('/app/household');
  const householdId = String(formData.get('household_id') || '');
  const memberId = String(formData.get('member_id') || '');
  if (!householdId || !memberId) {
    redirect('/app/household?error=missing');
  }

  const result = await removeHouseholdMember(householdId, memberId, user.id);
  if (!result.ok) {
    redirect(`/app/household?error=${encodeURIComponent(result.error)}`);
  }

  redirect('/app/household');
}
