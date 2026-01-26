"use client";

import type { ComponentType } from 'react';

type Metric = {
  id: string;
  label: string;
  count: number;
  accentClass?: string;
  tone?: 'danger' | 'info' | 'success' | 'warning';
  icon?: ComponentType<{ className?: string }>;
};

type Props = {
  metrics: Metric[];
  onSelect?: (id: string) => void;
};

export default function AtAGlanceRow({ metrics, onSelect }: Props) {
  return (
    <div className="surface-a1 rounded-2xl px-2 py-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className={`stat-tile ${metric.tone === 'danger' ? 'stat-tile-strong' : ''}`}
            onClick={() => onSelect?.(metric.id)}
          >
            <div className="flex items-center justify-between">
              <span
                className={`h-2 w-2 rounded-full ${
                  metric.tone === 'danger'
                    ? 'bg-red-400'
                    : metric.tone === 'warning'
                      ? 'bg-amber-300'
                      : metric.tone === 'success'
                        ? 'bg-emerald-300'
                        : 'bg-blue-300'
                }`}
                aria-hidden="true"
              />
              {metric.icon ? <metric.icon className="h-3.5 w-3.5 text-muted2" /> : null}
            </div>
            <div className={`mt-2 text-lg font-semibold ${metric.accentClass ?? 'text-text'}`}>{metric.count}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted2">{metric.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
