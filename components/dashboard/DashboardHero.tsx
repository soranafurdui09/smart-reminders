import Link from 'next/link';
import type { CSSProperties } from 'react';
import VoiceNavButton from '@/components/VoiceNavButton';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { markDone } from '@/app/app/actions';

type NextReminderAction = {
  occurrenceId: string;
  reminderId: string;
  occurAt: string;
};

type NextReminder = {
  title: string;
  timeLabel: string;
  categoryLabel?: string;
  categoryStyle?: CSSProperties;
  urgencyLabel?: string;
  urgencyClassName?: string;
  action?: NextReminderAction;
  actionLabel?: string;
};

type Props = {
  title: string;
  subtitle: string;
  hintExample: string;
  voiceLabel: string;
  voiceAriaLabel: string;
  voiceTitle: string;
  voiceHref: string;
  manualLabel: string;
  manualHref: string;
  nextTitle: string;
  nextEmpty: string;
  nextReminder?: NextReminder | null;
};

export default function DashboardHero({
  title,
  subtitle,
  hintExample,
  voiceLabel,
  voiceAriaLabel,
  voiceTitle,
  voiceHref,
  manualLabel,
  manualHref,
  nextTitle,
  nextEmpty,
  nextReminder
}: Props) {
  return (
    <section className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-6">
      <div className="order-2 rounded-[var(--radius-card)] border border-white/10 bg-[linear-gradient(135deg,rgba(20,40,58,0.95),rgba(10,28,42,0.9))] p-4 text-primary shadow-soft md:order-1 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
            <p className="text-sm text-secondary">{subtitle}</p>
            <p className="text-xs text-tertiary md:text-sm">{hintExample}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <VoiceNavButton
              href={voiceHref}
              label={voiceAriaLabel}
              title={voiceTitle}
              className="premium-btn-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm0 14a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v4"
                />
              </svg>
              {voiceLabel}
            </VoiceNavButton>
            <Link
              className="premium-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
              href={manualHref}
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                />
              </svg>
              {manualLabel}
            </Link>
          </div>
        </div>
      </div>

      <div className="order-1 rounded-[var(--radius-card)] border border-white/10 bg-surface p-4 shadow-soft md:order-2 md:p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-tertiary">{nextTitle}</div>
        {nextReminder ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="space-y-1">
              <div className="text-base font-semibold text-primary">{nextReminder.title}</div>
              <div className="text-sm text-tertiary">{nextReminder.timeLabel}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {nextReminder.categoryLabel ? (
                <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold" style={nextReminder.categoryStyle}>
                  {nextReminder.categoryLabel}
                </span>
              ) : null}
              {nextReminder.urgencyLabel ? (
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${nextReminder.urgencyClassName ?? ''}`}>
                  {nextReminder.urgencyLabel}
                </span>
              ) : null}
            </div>
            {nextReminder.action ? (
              <form action={markDone}>
                <input type="hidden" name="occurrenceId" value={nextReminder.action.occurrenceId} />
                <input type="hidden" name="reminderId" value={nextReminder.action.reminderId} />
                <input type="hidden" name="occurAt" value={nextReminder.action.occurAt} />
                <ActionSubmitButton className="premium-btn-primary w-full" type="submit">
                  {nextReminder.actionLabel ?? 'Marcheaza ca rezolvat'}
                </ActionSubmitButton>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 text-sm text-tertiary">{nextEmpty}</div>
        )}
      </div>
    </section>
  );
}
