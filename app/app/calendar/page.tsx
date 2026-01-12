import Link from 'next/link';
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getOpenOccurrencesForHouseholdRange, getUserHousehold, getUserLocale } from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';

function parseMonth(monthParam?: string) {
  if (!monthParam) {
    return new Date();
  }
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
  if (!match) {
    return new Date();
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return new Date();
  }
  return new Date(year, month - 1, 1);
}

export default async function CalendarPage({
  searchParams
}: {
  searchParams: { month?: string };
}) {
  const user = await requireUser('/app/calendar');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale}>
        <div className="space-y-4">
          <SectionHeader title={copy.calendar.title} description={copy.calendar.noHousehold} />
          <Link className="btn btn-primary" href="/app">{copy.calendar.createHousehold}</Link>
        </div>
      </AppShell>
    );
  }

  const baseDate = parseMonth(searchParams.month);
  const monthStart = startOfMonth(baseDate);
  const monthEnd = endOfMonth(baseDate);
  const rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const occurrences = await getOpenOccurrencesForHouseholdRange(
    membership.households.id,
    monthStart.toISOString(),
    monthEnd.toISOString()
  );
  const hasOccurrences = occurrences.length > 0;

  const itemsByDay = new Map<string, typeof occurrences>();
  occurrences.forEach((occurrence) => {
    const key = format(new Date(occurrence.occur_at), 'yyyy-MM-dd');
    const existing = itemsByDay.get(key) ?? [];
    existing.push(occurrence);
    itemsByDay.set(key, existing);
  });

  const days: Date[] = [];
  for (let day = rangeStart; day <= rangeEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  const prevMonth = format(addMonths(monthStart, -1), 'yyyy-MM');
  const nextMonth = format(addMonths(monthStart, 1), 'yyyy-MM');
  const monthLabel = monthStart.toLocaleDateString(getLocaleTag(locale), { month: 'long', year: 'numeric' });

  return (
    <AppShell locale={locale}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{copy.calendar.title}</h1>
            <p className="text-sm text-slate-500">{copy.calendar.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link className="btn btn-secondary" href={`/app/calendar?month=${prevMonth}`}>{copy.calendar.prev}</Link>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
              {monthLabel}
            </div>
            <Link className="btn btn-secondary" href={`/app/calendar?month=${nextMonth}`}>{copy.calendar.next}</Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px rounded-2xl border border-slate-200 bg-slate-200">
          {copy.calendar.weekdays.map((label) => (
            <div key={label} className="bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
              {label}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const items = itemsByDay.get(key) ?? [];
            const visibleItems = items.slice(0, 2);
            const extraCount = items.length - visibleItems.length;
            const isCurrentMonth = day >= monthStart && day <= monthEnd;
            return (
              <div
                key={key}
                className={`min-h-[120px] bg-white p-3 ${isCurrentMonth ? '' : 'opacity-50'}`}
              >
                <div className="text-xs font-semibold text-slate-500">{format(day, 'd')}</div>
                <div className="mt-2 space-y-1">
                  {visibleItems.map((occurrence) => (
                    <Link
                      key={occurrence.id}
                      href={`/app/reminders/${occurrence.reminder?.id ?? ''}`}
                      className="block rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:border-sky-200 hover:bg-white"
                    >
                      <div className="font-semibold">
                        {format(new Date(occurrence.occur_at), 'HH:mm')} {occurrence.reminder?.title ?? copy.reminderDetail.title}
                      </div>
                    </Link>
                  ))}
                  {extraCount > 0 ? (
                    <div className="text-xs text-slate-400">+{extraCount} {copy.calendar.more}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {!hasOccurrences ? (
          <div className="text-sm text-slate-500">{copy.calendar.empty}</div>
        ) : null}
      </div>
    </AppShell>
  );
}
