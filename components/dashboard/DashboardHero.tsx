import Link from 'next/link';
import type { CSSProperties } from 'react';
import VoiceNavButton from '@/components/VoiceNavButton';

type NextReminder = {
  title: string;
  timeLabel: string;
  categoryLabel?: string;
  categoryStyle?: CSSProperties;
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
    <section className="relative overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 shadow-soft">
      <div className="absolute -right-24 -top-24 h-52 w-52 rounded-full bg-sky-100/60 blur-2xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-ink md:text-3xl">{title}</h1>
            <p className="text-sm text-muted">{subtitle}</p>
            <p className="text-xs text-slate-500">{hintExample}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <VoiceNavButton
              href={voiceHref}
              label={voiceAriaLabel}
              title={voiceTitle}
              className="btn btn-primary inline-flex items-center gap-2 px-4"
            >
              <span aria-hidden="true">🎤</span>
              <span>{voiceLabel}</span>
            </VoiceNavButton>
            <Link className="btn btn-secondary inline-flex items-center gap-2 px-4" href={manualHref}>
              <span aria-hidden="true">✍️</span>
              <span>{manualLabel}</span>
            </Link>
          </div>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{nextTitle}</div>
          {nextReminder ? (
            <div className="mt-2 space-y-1">
              <div className="text-lg font-semibold text-ink">{nextReminder.title}</div>
              <div className="text-sm text-muted">{nextReminder.timeLabel}</div>
              {nextReminder.categoryLabel ? (
                <span className="chip mt-2 inline-flex" style={nextReminder.categoryStyle}>
                  {nextReminder.categoryLabel}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted">{nextEmpty}</div>
          )}
        </div>
      </div>
    </section>
  );
}
