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
    <div className="home-glass-panel rounded-2xl px-[var(--space-2)] py-[var(--space-2)]">
      <div className="grid grid-cols-2 gap-[var(--space-2)] md:grid-cols-4">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className={`stat-tile home-tile ${isSecondary ? 'stat-tile-secondary' : ''} ${
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
              {metric.icon ? <metric.icon className="h-4 w-4 text-[rgba(255,255,255,0.72)]" /> : null}
            </div>
            <div
              className={`mt-2 ${isSecondary ? 'text-[24px]' : 'text-[26px]'} font-semibold ${
                metric.accentClass ?? 'text-text'
              }`}
            >
              {metric.count}
            </div>
            <div className={`mt-1 ${isSecondary ? 'text-[11px]' : 'text-[12px]'} font-semibold text-[rgba(255,255,255,0.72)]`}>
              {metric.label}
            </div>
            {metric.subLabel ? (
              <div className="mt-1 text-[11px] text-[rgba(255,255,255,0.56)]">{metric.subLabel}</div>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
