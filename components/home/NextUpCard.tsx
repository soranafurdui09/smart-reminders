"use client";

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { markDone, snoozeOccurrence } from '@/app/app/actions';

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
  title: string;
  taskTitle?: string;
  timeLabel?: string;
  badge?: string;
  badgeStyle?: CSSProperties;
  subtext?: string;
  tone?: 'normal' | 'overdue' | 'urgent';
  statusLabel?: string;
  emptyLabel?: string;
  action?: NextUpAction | null;
  onMoreActions?: () => void;
  moreLabel?: string;
  secondaryLabels?: SecondaryLabels;
  focusCopy?: string;
};

export default function NextUpCard({
  title,
  taskTitle,
  timeLabel,
  badge,
  badgeStyle,
  subtext,
  tone = 'normal',
  statusLabel,
  emptyLabel,
  action,
  onMoreActions,
  moreLabel,
  secondaryLabels,
  focusCopy
}: Props) {
  const isEmpty = !taskTitle || !timeLabel;
  const toneClassName = useMemo(() => {
    if (tone === 'overdue') return 'next-reminder-card--overdue';
    if (tone === 'urgent') return 'next-reminder-card--urgent';
    return '';
  }, [tone]);

  const subtleBadgeStyle = useMemo(() => {
    if (!badgeStyle?.borderColor) return undefined;
    return {
      borderColor: badgeStyle.borderColor
    } satisfies CSSProperties;
  }, [badgeStyle]);

  return (
    <div className={`next-reminder-card ${toneClassName}`}>
      <span className="next-reminder-topline" aria-hidden="true" />
      <span className="next-reminder-corner" aria-hidden="true" />
      <div className="flex items-start justify-between gap-1.5">
        <div className="next-reminder-label">{title}</div>
        {onMoreActions ? (
          <button
            type="button"
            className="next-reminder-more"
            aria-label={moreLabel ?? 'Mai multe acțiuni'}
            onClick={onMoreActions}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {subtext ? <div className="next-reminder-subtitle">{subtext}</div> : null}
      {isEmpty ? (
        <div className="mt-1.5 text-sm font-semibold text-[rgba(255,255,255,0.72)]">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="next-reminder-title line-clamp-2">{taskTitle}</div>
            {action ? (
              <form action={markDone}>
                <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                <input type="hidden" name="reminderId" value={action.reminderId} />
                <input type="hidden" name="occurAt" value={action.occurAt} />
                <input type="hidden" name="done_comment" value="" />
                <ActionSubmitButton
                  className="next-reminder-primary"
                  type="submit"
                  data-action-feedback={action.feedbackLabel}
                >
                  {action.label}
                </ActionSubmitButton>
              </form>
            ) : null}
          </div>
          <div className="next-reminder-time">{timeLabel}</div>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {badge ? (
                <span className="next-reminder-pill" style={subtleBadgeStyle}>
                  {badge}
                </span>
              ) : null}
              {tone === 'overdue' ? (
                <span className="next-reminder-overdue">
                  {statusLabel ?? 'Întârziat'}
                </span>
              ) : null}
            </div>
            {action ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <form action={snoozeOccurrence}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="mode" value="30" />
                  <ActionSubmitButton className="next-reminder-secondary" type="submit">
                    {secondaryLabels?.snooze30 ?? 'Amână 30m'}
                  </ActionSubmitButton>
                </form>
                <form action={snoozeOccurrence}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="option_id" value="tomorrow" />
                  <ActionSubmitButton className="next-reminder-secondary" type="submit">
                    {secondaryLabels?.snoozeTomorrow ?? 'Mută mâine'}
                  </ActionSubmitButton>
                </form>
              </div>
            ) : null}
          </div>
          <div className="next-reminder-focus">
            {focusCopy ?? 'Un pas mic acum → zi mai ușoară.'}
          </div>
        </div>
      )}
    </div>
  );
}
