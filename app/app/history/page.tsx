import Link from 'next/link';
import { addDays } from 'date-fns';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getDoneOccurrencesForHousehold, getUserHousehold, getUserLocale } from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';

export default async function HistoryPage({
  searchParams
}: {
  searchParams: { range?: string };
}) {
  const user = await requireUser('/app/history');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const rangeLabels = {
    '7': copy.history.range7,
    '30': copy.history.range30,
    all: copy.history.rangeAll
  } as const;
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale} activePath="/app/history" userEmail={user.email}>
        <div className="space-y-4">
          <SectionHeader title={copy.history.title} description={copy.history.noHousehold} />
          <Link className="btn btn-primary" href="/app">{copy.history.createHousehold}</Link>
        </div>
      </AppShell>
    );
  }

  type RangeKey = keyof typeof rangeLabels;
  const rangeParam = searchParams.range;
  const range = (rangeParam && rangeParam in rangeLabels ? rangeParam : '7') as RangeKey;
  const allDone = await getDoneOccurrencesForHousehold(membership.households.id, 200);
  const cutoff = range === 'all' ? null : addDays(new Date(), -Number(range));
  const filtered = cutoff
    ? allDone.filter((occurrence) => occurrence.done_at && new Date(occurrence.done_at) >= cutoff)
    : allDone;

  return (
    <AppShell locale={locale} activePath="/app/history" userEmail={user.email}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1>{copy.history.title}</h1>
            <p className="text-sm text-muted">{rangeLabels[range]}</p>
          </div>
          <Link className="btn btn-secondary" href="/app">{copy.common.back}</Link>
        </div>

        <div className="inline-flex flex-wrap gap-1 rounded-full border border-border-subtle bg-surfaceMuted/70 p-1">
          {(['7', '30', 'all'] as const).map((key) => (
            <Link
              key={key}
              href={`/app/history?range=${key}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                range === key
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {rangeLabels[key]}
            </Link>
          ))}
        </div>

        <section>
          <SectionHeader title={copy.history.sectionTitle} description={copy.history.sectionSubtitle} />
          {filtered.length ? (
            <div className="relative space-y-4 pl-6">
              <div className="absolute left-2 top-2 h-full w-px bg-border-subtle" />
              {filtered.map((occurrence) => (
                <Link
                  key={occurrence.id}
                  href={`/app/reminders/${occurrence.reminder?.id}`}
                  className="card relative hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="absolute -left-6 top-6 h-3 w-3 rounded-full border border-primary/40 bg-primarySoft" />
                  <div className="text-sm text-muted">
                    {occurrence.done_at ? new Date(occurrence.done_at).toLocaleString(getLocaleTag(locale)) : copy.common.done}
                  </div>
                  <div className="text-sm font-semibold text-ink">{occurrence.reminder?.title || copy.reminderDetail.title}</div>
                  <div className="text-xs text-muted">{copy.history.detailsHint}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card text-sm text-muted">{copy.history.emptyFriendly}</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
