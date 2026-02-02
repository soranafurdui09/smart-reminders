"use client";

import type { ComponentType, CSSProperties } from 'react';

type Metric = {
  id: string;
  label: string;
  count: number;
  accentClass?: string;
  accentRgb?: string;
  subLabel?: string;
  tileClass?: string;
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
    <div className="home-glass-panel at-a-glance-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className={`stat-tile home-tile p-2 ${isSecondary ? 'stat-tile-secondary' : ''} ${
              metric.tileClass ?? ''
            } ${activeId === metric.id ? 'stat-tile-active' : ''}`}
            style={
              metric.accentRgb
                ? ({
                    '--tile-accent': metric.accentRgb
                  } as CSSProperties)
                : undefined
            }
            onClick={() => onSelect?.(metric.id)}
          >
            <div className="flex items-center justify-between">
              <span className="h-2 w-2 rounded-full bg-[rgba(var(--tile-accent),0.9)]" aria-hidden="true" />
              {metric.icon ? <metric.icon className="h-3 w-3 text-[color:var(--text-1)]" /> : null}
            </div>
            <div
              className="mt-0.5 text-[clamp(0.9rem,3vw,1.05rem)] leading-tight font-semibold text-[color:var(--tile-ink,var(--text-0))]"
            >
              {metric.count}
            </div>
            <div
              className="mt-0.5 text-[0.62rem] font-semibold text-[color:var(--text-1)]"
            >
              {metric.label}
            </div>
            {metric.subLabel ? (
              <div className="mt-0.5 text-[0.58rem] text-[color:var(--text-2)]">{metric.subLabel}</div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
