"use client";

type Tab = { id: string; label: string; count?: number };

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
};

export default function SegmentedTabs({ tabs, value, onChange }: Props) {
  return (
    <div className="inline-flex w-full rounded-full border border-border bg-surface px-1 py-1 shadow-sm">
      {tabs.map((tab) => {
        const active = tab.id === value;
        const activeClass = tab.id === 'overdue'
          ? 'bg-red-500/25 text-red-100'
          : tab.id === 'soon'
            ? 'bg-emerald-500/20 text-emerald-100'
            : 'bg-blue-500/20 text-blue-100';
        return (
          <button
            key={tab.id}
            type="button"
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
              active
                ? activeClass
                : 'text-muted hover:bg-white/5'
            }`}
            onClick={() => onChange(tab.id)}
          >
            <span className="inline-flex items-center justify-center gap-1">
              {tab.label}
              {typeof tab.count === 'number' ? (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-text">
                  {tab.count}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
