"use client";

import { getCategoryChipStyle } from '@/lib/categories';

type Props = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  color?: string;
  className?: string;
};

export default function FilterChip({ label, selected, onToggle, color, className }: Props) {
  const baseClasses =
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400';
  const style = color ? getCategoryChipStyle(color, selected) : undefined;
  const fallbackClasses = selected
    ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft-bg)] text-ink shadow-sm'
    : 'border-white/10 bg-surfaceMuted text-secondary hover:bg-surface';

  return (
    <button
      type="button"
      className={`${baseClasses} ${color ? (selected ? 'shadow-sm' : 'border-white/10 bg-surfaceMuted text-secondary hover:bg-surface') : fallbackClasses} ${className ?? ''}`}
      style={style}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {selected ? (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
          <path
            d="M5 10l3 3 7-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
      <span>{label}</span>
    </button>
  );
}
