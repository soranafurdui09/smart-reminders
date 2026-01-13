import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getHouseholdInvites, getHouseholdMembers, getUserHousehold, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { createHousehold, inviteMember, removeMember, updateMemberRole } from './actions';

export default async function HouseholdPage({
  searchParams
}: {
  searchParams: { invite?: string; error?: string };
}) {
  const user = await requireUser('/app/household');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);
  const household = membership?.households;
  const isOwner = membership?.role === 'OWNER';

  if (!household) {
    return (
      <AppShell locale={locale} activePath="/app/household" userEmail={user.email}>
        <div className="space-y-6">
          <SectionHeader title={copy.household.title} description={copy.household.subtitleCreate} />
          <form action={createHousehold} className="card space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-semibold">{copy.household.createNameLabel}</label>
              <input name="name" className="input" placeholder={copy.household.createPlaceholder} required />
            </div>
            <ActionSubmitButton
              className="btn btn-primary"
              type="submit"
              data-action-feedback={copy.common.actionCreated}
            >
              {copy.household.createButton}
            </ActionSubmitButton>
          </form>
        </div>
      </AppShell>
    );
  }

  const householdId = household.id;
  const members = await getHouseholdMembers(householdId);
  const invites = await getHouseholdInvites(householdId);
  const roleLabels: Record<string, string> = {
    OWNER: copy.household.roleOwner,
    MEMBER: copy.household.roleMember,
    VIEWER: copy.household.roleViewer
  };
  const formatRole = (role: string) => roleLabels[role] || role;

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
              : searchParams.error === 'not-authorized'
                ? copy.household.errorNotAuthorized
                : searchParams.error === 'last-owner'
                  ? copy.household.errorLastOwner
                  : searchParams.error === 'member-not-found'
                    ? copy.household.errorMemberMissing
                    : searchParams.error === 'invalid-role'
                      ? copy.household.errorInvalidRole
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
                  <div key={member.user_id} className="flex items-center justify-between rounded-2xl border border-borderSubtle bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primarySoft text-sm font-semibold text-primaryStrong">
                        {initial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{label}</div>
                        <div className="text-xs text-muted">{formatRole(member.role)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip">{formatRole(member.role)}</span>
                      {isOwner ? (
                        <details className="relative">
                          <summary
                            className="btn btn-secondary dropdown-summary h-9 w-9 p-0"
                            aria-label={copy.household.manageActionsLabel}
                          >
                            <span aria-hidden="true">...</span>
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-borderSubtle bg-surface p-3 shadow-soft">
                            <form action={updateMemberRole} className="space-y-2">
                              <input type="hidden" name="household_id" value={householdId} />
                              <input type="hidden" name="member_id" value={member.id} />
                              <label className="text-xs font-semibold text-muted">{copy.common.role}</label>
                              <select name="role" className="input h-9" defaultValue={member.role}>
                                <option value="OWNER">{copy.household.roleOwner}</option>
                                <option value="MEMBER">{copy.household.roleMember}</option>
                                <option value="VIEWER">{copy.household.roleViewer}</option>
                              </select>
                              <ActionSubmitButton
                                className="btn btn-secondary w-full"
                                type="submit"
                                data-action-feedback={copy.common.actionSaved}
                              >
                                {copy.common.save}
                              </ActionSubmitButton>
                            </form>
                            <form action={removeMember} className="mt-3 border-t border-borderSubtle pt-3">
                              <input type="hidden" name="household_id" value={householdId} />
                              <input type="hidden" name="member_id" value={member.id} />
                              <ActionSubmitButton
                                className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                type="submit"
                                data-action-feedback={copy.household.memberRemoved}
                              >
                                {copy.household.removeMemberLabel}
                              </ActionSubmitButton>
                            </form>
                          </div>
                        </details>
                      ) : null}
                    </div>
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
                  <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-borderSubtle bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink">
                        {initial}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ink">{invite.email}</div>
                        <div className="text-xs text-muted">
                          {formatRole(invite.role)} - {invite.accepted_at ? copy.household.inviteAccepted : copy.household.invitePending}
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

        {isOwner ? (
          <section className="card space-y-4 max-w-lg">
            <div>
              <div className="text-lg font-semibold text-ink">{copy.household.inviteTitle}</div>
              <p className="text-sm text-muted">{copy.household.inviteSubtitle}</p>
            </div>
            <form action={inviteMember} className="space-y-4">
              <input type="hidden" name="household_id" value={householdId} />
              <div>
                <label className="text-sm font-semibold">{copy.common.email}</label>
                <input name="email" className="input" placeholder={copy.magicLink.placeholder} required />
              </div>
              <div>
                <label className="text-sm font-semibold">{copy.common.role}</label>
                <select name="role" className="input">
                  <option value="MEMBER">{copy.household.roleMember}</option>
                  <option value="VIEWER">{copy.household.roleViewer}</option>
                </select>
              </div>
              <ActionSubmitButton
                className="btn btn-primary"
                type="submit"
                data-action-feedback={copy.common.actionInvited}
              >
                {copy.household.inviteButton}
              </ActionSubmitButton>
            </form>
          </section>
        ) : (
          <section className="card max-w-lg text-sm text-muted">{copy.household.inviteRestricted}</section>
        )}
      </div>
    </AppShell>
  );
}
