"use client";

import { useMemo, useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { markDone } from '@/app/app/actions';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';

type Locale = string | undefined;

type OccurrencePayload = {
  id: string;
  occur_at: string;
  snoozed_until?: string | null;
  effective_at?: string;
  reminder?: {
    id?: string;
    title?: string;
    due_at?: string | null;
    notes?: string | null;
    kind?: string | null;
    category?: string | null;
    medication_details?: any;
    tz?: string | null;
  } | null;
};

type NextUpAction = {
  occurrenceId: string;
  reminderId: string;
  occurAt: string;
  label: string;
  feedbackLabel?: string;
};

type SecondaryLabels = {
  snooze30: string;
  snoozeTomorrow: string;
};

type Props = {
  copy: any;
  nextOccurrence: OccurrencePayload | null;
  nextOccurrenceLabel?: string;
  nextCategory: { label: string; color: string } | null;
  nextTone: 'normal' | 'overdue' | 'urgent';
  statusLabel?: string;
  emptyLabel?: string;
  action?: NextUpAction | null;
  secondaryLabels?: SecondaryLabels;
  focusCopy?: string;
  todayItems: OccurrencePayload[];
  weekItems: OccurrencePayload[];
  monthItems: OccurrencePayload[];
  onShowMore?: (horizon: 'today' | '7d' | '30d') => void;
  locale?: string;
  userTimeZone?: string;
};

const getMetaLabel = (
  occurrence: OccurrencePayload,
  locale: Locale,
  userTimeZone?: string
) => {
  const reminder = occurrence.reminder ?? null;
  const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
  const resolvedTimeZone = resolveReminderTimeZone(reminder?.tz ?? null, userTimeZone ?? null);
  const displayLabel = occurrence.snoozed_until
    ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
    : formatReminderDateTime(displayAt, reminder?.tz ?? null, userTimeZone ?? null);
  const parsed = new Date(displayAt);
  if (Number.isNaN(parsed.getTime())) return displayLabel;
  const now = new Date();
  const dayDiff = diffDaysInTimeZone(parsed, now, resolvedTimeZone || userTimeZone || 'UTC');
  const rtf = new Intl.RelativeTimeFormat(locale === 'ro' ? 'ro-RO' : locale, { numeric: 'auto' });
  let relativeLabel: string | null = null;
  if (dayDiff !== 0) {
    relativeLabel = rtf.format(dayDiff, 'day');
  } else {
    const diffMinutes = Math.round((parsed.getTime() - now.getTime()) / 60000);
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) >= 1) {
      relativeLabel = rtf.format(diffHours, 'hour');
    } else {
      relativeLabel = rtf.format(diffMinutes, 'minute');
    }
  }
  return relativeLabel ? `${displayLabel} · ${relativeLabel}` : displayLabel;
};

export default function FocusHome({
  copy,
  nextOccurrence,
  nextOccurrenceLabel,
  nextCategory,
  nextTone,
  statusLabel,
  emptyLabel,
  action,
  secondaryLabels,
  focusCopy,
  todayItems,
  weekItems,
  monthItems,
  onShowMore,
  locale,
  userTimeZone
}: Props) {
  const [horizon, setHorizon] = useState<'today' | '7d' | '30d'>('today');
  const horizonRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    const dayOffset = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 0;
    end.setDate(end.getDate() + dayOffset);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [horizon]);
  const sourceItems = useMemo(() => {
    const map = new Map<string, OccurrencePayload>();
    [todayItems, weekItems, monthItems].forEach((items) => {
      items.forEach((item) => map.set(item.id, item));
    });
    return Array.from(map.values());
  }, [monthItems, todayItems, weekItems]);
  const horizonItems = useMemo(() => {
    const { start, end } = horizonRange;
    return sourceItems
      .map((item) => ({
        item,
        date: new Date(item.snoozed_until ?? item.effective_at ?? item.occur_at)
      }))
      .filter(({ date }) => !Number.isNaN(date.getTime()) && date >= start && date <= end)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ item }) => item);
  }, [horizonRange, sourceItems]);
  const nextInRange = horizonItems[0] ?? null;
  const filteredItems = useMemo(() => {
    if (!nextInRange?.id) return horizonItems;
    return horizonItems.filter((item) => item.id !== nextInRange.id);
  }, [horizonItems, nextInRange?.id]);
  const visibleItems = useMemo(() => filteredItems.slice(0, 5), [filteredItems]);
  const horizonLabel =
    horizon === '7d'
      ? 'Următoarele 7 zile'
      : horizon === '30d'
        ? 'Următoarele 30 zile'
        : 'Azi';

  return (
    <section className="space-y-3">
      <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-3)] py-[var(--space-2)]">
        {nextInRange ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-2)]">Next</div>
              <div className="text-sm font-semibold text-[color:var(--text-0)] line-clamp-2">
                {nextInRange.reminder?.title ?? emptyLabel}
              </div>
              <div className="text-xs text-[color:var(--text-2)]">
                {getMetaLabel(nextInRange, locale, userTimeZone).split(' · ')[0]}
              </div>
              {nextCategory && nextOccurrence?.id === nextInRange.id ? (
                <span className="home-category-pill" style={{ borderColor: nextCategory.color }}>
                  {nextCategory.label}
                </span>
              ) : null}
            </div>
            {action && nextInRange.reminder?.id ? (
              <form action={markDone}>
                <input type="hidden" name="occurrenceId" value={nextInRange.id} />
                <input type="hidden" name="reminderId" value={nextInRange.reminder?.id ?? ''} />
                <input type="hidden" name="occurAt" value={nextInRange.occur_at} />
                <input type="hidden" name="done_comment" value="" />
                <ActionSubmitButton
                  className="home-priority-primary"
                  type="submit"
                  data-action-feedback={action.feedbackLabel}
                >
                  {action.label}
                </ActionSubmitButton>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="text-sm text-[color:var(--text-2)]">
            {emptyLabel ?? copy.dashboard.nextUpEmpty}
          </div>
        )}
      </div>

      <section className="space-y-2">
        <div className="homeTabToggle flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px]">
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition ${
              horizon === 'today' ? 'bg-white/10 text-white' : 'text-white/60'
            }`}
            onClick={() => setHorizon('today')}
          >
            Azi
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition ${
              horizon === '7d' ? 'bg-white/10 text-white' : 'text-white/60'
            }`}
            onClick={() => setHorizon('7d')}
          >
            7 zile
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 transition ${
              horizon === '30d' ? 'bg-white/10 text-white' : 'text-white/60'
            }`}
            onClick={() => setHorizon('30d')}
          >
            30 zile
          </button>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--text-0)]">
          <span>{horizonLabel}</span>
        </div>

        {visibleItems.length ? (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5">
              {visibleItems.map((occurrence, index) => {
              const reminder = occurrence.reminder ?? null;
              const reminderId = reminder?.id ?? '';
              return (
                <div
                  key={occurrence.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    index === 0 ? '' : 'border-t border-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[color:var(--text-0)] line-clamp-2">
                      {reminder?.title ?? copy.dashboard.nextUpEmpty}
                    </div>
                    <div className="text-xs text-white/40">
                      {getMetaLabel(occurrence, locale, userTimeZone).split(' · ')[0]}
                    </div>
                  </div>
                  <form action={markDone}>
                    <input type="hidden" name="occurrenceId" value={occurrence.id} />
                    <input type="hidden" name="reminderId" value={reminderId} />
                    <input type="hidden" name="occurAt" value={occurrence.occur_at ?? ''} />
                    <input type="hidden" name="done_comment" value="" />
                    <ActionSubmitButton
                      className="rounded-full px-3 py-1.5 text-xs bg-white/10 text-white/80 border border-white/10"
                      type="submit"
                      data-action-feedback={copy.common.actionDone}
                    >
                      {copy.dashboard.nextUpAction}
                    </ActionSubmitButton>
                  </form>
                </div>
              );
              })}
            </div>
            {filteredItems.length > 5 ? (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-white/60 hover:text-white"
                onClick={() => onShowMore?.(horizon)}
              >
                Arată toate
              </button>
            ) : null}
          </>
        ) : (
          <div className="home-glass-panel rounded-[var(--radius-lg)] p-[var(--space-3)] text-sm text-[color:var(--text-2)]">
            Nu ai nimic urgent azi…
          </div>
        )}
      </section>
    </section>
  );
}
