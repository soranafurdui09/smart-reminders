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
      <AppShell locale={locale}>
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
    <AppShell locale={locale}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{copy.history.title}</h1>
            <p className="text-sm text-slate-500">{rangeLabels[range]}</p>
          </div>
          <Link className="btn btn-secondary" href="/app">{copy.common.back}</Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['7', '30', 'all'] as const).map((key) => (
            <Link
              key={key}
              href={`/app/history?range=${key}`}
              className={`btn ${range === key ? 'btn-primary' : 'btn-secondary'}`}
            >
              {rangeLabels[key]}
            </Link>
          ))}
        </div>

        <section>
          <SectionHeader title={copy.history.sectionTitle} description={copy.history.sectionSubtitle} />
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.length ? filtered.map((occurrence) => (
              <Link
                key={occurrence.id}
                href={`/app/reminders/${occurrence.reminder?.id}`}
                className="card transition hover:border-sky-200 hover:shadow-md"
              >
                <div className="text-sm text-slate-500">
                  {occurrence.done_at ? new Date(occurrence.done_at).toLocaleString(getLocaleTag(locale)) : copy.common.done}
                </div>
                <div className="text-sm font-semibold">{occurrence.reminder?.title || copy.reminderDetail.title}</div>
                <div className="text-xs text-slate-400">{copy.history.detailsHint}</div>
              </Link>
            )) : <div className="text-sm text-slate-500">{copy.history.empty}</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
