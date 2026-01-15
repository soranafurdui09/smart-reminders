import SectionHeader from '@/components/SectionHeader';
import AppShell from '@/components/AppShell';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import DashboardHero from '@/components/dashboard/DashboardHero';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getOpenOccurrencesForHousehold, getUserHousehold, getUserLocale, getUserTimeZone } from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';
import { createHousehold } from './household/actions';
import { getUserGoogleConnection } from '@/lib/google/calendar';
import ReminderDashboardSection from '@/app/reminders/ReminderDashboardSection';
import { getTodayMedicationDoses } from '@/lib/reminders/medication';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, interpretAsTimeZone, resolveReminderTimeZone } from '@/lib/dates';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: { created?: string; assigned?: string };
}) {
  const user = await requireUser('/app');
  const locale = await getUserLocale(user.id);
  const userTimeZone = await getUserTimeZone(user.id);
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
  const nextOccurrenceTimeZone = resolveReminderTimeZone(nextOccurrence?.reminder?.tz ?? null, userTimeZone);
  const nextOccurrenceAt = nextOccurrence
    ? nextOccurrence.snoozed_until ?? nextOccurrence.effective_at ?? nextOccurrence.occur_at
    : null;
  const nextOccurrenceCompare = nextOccurrenceAt
    ? nextOccurrence?.snoozed_until
      ? new Date(nextOccurrenceAt)
      : nextOccurrenceTimeZone && nextOccurrenceTimeZone !== 'UTC'
        ? interpretAsTimeZone(nextOccurrenceAt, nextOccurrenceTimeZone)
        : new Date(nextOccurrenceAt)
    : null;
  const nextDayDiff = nextOccurrenceCompare
    ? diffDaysInTimeZone(nextOccurrenceCompare, new Date(), userTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
    : null;
  const nextOccurrenceLabel = nextOccurrence && nextOccurrenceAt
    ? nextOccurrence.snoozed_until
      ? formatDateTimeWithTimeZone(nextOccurrenceAt, nextOccurrenceTimeZone)
      : formatReminderDateTime(nextOccurrenceAt, nextOccurrenceTimeZone, userTimeZone)
    : null;
  const nextCategoryId = nextOccurrence
    ? inferReminderCategoryId({
        title: nextOccurrence.reminder?.title,
        notes: nextOccurrence.reminder?.notes,
        kind: nextOccurrence.reminder?.kind,
        category: nextOccurrence.reminder?.category,
        medicationDetails: nextOccurrence.reminder?.medication_details
      })
    : 'default';
  const nextCategory = getReminderCategory(nextCategoryId);
  const nextCategoryStyle = getCategoryChipStyle(nextCategory.color, true);
  const nextUrgencyLabel = nextDayDiff === 0
    ? copy.dashboard.groupToday
    : nextDayDiff === 1
      ? copy.dashboard.groupTomorrow
      : copy.dashboard.upcomingTitle;
  const nextUrgencyClass = nextDayDiff === 0
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : nextDayDiff === 1
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : 'border-slate-200 bg-slate-50 text-slate-600';
  const nextAction = nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at
    ? {
        occurrenceId: nextOccurrence.id,
        reminderId: nextOccurrence.reminder.id,
        occurAt: nextOccurrence.occur_at
      }
    : null;

  return (
    <AppShell locale={locale} activePath="/app" userEmail={user.email}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 md:space-y-8">
        <DashboardHero
          title={copy.dashboard.heroTitle}
          subtitle={copy.dashboard.heroSubtitle}
          hintExample={copy.dashboard.heroHintExample}
          voiceLabel={copy.dashboard.heroVoiceCta}
          voiceAriaLabel={copy.remindersNew.voiceNavLabel}
          voiceTitle={copy.remindersNew.voiceNavLabel}
          voiceHref="/app/reminders/new?voice=1"
          manualLabel={copy.dashboard.heroManualCta}
          manualHref="/app/reminders/new"
          nextTitle={copy.dashboard.nextTitle}
          nextEmpty={copy.dashboard.nextEmptyRelaxed}
          nextReminder={
            nextOccurrence && nextOccurrenceLabel
              ? {
                  title: nextOccurrence.reminder?.title ?? copy.dashboard.nextTitle,
                  timeLabel: nextOccurrenceLabel,
                  categoryLabel: nextCategory.label,
                  categoryStyle: nextCategoryStyle,
                  urgencyLabel: nextUrgencyLabel,
                  urgencyClassName: nextUrgencyClass,
                  action: nextAction ?? undefined,
                  actionLabel: copy.common.doneAction
                }
              : null
          }
        />

        <ReminderDashboardSection
          occurrences={occurrences}
          copy={copy}
          membershipId={membership.id}
          householdId={membership.households.id}
          userId={user.id}
          googleConnected={Boolean(googleConnection)}
          medicationDoses={medicationDoses}
          memberLabels={memberLabels}
          initialCreatedBy={initialCreatedBy}
          initialAssignment={initialAssignment}
          locale={locale}
          localeTag={getLocaleTag(locale)}
          userTimeZone={userTimeZone}
        />
      </div>
    </AppShell>
  );
}
