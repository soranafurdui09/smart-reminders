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
      <div className="flex gap-2 overflow-x-auto px-1 pb-2">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className="relative min-h-[68px] min-w-[120px] flex-1 rounded-2xl px-3 py-2 text-left transition hover:bg-white/5"
            onClick={() => onSelect?.(metric.id)}
          >
            <span
              className={`absolute right-2 top-2 h-2 w-2 rounded-full ${
                metric.accentClass ? metric.accentClass.replace('text-', 'bg-') : 'bg-slate-400'
              }`}
              aria-hidden="true"
            />
            <div className={`text-lg font-semibold ${metric.accentClass ?? 'text-text'}`}>{metric.count}</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted2">{metric.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
