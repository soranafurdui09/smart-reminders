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
      <AppShell locale={locale} activePath="/app/household" userEmail={user.email}>
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
    <AppShell locale={locale} activePath="/app/household" userEmail={user.email}>
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

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4">
            <div>
              <div className="text-lg font-semibold text-ink">{copy.household.membersTitle}</div>
              <p className="text-sm text-muted">{copy.household.membersSubtitle}</p>
            </div>
            <div className="space-y-3">
              {members.map((member: any) => {
                const label = member.profiles?.name || member.profiles?.email || member.user_id;
                const initial = String(label || 'U').charAt(0).toUpperCase();
                return (
                  <div key={member.user_id} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primarySoft text-sm font-semibold text-primaryStrong">
                        {initial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{label}</div>
                        <div className="text-xs text-muted">{member.role}</div>
                      </div>
                    </div>
                    <span className="chip">{member.role}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card space-y-4">
            <div>
              <div className="text-lg font-semibold text-ink">{copy.household.invitesTitle}</div>
              <p className="text-sm text-muted">{copy.household.invitesSubtitle}</p>
            </div>
            <div className="space-y-3">
              {invites.length ? invites.map((invite: any) => {
                const initial = String(invite.email || 'U').charAt(0).toUpperCase();
                return (
                  <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink">
                        {initial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{invite.email}</div>
                        <div className="text-xs text-muted">
                          {invite.role} - {invite.accepted_at ? copy.household.inviteAccepted : copy.household.invitePending}
                        </div>
                      </div>
                    </div>
                    <span className="chip">{invite.accepted_at ? copy.common.statusAccepted : copy.common.statusPending}</span>
                  </div>
                );
              }) : <div className="text-sm text-muted">{copy.household.noInvites}</div>}
            </div>
          </div>
        </section>

        <section className="card space-y-4 max-w-lg">
          <div>
            <div className="text-lg font-semibold text-ink">{copy.household.inviteTitle}</div>
            <p className="text-sm text-muted">{copy.household.inviteSubtitle}</p>
          </div>
          <form action={inviteMember} className="space-y-4">
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
