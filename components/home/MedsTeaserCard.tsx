"use client";

type Props = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function MedsTeaserCard({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className="home-glass-panel rounded-[var(--radius-lg)] p-[var(--space-3)] text-sm text-[color:var(--text-1)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-2)]">{title}</div>
      <div className="mt-[var(--space-1)] text-sm font-semibold text-[color:var(--text-0)]">{subtitle}</div>
      {actionLabel ? (
        <button
          type="button"
          className="mt-[var(--space-2)] inline-flex items-center justify-center rounded-full border border-[color:var(--stroke-soft)] bg-[color:var(--glass)] px-3 py-1 text-xs font-semibold text-[color:var(--text-1)]"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
