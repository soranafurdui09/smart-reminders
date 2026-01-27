"use client";

import { ReactNode } from 'react';

type Props = {
  title: string;
  taskTitle: string;
  timeLabel: string;
  badge?: string;
  subtext?: string;
  actions?: ReactNode;
  tone?: 'overdue' | 'normal';
  statusLabel?: string;
};

export default function NextUpCard({
  title,
  taskTitle,
  timeLabel,
  badge,
  subtext,
  actions,
  tone = 'normal',
  statusLabel
}: Props) {
  return (
    <div className={`surface-a2 relative overflow-hidden rounded-2xl px-[var(--space-3)] py-[var(--space-3)] ${tone === 'overdue' ? 'segment-overdue' : ''}`}>
      {tone === 'overdue' ? (
        <span className="absolute left-0 top-0 h-full w-1 bg-red-500/80" aria-hidden="true" />
      ) : null}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:rgb(var(--info))]">{title}</div>
      <div className="mt-[var(--space-2)] flex items-start justify-between gap-[var(--space-3)]">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-text">{taskTitle}</div>
          <div className="mt-[var(--space-1)] flex flex-wrap items-center gap-[var(--space-2)] text-xs text-muted">
            <span className={tone === 'overdue' ? 'text-red-300' : 'text-text'}>{timeLabel}</span>
            {badge ? (
              <span className="badge badge-blue">
                {badge}
              </span>
            ) : null}
            {tone === 'overdue' ? (
              <span className="badge badge-amber">
                {statusLabel ?? 'ÎNTÂRZIAT'}
              </span>
            ) : null}
          </div>
          {subtext ? <div className="mt-[var(--space-2)] text-[11px] text-muted">{subtext}</div> : null}
        </div>
        {actions ? <div className="flex flex-col items-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
