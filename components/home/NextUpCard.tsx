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
    <div className="rounded-2xl border border-amber-100/70 bg-amber-50/60 p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">{title}</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{taskTitle}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span>{timeLabel}</span>
            {badge ? (
              <span className="rounded-full border border-amber-200/70 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                {badge}
              </span>
            ) : null}
          </div>
          {subtext ? <div className="mt-2 text-[11px] text-slate-500">{subtext}</div> : null}
        </div>
        {actions ? <div className="flex flex-col gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
