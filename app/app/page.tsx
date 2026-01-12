import Link from 'next/link';
import { isThisWeek, isToday, isTomorrow } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';
import OccurrenceCard from '@/components/OccurrenceCard';
import AppShell from '@/components/AppShell';
import SemanticSearch from '@/components/SemanticSearch';
import { requireUser } from '@/lib/auth';
import { getOpenOccurrencesForHousehold, getUserHousehold, getUserLocale } from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';
import { createHousehold } from './household/actions';

export default async function DashboardPage() {
  const user = await requireUser('/app');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

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
            <button className="btn btn-primary" type="submit">{copy.household.createButton}</button>
          </form>
        </div>
      </AppShell>
    );
  }

  const occurrencesAll = await getOpenOccurrencesForHousehold(membership.households.id);
  const occurrences = occurrencesAll.filter((occurrence) => occurrence.reminder?.is_active);
  const nextOccurrence = occurrences[0];

  const groups: Record<string, typeof occurrences> = {
    today: [],
    tomorrow: [],
    week: [],
    later: []
  };
  occurrences.forEach((occurrence) => {
    const date = new Date(occurrence.occur_at);
    if (isToday(date)) {
      groups.today.push(occurrence);
    } else if (isTomorrow(date)) {
      groups.tomorrow.push(occurrence);
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      groups.week.push(occurrence);
    } else {
      groups.later.push(occurrence);
    }
  });
  const groupLabels: Record<string, string> = {
    today: copy.dashboard.groupToday,
    tomorrow: copy.dashboard.groupTomorrow,
    week: copy.dashboard.groupWeek,
    later: copy.dashboard.groupLater
  };

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
                  {new Date(nextOccurrence.occur_at).toLocaleString(getLocaleTag(locale))}
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

        <section className="space-y-4">
          <SectionHeader title={copy.dashboard.sectionTitle} description={copy.dashboard.sectionSubtitle} />
          {occurrences.length ? (
            <div className="space-y-6">
              {Object.entries(groups).map(([key, items]) => (
                items.length ? (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted">
                      <span>{groupLabels[key]}</span>
                      <span className="h-px flex-1 bg-borderSubtle" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((occurrence) => (
                        <OccurrenceCard key={occurrence.id} occurrence={occurrence} locale={locale} />
                      ))}
                    </div>
                  </div>
                ) : null
              ))}
            </div>
          ) : (
            <div className="card text-sm text-muted">{copy.dashboard.emptyFriendly}</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
