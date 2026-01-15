"use client";

type Option = {
  value: string;
  label: string;
};

type Props = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function SegmentedControl({ options, value, onChange, className }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${
              selected
                ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
