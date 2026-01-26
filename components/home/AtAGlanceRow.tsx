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
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            type="button"
            className="flex flex-col items-center justify-center gap-1 px-2 py-3 text-center"
            onClick={() => onSelect?.(metric.id)}
          >
            <div className={`text-xl font-semibold text-text ${metric.accentClass ?? ''}`}>{metric.count}</div>
            <div className="text-[11px] font-semibold uppercase text-muted2">{metric.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
