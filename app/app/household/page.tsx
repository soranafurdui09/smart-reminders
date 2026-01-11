import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getHouseholdInvites, getHouseholdMembers, getUserHousehold, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { createHousehold, inviteMember } from './actions';

export default async function HouseholdPage({
  searchParams
}: {
  searchParams: { invite?: string; error?: string };
}) {
  const user = await requireUser('/app/household');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale}>
        <div className="space-y-6">
          <SectionHeader title={copy.household.title} description={copy.household.subtitleCreate} />
          <form action={createHousehold} className="card space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-semibold">{copy.household.createNameLabel}</label>
              <input name="name" className="input" placeholder={copy.household.createPlaceholder} required />
            </div>
            <button className="btn btn-primary" type="submit">{copy.household.createButton}</button>
          </form>
        </div>
      </AppShell>
    );
  }

  const members = await getHouseholdMembers(membership.households.id);
  const invites = await getHouseholdInvites(membership.households.id);

  return (
    <AppShell locale={locale}>
      <div className="space-y-8">
        <SectionHeader title={copy.household.title} description={copy.household.subtitleManage} />

        {searchParams.invite ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {searchParams.invite === 'sent' ? (
              copy.household.inviteSent
            ) : (
              <>{copy.household.inviteReady} <span className="font-semibold">{searchParams.invite}</span></>
            )}
          </div>
        ) : null}

        {searchParams.error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {searchParams.error === 'invite-email-failed'
              ? copy.household.inviteEmailFailed
              : copy.household.actionFailed}
          </div>
        ) : null}

        <section>
          <SectionHeader title={copy.household.membersTitle} />
          <div className="grid gap-3">
            {members.map((member: any) => (
              <div key={member.user_id} className="card flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {member.profiles?.name || member.profiles?.email || member.user_id}
                  </div>
                  <div className="text-xs text-slate-500">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title={copy.household.invitesTitle} />
          <div className="grid gap-3">
            {invites.length ? invites.map((invite: any) => (
              <div key={invite.id} className="card">
                <div className="text-sm font-semibold">{invite.email}</div>
                <div className="text-xs text-slate-500">
                  {invite.role} - {invite.accepted_at ? copy.household.inviteAccepted : copy.household.invitePending}
                </div>
              </div>
            )) : <div className="text-sm text-slate-500">{copy.household.noInvites}</div>}
          </div>
        </section>

        <section>
          <SectionHeader title={copy.household.inviteTitle} />
          <form action={inviteMember} className="card space-y-4 max-w-lg">
            <input type="hidden" name="household_id" value={membership.households.id} />
            <div>
              <label className="text-sm font-semibold">{copy.common.email}</label>
              <input name="email" className="input" placeholder={copy.magicLink.placeholder} required />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.common.role}</label>
              <select name="role" className="input">
                <option value="MEMBER">{copy.household.memberRoleLabel}</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">{copy.household.inviteButton}</button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
