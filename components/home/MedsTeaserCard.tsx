"use client";

type Props = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function MedsTeaserCard({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className="card p-4 text-sm text-muted">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">{title}</div>
      <div className="mt-1 text-sm font-semibold text-text">{subtitle}</div>
      {actionLabel ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/12 px-3 py-1 text-xs font-semibold text-emerald-100"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
