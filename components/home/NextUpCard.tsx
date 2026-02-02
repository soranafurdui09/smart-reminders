"use client";

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [shimmering, setShimmering] = useState(false);
  const shimmerTimeoutRef = useRef<number | null>(null);

  const toneClassName = useMemo(() => {
    if (tone === 'overdue') return 'next-reminder-card--overdue';
    if (tone === 'urgent') return 'next-reminder-card--urgent';
    return '';
  }, [tone]);

  useEffect(() => {
    return () => {
      if (shimmerTimeoutRef.current) {
        window.clearTimeout(shimmerTimeoutRef.current);
      }
    };
  }, []);

  const triggerShimmer = () => {
    if (shimmerTimeoutRef.current) {
      window.clearTimeout(shimmerTimeoutRef.current);
    }
    setShimmering(true);
    shimmerTimeoutRef.current = window.setTimeout(() => {
      setShimmering(false);
    }, 180);
  };

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
      <span className="next-reminder-sweep" aria-hidden="true" />
      <div className="next-reminder-label">{title}</div>
      {isEmpty ? (
        <div className="mt-2 text-sm font-semibold text-[rgba(255,255,255,0.72)]">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="next-reminder-title line-clamp-2">{taskTitle}</div>
              <div className="next-reminder-time">{timeLabel}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
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
              {subtext ? <div className="text-xs text-[rgba(255,255,255,0.56)]">{subtext}</div> : null}
            </div>
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
          {action ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <form action={markDone}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="reminderId" value={action.reminderId} />
                  <input type="hidden" name="occurAt" value={action.occurAt} />
                  <input type="hidden" name="done_comment" value="" />
                  <ActionSubmitButton
                    className="next-reminder-primary"
                    type="submit"
                    data-shimmer={shimmering ? 'true' : 'false'}
                    data-action-feedback={action.feedbackLabel}
                    onClick={triggerShimmer}
                  >
                    {action.label}
                  </ActionSubmitButton>
                </form>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
              <div className="next-reminder-focus">
                {focusCopy ?? 'Un pas mic acum → zi mai ușoară.'}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
