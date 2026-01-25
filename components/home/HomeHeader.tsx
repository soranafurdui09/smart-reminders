"use client";

import { Search } from 'lucide-react';

type Props = {
  title: string;
  subtitle?: string;
  onSearchClick?: () => void;
};

export default function HomeHeader({ title, subtitle, onSearchClick }: Props) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-base font-semibold text-textInv">{title}</div>
        {subtitle ? <div className="text-[11px] text-textInv/70">{subtitle}</div> : null}
      </div>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-sm transition hover:bg-surfaceMuted"
        aria-label="Căutare"
        onClick={onSearchClick}
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
}
