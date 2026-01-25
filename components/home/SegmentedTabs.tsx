"use client";

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
};

export default function SegmentedTabs({ tabs, value, onChange }: Props) {
  return (
    <div className="inline-flex w-full rounded-full border border-border bg-surface p-1 shadow-sm">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
              active
                ? 'bg-[color:rgba(245,158,11,0.18)] text-ink'
                : 'text-muted hover:bg-surfaceMuted'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
