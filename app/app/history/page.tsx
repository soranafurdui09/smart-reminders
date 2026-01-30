import Link from 'next/link';
import { addDays, subMonths } from 'date-fns';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import {
  getActionOccurrencesForHousehold,
  getDoneOccurrencesForHouseholdPaged,
  getHouseholdMembers,
  getUserHousehold,
  getUserLocale
} from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';

export default async function HistoryPage({
  searchParams
}: {
  searchParams: { range?: string; performer?: string; page?: string };
}) {
  const DEV = process.env.NODE_ENV !== 'production';
  if (DEV) console.time('[history] user+context');
  const user = await requireUser('/app/history');
  const [locale, membership] = await Promise.all([
    getUserLocale(user.id),
    getUserHousehold(user.id)
  ]);
  if (DEV) console.timeEnd('[history] user+context');
  const copy = messages[locale];
  const rangeLabels = {
    '7': copy.history.range7,
    '30': copy.history.range30,
    all: copy.history.rangeAll
  } as const;

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
  if (DEV) console.time('[history] household data');
  const membersPromise = getHouseholdMembers(membership.households.id);
  const memberLabelMap = new Map(
    (await membersPromise).map((member: any) => [
      member.user_id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const performerParam = searchParams.performer;
  const performerFilter = performerParam && memberLabelMap.has(performerParam) ? performerParam : 'all';
  const pageSize = 40;
  const pageParam = Number(searchParams.page || '1');
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const offset = (page - 1) * pageSize;
  const cutoff = range === 'all' ? subMonths(new Date(), 6) : addDays(new Date(), -Number(range));
  const cutoffIso = cutoff.toISOString();
  const donePromise = getDoneOccurrencesForHouseholdPaged({
    householdId: membership.households.id,
    limit: pageSize,
    offset,
    performedBy: performerFilter === 'all' ? undefined : performerFilter,
    startIso: cutoffIso
  });
  const actionPromise = getActionOccurrencesForHousehold(
    membership.households.id,
    ['done', 'snoozed'],
    cutoffIso
  );
  const [members, { items: filtered, hasMore }, actionOccurrences] = await Promise.all([
    membersPromise,
    donePromise,
    actionPromise
  ]);
  if (DEV) console.timeEnd('[history] household data');
  const statsMap = new Map<string, { done: number; snoozed: number }>();
  actionOccurrences.forEach((occurrence) => {
    if (!occurrence.performed_by) {
      return;
    }
    const current = statsMap.get(occurrence.performed_by) ?? { done: 0, snoozed: 0 };
    if (occurrence.status === 'done') {
      current.done += 1;
    }
    if (occurrence.status === 'snoozed') {
      current.snoozed += 1;
    }
    statsMap.set(occurrence.performed_by, current);
  });
  const statsRows = members.map((member: any) => {
    const label = member.profiles?.name || member.profiles?.email || member.user_id;
    const initial = String(label || 'U').charAt(0).toUpperCase();
    const counts = statsMap.get(member.user_id) ?? { done: 0, snoozed: 0 };
    return { id: member.user_id, label, initial, counts };
  });
  const hasStats = statsRows.some((row) => row.counts.done > 0 || row.counts.snoozed > 0);

  const buildHistoryUrl = (nextRange: RangeKey, nextPage?: number) => {
    const params = new URLSearchParams();
    if (nextRange !== '7') {
      params.set('range', nextRange);
    }
    if (performerFilter !== 'all') {
      params.set('performer', performerFilter);
    }
    if (nextPage && nextPage > 1) {
      params.set('page', String(nextPage));
    }
    const query = params.toString();
    return query ? `/app/history?${query}` : '/app/history';
  };

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

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full overflow-x-auto">
            <div className="inline-flex min-w-max flex-nowrap gap-1 rounded-full border border-borderSubtle bg-surfaceMuted p-1">
            {(['7', '30', 'all'] as const).map((key) => (
              <Link
                key={key}
                href={buildHistoryUrl(key)}
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
          </div>
          <form action="/app/history" method="get" className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <input type="hidden" name="range" value={range} />
            <label className="text-xs font-semibold text-muted">{copy.history.filterPerformerLabel}</label>
            <select name="performer" className="input h-9 max-w-full" defaultValue={performerFilter}>
              <option value="all">{copy.history.filterAllMembers}</option>
              {members.map((member: any) => {
                const label = member.profiles?.name || member.profiles?.email || member.user_id;
                return (
                  <option key={member.user_id} value={member.user_id}>
                    {label}
                  </option>
                );
              })}
            </select>
            <button className="btn btn-secondary h-9" type="submit">{copy.history.filterApply}</button>
          </form>
        </div>

        <section className="card space-y-4">
          <div>
            <div className="text-lg font-semibold text-ink">{copy.history.statsTitle}</div>
            <p className="text-sm text-muted">{copy.history.statsSubtitle}</p>
          </div>
          {hasStats ? (
            <div className="grid gap-3 md:grid-cols-2">
              {statsRows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSubtle bg-surface p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink">
                      {row.initial}
                    </div>
                    <div className="min-w-0 text-sm font-semibold text-ink truncate">{row.label}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <svg aria-hidden="true" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeWidth="1.5" d="M5 13l4 4L19 7" />
                      </svg>
                      {row.counts.done} {copy.history.statsDoneLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg aria-hidden="true" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24">
                        <path
                          stroke="currentColor"
                          strokeWidth="1.5"
                          d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                        />
                      </svg>
                      {row.counts.snoozed} {copy.history.statsSnoozedLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.history.statsEmpty}</div>
          )}
        </section>

        <section>
          <SectionHeader title={copy.history.sectionTitle} description={copy.history.sectionSubtitle} />
          {filtered.length ? (
            <div className="space-y-4">
              <div className="relative space-y-4 border-l border-borderSubtle pl-6">
                {filtered.map((occurrence) => {
                  const performerLabel = occurrence.performed_by
                    ? memberLabelMap.get(occurrence.performed_by) || copy.history.performerUnknown
                    : null;
                  const categoryId = inferReminderCategoryId({
                    title: occurrence.reminder?.title,
                    notes: null,
                    kind: null,
                    category: occurrence.reminder?.category ?? null,
                    medicationDetails: null
                  });
                  const category = getReminderCategory(categoryId);
                  const categoryChipStyle = getCategoryChipStyle(category.color, true);
                  return (
                    <Link
                      key={occurrence.id}
                      href={`/app/reminders/${occurrence.reminder?.id}`}
                      className="card relative block w-full border-l-4 hover:-translate-y-0.5 hover:shadow-md"
                      style={{ borderLeftColor: category.color }}
                    >
                      <span className="absolute -left-4 top-6 h-3 w-3 rounded-full border border-primary/40 bg-primarySoft shadow-sm" />
                      <div className="text-sm text-muted">
                        {occurrence.done_at ? new Date(occurrence.done_at).toLocaleString(getLocaleTag(locale)) : copy.common.done}
                      </div>
                      <div className="text-sm font-semibold text-ink">{occurrence.reminder?.title || copy.reminderDetail.title}</div>
                      <div className="mt-1">
                        <span className="chip" style={categoryChipStyle}>
                          {category.label}
                        </span>
                      </div>
                      {performerLabel ? (
                        <div className="text-xs text-muted">
                          {copy.history.performedBy} {performerLabel}
                        </div>
                      ) : null}
                      <div className="text-xs text-muted">{copy.history.detailsHint}</div>
                    </Link>
                  );
                })}
              </div>
              {hasMore ? (
                <div className="flex justify-center">
                  <Link className="btn btn-secondary" href={buildHistoryUrl(range, page + 1)}>
                    {copy.history.loadMore}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="card text-sm text-muted">{copy.history.emptyFriendly}</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
