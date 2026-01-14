import Link from 'next/link';
import SectionHeader from '@/components/SectionHeader';
import AppShell from '@/components/AppShell';
import SemanticSearch from '@/components/SemanticSearch';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getOpenOccurrencesForHousehold, getUserHousehold, getUserLocale } from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';
import { createHousehold } from './household/actions';
import { getUserGoogleConnection } from '@/lib/google/calendar';
import ReminderDashboardSection from '@/app/reminders/ReminderDashboardSection';
import { getTodayMedicationDoses } from '@/lib/reminders/medication';
import { formatDateTimeWithTimeZone } from '@/lib/dates';

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: { created?: string; assigned?: string };
}) {
  const user = await requireUser('/app');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);
  const googleConnection = await getUserGoogleConnection(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale} activePath="/app" userEmail={user.email}>
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

  const occurrencesAll = await getOpenOccurrencesForHousehold(membership.households.id);
  const members = await getHouseholdMembers(membership.households.id);
  const medicationDoses = await getTodayMedicationDoses(membership.households.id);
  const memberMap = new Map(
    members.map((member: any) => [
      member.id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const memberLabels = members.reduce<Record<string, string>>((acc, member: any) => {
    acc[member.id] = member.profiles?.name || member.profiles?.email || member.user_id;
    return acc;
  }, {});
  const memberUserMap = new Map(
    members.map((member: any) => [
      member.user_id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const occurrences = occurrencesAll
    .filter((occurrence) => occurrence.reminder?.is_active)
    .map((occurrence) => {
      // Next due time comes from the occurrence itself, overridden by snoozed_until if set.
      const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
      const assignedId = occurrence.reminder?.assigned_member_id;
      const performedBy = occurrence.performed_by;
      const performedByLabel = performedBy ? memberUserMap.get(performedBy) : null;
      if (!assignedId) {
        return performedByLabel
          ? { ...occurrence, performed_by_label: performedByLabel, effective_at: effectiveAt }
          : { ...occurrence, effective_at: effectiveAt };
      }
      const label = memberMap.get(assignedId);
      const base = {
        ...occurrence,
        effective_at: effectiveAt,
        reminder: label
          ? { ...occurrence.reminder, assigned_member_label: label }
          : occurrence.reminder
      };
      return performedByLabel ? { ...base, performed_by_label: performedByLabel } : base;
    });
  const sortedOccurrences = [...occurrences].sort((a: any, b: any) => {
    const aTime = new Date(a.effective_at ?? a.occur_at).getTime();
    const bTime = new Date(b.effective_at ?? b.occur_at).getTime();
    return aTime - bTime;
  });
  const initialCreatedBy = searchParams?.created === 'me'
    ? 'me'
    : searchParams?.created === 'others'
      ? 'others'
      : 'all';
  const initialAssignment = searchParams?.assigned === 'me' ? 'assigned_to_me' : 'all';
  const nextOccurrence = sortedOccurrences[0];
  const nextOccurrenceTimeZone = nextOccurrence?.reminder?.tz ?? null;

  return (
    <AppShell locale={locale} activePath="/app" userEmail={user.email}>
      <div className="space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>{copy.dashboard.title}</h1>
            <p className="text-sm text-muted">{copy.dashboard.subtitle}</p>
          </div>
          <Link className="btn btn-primary" href="/app/reminders/new">{copy.dashboard.newReminder}</Link>
        </div>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primaryStrong via-primary to-accent p-6 text-white shadow-soft">
          <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative space-y-3">
            <span className="pill border border-white/30 bg-white/10 text-white">{copy.dashboard.nextTitle}</span>
            {nextOccurrence ? (
              <div className="space-y-2">
                <div className="text-2xl font-semibold">{nextOccurrence.reminder?.title}</div>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <path
                      stroke="currentColor"
                      strokeWidth="1.5"
                      d="M8 7V5m8 2V5M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatDateTimeWithTimeZone(nextOccurrence.occur_at, nextOccurrenceTimeZone)}
                </div>
              </div>
            ) : (
              <div className="text-lg font-semibold">{copy.dashboard.nextEmptyRelaxed}</div>
            )}
          </div>
        </section>

        <SemanticSearch
          householdId={membership.households.id}
          localeTag={getLocaleTag(locale)}
          copy={copy.search}
        />

        <ReminderDashboardSection
          occurrences={occurrences}
          copy={copy}
          membershipId={membership.id}
          userId={user.id}
          googleConnected={Boolean(googleConnection)}
          medicationDoses={medicationDoses}
          memberLabels={memberLabels}
          initialCreatedBy={initialCreatedBy}
          initialAssignment={initialAssignment}
          locale={locale}
          localeTag={getLocaleTag(locale)}
        />
      </div>
    </AppShell>
  );
}
