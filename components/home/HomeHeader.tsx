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
        <div className="text-base font-semibold text-text">{title}</div>
        {subtitle ? <div className="text-[11px] text-muted">{subtitle}</div> : null}
      </div>
      <button
        type="button"
        className="icon-btn"
        aria-label="Căutare"
        onClick={onSearchClick}
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
}
