"use client";

import { useMemo, useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import NextUpCard from '@/components/home/NextUpCard';
import QuickAddBar from '@/components/home/QuickAddBar';
import { markDone } from '@/app/app/actions';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';

type Locale = string;

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
  locale?: Locale;
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
  locale = 'ro-RO',
  userTimeZone
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = useMemo(() => (showAll ? todayItems : todayItems.slice(0, 5)), [showAll, todayItems]);

  return (
    <section className="space-y-3">
      <NextUpCard
        title={copy.dashboard.nextTitle}
        subtext={copy.dashboard.nextUpHelper}
        taskTitle={nextOccurrence?.reminder?.title ?? undefined}
        timeLabel={nextOccurrenceLabel ?? undefined}
        badge={nextCategory?.label}
        badgeStyle={nextCategory ? getCategoryChipStyle(nextCategory.color, true) : undefined}
        tone={nextTone}
        statusLabel={statusLabel}
        emptyLabel={emptyLabel}
        action={action ?? null}
        secondaryLabels={secondaryLabels}
        focusCopy={focusCopy}
      />

      <QuickAddBar />

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold text-[color:var(--text-0)]">
          <span>{copy.dashboard.todayTitle}</span>
          <span className="text-xs text-[color:var(--text-2)]">
            {todayItems.length} {copy.dashboard.reminderCountLabel}
          </span>
        </div>

        {visibleItems.length ? (
          <div className="space-y-2">
            {visibleItems.map((occurrence) => {
              const reminder = occurrence.reminder ?? null;
              const reminderId = reminder?.id ?? '';
              const categoryId = inferReminderCategoryId({
                title: reminder?.title,
                notes: reminder?.notes,
                kind: reminder?.kind,
                category: reminder?.category,
                medicationDetails: reminder?.medication_details
              });
              const category = getReminderCategory(categoryId);
              const categoryStyle = getCategoryChipStyle(category.color, true);
              return (
                <div
                  key={occurrence.id}
                  className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-3)] py-[var(--space-2)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-semibold text-[color:var(--text-0)] line-clamp-2">
                        {reminder?.title ?? copy.dashboard.nextUpEmpty}
                      </div>
                      <div className="text-xs text-[color:var(--text-2)]">
                        {getMetaLabel(occurrence, locale, userTimeZone)}
                      </div>
                      <span className="home-category-pill" style={{ borderColor: category.color }}>
                        {category.label}
                      </span>
                    </div>
                    <form action={markDone}>
                      <input type="hidden" name="occurrenceId" value={occurrence.id} />
                      <input type="hidden" name="reminderId" value={reminderId} />
                      <input type="hidden" name="occurAt" value={occurrence.occur_at ?? ''} />
                      <input type="hidden" name="done_comment" value="" />
                      <ActionSubmitButton
                        className="home-priority-primary"
                        type="submit"
                        data-action-feedback={copy.common.actionDone}
                      >
                        {copy.dashboard.nextUpAction}
                      </ActionSubmitButton>
                    </form>
                  </div>
                </div>
              );
            })}
            {todayItems.length > 5 ? (
              <button
                type="button"
                className="text-xs font-semibold text-[color:var(--text-1)]"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? 'Arată mai puține' : 'Arată mai multe'}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="home-glass-panel rounded-[var(--radius-lg)] p-[var(--space-3)] text-sm text-[color:var(--text-2)]">
            Nu ai nimic urgent azi…
          </div>
        )}
      </section>
    </section>
  );
}
