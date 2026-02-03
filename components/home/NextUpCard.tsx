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
    <div className={`next-reminder-card ${toneClassName} relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06] shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-[18px] p-2`}>
      <div className="next-reminder-content">
        <span className="next-reminder-topline" aria-hidden="true" />
        <span className="next-reminder-corner" aria-hidden="true" />
        <div className="flex items-start justify-between gap-1.5">
          <div className="next-reminder-label text-[0.625rem] tracking-[0.18em] uppercase text-white/60">{title}</div>
          {onMoreActions ? (
            <button
              type="button"
              className="next-reminder-more w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
              aria-label={moreLabel ?? 'Mai multe acțiuni'}
              onClick={onMoreActions}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {subtext ? <div className="next-reminder-subtitle">{subtext}</div> : null}
        {isEmpty ? (
          <div className="mt-0.5 text-sm font-semibold text-[color:var(--text-1)]">
            {emptyLabel}
          </div>
        ) : (
          <div className="mt-0.5 space-y-0.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="next-reminder-title line-clamp-2 mt-0.5 text-[clamp(0.96rem,2.9vw,1.08rem)] leading-[1.12] font-semibold text-white">{taskTitle}</div>
              {action ? (
                <form action={markDone}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="reminderId" value={action.reminderId} />
                  <input type="hidden" name="occurAt" value={action.occurAt} />
                  <input type="hidden" name="done_comment" value="" />
                  <ActionSubmitButton
                    className="next-reminder-primary rounded-full px-2 py-1.5 text-[0.76rem] text-white font-semibold"
                    type="submit"
                    data-action-feedback={action.feedbackLabel}
                  >
                    {action.label}
                  </ActionSubmitButton>
                </form>
              ) : null}
            </div>
            <div className="next-reminder-time mt-0.5 text-[clamp(0.64rem,2vw,0.74rem)] text-white/70">{timeLabel}</div>
            <div className="flex items-center gap-1 min-w-0">
              {badge ? (
                <span
                  className="next-reminder-pill px-1.5 py-0.5 rounded-full text-[0.6rem] border border-white/12 bg-white/5 text-white/70 border-emerald-400/35 text-emerald-200/90 bg-emerald-400/10 truncate"
                  style={subtleBadgeStyle}
                >
                  {badge}
                </span>
              ) : null}
              {tone === 'overdue' ? (
                <span className="next-reminder-overdue px-1.5 py-0.5 rounded-full text-[0.6rem] border border-white/12 bg-white/5 text-white/70 border-amber-300/35 text-amber-200/90 bg-amber-300/10 truncate">
                  {statusLabel ?? 'Întârziat'}
                </span>
              ) : null}
            </div>
            {action ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <form action={snoozeOccurrence}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="mode" value="30" />
                  <ActionSubmitButton className="next-reminder-secondary rounded-full px-2 py-1 text-[0.68rem] bg-white/6 border border-white/10 text-white/70" type="submit">
                    {secondaryLabels?.snooze30 ?? 'Amână 30m'}
                  </ActionSubmitButton>
                </form>
                <form action={snoozeOccurrence}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="option_id" value="tomorrow" />
                  <ActionSubmitButton className="next-reminder-secondary rounded-full px-2 py-1 text-[0.68rem] bg-white/6 border border-white/10 text-white/70" type="submit">
                    {secondaryLabels?.snoozeTomorrow ?? 'Mută mâine'}
                  </ActionSubmitButton>
                </form>
              </div>
            ) : null}
            <div className="next-reminder-focus">
              {focusCopy ?? 'Un pas mic acum → zi mai ușoară.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
