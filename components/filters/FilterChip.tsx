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
    'inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400';
  const style = color ? getCategoryChipStyle(color, selected) : undefined;
  const fallbackClasses = selected ? 'chip-selected' : 'chip';

  return (
    <button
      type="button"
      className={`${baseClasses} ${color ? (selected ? 'chip-selected shadow-sm' : 'chip') : fallbackClasses} ${className ?? ''}`}
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
