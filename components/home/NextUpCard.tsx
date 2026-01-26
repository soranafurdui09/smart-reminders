"use client";

import { ReactNode } from 'react';

type Props = {
  title: string;
  taskTitle: string;
  timeLabel: string;
  badge?: string;
  subtext?: string;
  actions?: ReactNode;
};

export default function NextUpCard({
  title,
  taskTitle,
  timeLabel,
  badge,
  subtext,
  actions
}: Props) {
  return (
    <div className="card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-accent">{title}</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-text">{taskTitle}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{timeLabel}</span>
            {badge ? (
              <span className="badge badge-blue">
                {badge}
              </span>
            ) : null}
          </div>
          {subtext ? <div className="mt-2 text-[11px] text-muted">{subtext}</div> : null}
        </div>
        {actions ? <div className="flex flex-col gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
