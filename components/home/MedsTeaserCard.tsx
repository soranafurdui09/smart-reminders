"use client";

type Props = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function MedsTeaserCard({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className="home-glass-panel rounded-2xl p-[var(--space-3)] text-sm text-[rgba(255,255,255,0.72)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(255,255,255,0.56)]">{title}</div>
      <div className="mt-[var(--space-1)] text-sm font-semibold text-[rgba(255,255,255,0.92)]">{subtitle}</div>
      {actionLabel ? (
        <button
          type="button"
          className="mt-[var(--space-2)] inline-flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-semibold text-[rgba(255,255,255,0.82)]"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
