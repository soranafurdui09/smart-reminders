import Link from 'next/link';
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

  const occurrencesAll = await getOpenOccurrencesForHousehold(membership.households.id);
  const occurrences = occurrencesAll.filter((occurrence) => occurrence.reminder?.is_active);
  const nextOccurrence = occurrences[0];

  return (
    <AppShell locale={locale}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{copy.dashboard.title}</h1>
            <p className="text-sm text-slate-500">{copy.dashboard.subtitle}</p>
          </div>
          <Link className="btn btn-primary" href="/app/reminders/new">{copy.dashboard.newReminder}</Link>
        </div>

        <section className="rounded-2xl bg-gradient-to-r from-sky-600 via-sky-500 to-emerald-500 p-6 text-white shadow-lg">
          <div className="text-sm uppercase tracking-wide text-white/80">{copy.dashboard.nextTitle}</div>
          {nextOccurrence ? (
            <div className="mt-2 text-lg font-semibold">
              {nextOccurrence.reminder?.title} · {new Date(nextOccurrence.occur_at).toLocaleString(getLocaleTag(locale))}
            </div>
          ) : (
            <div className="mt-2 text-lg font-semibold">{copy.dashboard.nextEmpty}</div>
          )}
        </section>

        <SemanticSearch
          householdId={membership.households.id}
          localeTag={getLocaleTag(locale)}
          copy={copy.search}
        />

        <section>
          <SectionHeader title={copy.dashboard.sectionTitle} description={copy.dashboard.sectionSubtitle} />
          <div className="grid gap-4 md:grid-cols-2">
            {occurrences.length ? occurrences.map((occurrence) => (
              <OccurrenceCard key={occurrence.id} occurrence={occurrence} locale={locale} />
            )) : <div className="text-sm text-slate-500">{copy.dashboard.empty}</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
