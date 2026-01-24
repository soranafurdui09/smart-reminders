import Link from 'next/link';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isToday, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import CalendarView from '@/components/calendar/CalendarView';
import { requireUser } from '@/lib/auth';
import { getOpenOccurrencesForHouseholdRange, getUserHousehold, getUserLocale, getUserTimeZone } from '@/lib/data';
import { getLocaleTag, messages } from '@/lib/i18n';
import { resolveReminderTimeZone } from '@/lib/dates';
import { getReminderCategory, inferReminderCategoryId } from '@/lib/categories';

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
  const userTimeZone = await getUserTimeZone(user.id);
  const copy = messages[locale];
  const membership = await getUserHousehold(user.id);

  if (!membership?.households) {
    return (
      <AppShell locale={locale} activePath="/app/calendar" userEmail={user.email}>
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
  type CalendarOccurrence = (typeof occurrences)[number] & { effective_at: string };
  const itemsByDay = new Map<string, CalendarOccurrence[]>();
  occurrences.forEach((occurrence) => {
    // Calendar uses snoozed_until as the effective due time when present.
    const effectiveAt = occurrence.snoozed_until ?? occurrence.occur_at;
    const key = format(new Date(effectiveAt), 'yyyy-MM-dd');
    const existing = itemsByDay.get(key) ?? ([] as CalendarOccurrence[]);
    existing.push({ ...occurrence, effective_at: effectiveAt });
    itemsByDay.set(key, existing);
  });

  const days: Date[] = [];
  for (let day = rangeStart; day <= rangeEnd; day = addDays(day, 1)) {
    days.push(day);
  }

  const prevMonth = format(addMonths(monthStart, -1), 'yyyy-MM');
  const nextMonth = format(addMonths(monthStart, 1), 'yyyy-MM');
  const localeTag = getLocaleTag(locale) || 'ro-RO';
  const monthLabel = monthStart.toLocaleDateString(localeTag, { month: 'long', year: 'numeric' });
  const dayLabelFormatter = new Intl.DateTimeFormat(localeTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
  const dayNumberFormatter = new Intl.DateTimeFormat(localeTag, { day: 'numeric' });

  const dayCells = days.map((day) => {
    const key = format(day, 'yyyy-MM-dd');
    const items = itemsByDay.get(key) ?? [];
    const itemEntries = items.map((occurrence) => {
      const categoryId = inferReminderCategoryId({
        title: occurrence.reminder?.title,
        notes: occurrence.reminder?.notes,
        kind: occurrence.reminder?.kind,
        category: occurrence.reminder?.category,
        medicationDetails: occurrence.reminder?.medication_details
      });
      const category = getReminderCategory(categoryId);
      const displayTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, userTimeZone);
      const resolvedTimeZone: string | undefined = displayTimeZone ?? undefined;
      const timeLabel = new Intl.DateTimeFormat(localeTag, {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: resolvedTimeZone
      }).format(new Date(occurrence.effective_at));
      return {
        id: occurrence.id,
        title: occurrence.reminder?.title ?? copy.reminderDetail.title,
        timeLabel,
        href: `/app/reminders/${occurrence.reminder?.id ?? ''}`,
        color: category.color
      };
    });
    return {
      key,
      label: dayLabelFormatter.format(day),
      dayNumber: dayNumberFormatter.format(day),
      isCurrentMonth: day >= monthStart && day <= monthEnd,
      isToday: isToday(day),
      items: itemEntries
    };
  });

  return (
    <AppShell locale={locale} activePath="/app/calendar" userEmail={user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-primary md:text-2xl">{copy.calendar.title}</h1>
            <p className="text-xs text-tertiary md:text-sm">{copy.calendar.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              className="premium-icon-btn inline-flex h-9 w-9 items-center justify-center"
              href={`/app/calendar?month=${prevMonth}`}
              aria-label={copy.calendar.prev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="rounded-full border border-white/10 bg-surface px-4 py-2 text-sm font-semibold text-secondary">
              {monthLabel}
            </div>
            <Link
              className="premium-icon-btn inline-flex h-9 w-9 items-center justify-center"
              href={`/app/calendar?month=${nextMonth}`}
              aria-label={copy.calendar.next}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <CalendarView
          days={dayCells}
          weekdays={[...copy.calendar.weekdays]}
          emptyLabel={copy.calendar.empty}
        />

        {!hasOccurrences ? (
          <div className="premium-card p-4 text-sm text-tertiary">
            {copy.calendar.empty}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
