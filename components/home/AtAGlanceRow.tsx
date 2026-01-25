"use client";

type Metric = {
  id: string;
  label: string;
  count: number;
  accentClass?: string;
};

type Props = {
  metrics: Metric[];
  onSelect?: (id: string) => void;
};

export default function AtAGlanceRow({ metrics, onSelect }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
      <div className="grid grid-cols-4 divide-x divide-slate-200">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className="flex flex-col items-center justify-center gap-1 px-2 py-3 text-center"
            onClick={() => onSelect?.(metric.id)}
          >
            <div className={`text-lg font-semibold text-slate-900 ${metric.accentClass ?? ''}`}>{metric.count}</div>
            <div className="text-[11px] font-semibold uppercase text-slate-500">{metric.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
