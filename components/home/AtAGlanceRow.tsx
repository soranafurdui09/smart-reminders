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
    <div className="card-soft">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map((metric) => (
          // Accent dot color uses the same base as the count color.
          <button
            key={metric.id}
            type="button"
            className="relative flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-center transition hover:bg-white/5"
            onClick={() => onSelect?.(metric.id)}
          >
            <span
              className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
                metric.accentClass ? metric.accentClass.replace('text-', 'bg-') : 'bg-slate-400'
              }`}
              aria-hidden="true"
            />
            <div className={`text-xl font-semibold ${metric.accentClass ?? 'text-text'}`}>{metric.count}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted2">{metric.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
