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
    <div className={`next-reminder-card ${toneClassName} relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06] shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-[18px] before:content-[''] before:absolute before:top-[-34px] before:right-[-70px] before:w-[260px] before:h-[170px] before:bg-[radial-gradient(circle_at_35%_35%,rgba(214,161,74,0.40)_0%,rgba(214,161,74,0.18)_38%,rgba(214,161,74,0.00)_72%)] before:blur-[10px] before:opacity-95 before:pointer-events-none after:content-[''] after:absolute after:top-0 after:left-[14px] after:right-[14px] after:h-px after:bg-[linear-gradient(90deg,rgba(214,161,74,0)_0%,rgba(214,161,74,0.55)_45%,rgba(214,161,74,0)_100%)] after:opacity-60 after:pointer-events-none`}>
      <span className="next-reminder-topline" aria-hidden="true" />
      <span className="next-reminder-corner" aria-hidden="true" />
      <div className="flex items-start justify-between gap-1.5">
        <div className="next-reminder-label text-[12px] tracking-[0.18em] uppercase text-white/60">{title}</div>
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
        <div className="mt-1.5 text-sm font-semibold text-[color:var(--text-1)]">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="next-reminder-title line-clamp-2 mt-2 text-[28px] leading-[1.1] font-semibold text-white">{taskTitle}</div>
            {action ? (
              <form action={markDone}>
                <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                <input type="hidden" name="reminderId" value={action.reminderId} />
                <input type="hidden" name="occurAt" value={action.occurAt} />
                <input type="hidden" name="done_comment" value="" />
                <ActionSubmitButton
                  className="next-reminder-primary rounded-full px-6 py-3 bg-[#4D7DFF] text-white font-semibold shadow-[0_10px_24px_rgba(77,125,255,0.35)]"
                  type="submit"
                  data-action-feedback={action.feedbackLabel}
                >
                  {action.label}
                </ActionSubmitButton>
              </form>
            ) : null}
          </div>
          <div className="next-reminder-time mt-2 text-[16px] text-white/70">{timeLabel}</div>
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {badge ? (
                <span
                  className="next-reminder-pill px-3 py-1 rounded-full text-[13px] border border-white/12 bg-white/5 text-white/70 border-emerald-400/35 text-emerald-200/90 bg-emerald-400/10"
                  style={subtleBadgeStyle}
                >
                  {badge}
                </span>
              ) : null}
              {tone === 'overdue' ? (
                <span className="next-reminder-overdue px-3 py-1 rounded-full text-[13px] border border-white/12 bg-white/5 text-white/70 border-amber-300/35 text-amber-200/90 bg-amber-300/10">
                  {statusLabel ?? 'Întârziat'}
                </span>
              ) : null}
            </div>
            {action ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <form action={snoozeOccurrence}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="mode" value="30" />
                  <ActionSubmitButton className="next-reminder-secondary rounded-full px-5 py-2 bg-white/6 border border-white/10 text-white/70" type="submit">
                    {secondaryLabels?.snooze30 ?? 'Amână 30m'}
                  </ActionSubmitButton>
                </form>
                <form action={snoozeOccurrence}>
                  <input type="hidden" name="occurrenceId" value={action.occurrenceId} />
                  <input type="hidden" name="option_id" value="tomorrow" />
                  <ActionSubmitButton className="next-reminder-secondary rounded-full px-5 py-2 bg-white/6 border border-white/10 text-white/70" type="submit">
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
