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
  activeId?: string | null;
  onSelect?: (id: string) => void;
  variant?: 'primary' | 'secondary';
};

export default function AtAGlanceRow({ metrics, activeId, onSelect, variant = 'primary' }: Props) {
  const isSecondary = variant === 'secondary';
  return (
    <div className="surface-a1 rounded-2xl px-[var(--space-2)] py-[var(--space-2)]">
      <div className="grid grid-cols-2 gap-[var(--space-2)] md:grid-cols-4">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className={`stat-tile ${isSecondary ? 'stat-tile-secondary' : ''} ${
              metric.tone === 'danger'
                ? 'stat-tile-strong stat-tile-danger'
                : metric.tone === 'success'
                  ? 'stat-tile-success'
                  : metric.tone === 'warning'
                    ? 'stat-tile-warning'
                    : 'stat-tile-info'
            } ${activeId === metric.id ? 'stat-tile-active' : ''}`}
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
              {metric.icon ? <metric.icon className="h-4 w-4 text-muted" /> : null}
            </div>
            <div className={`mt-2 ${isSecondary ? 'text-base' : 'text-lg'} font-semibold ${metric.accentClass ?? 'text-text'}`}>{metric.count}</div>
            <div className={`mt-1 ${isSecondary ? 'text-[9px]' : 'text-[10px]'} font-semibold uppercase tracking-wide text-muted2`}>
              {metric.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
