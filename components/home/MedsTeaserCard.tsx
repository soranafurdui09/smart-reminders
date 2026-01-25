"use client";

type Props = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function MedsTeaserCard({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-100/70 bg-white/90 p-4 text-sm text-slate-700 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">{title}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{subtitle}</div>
      {actionLabel ? (
        <button
          type="button"
          className="mt-3 inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
