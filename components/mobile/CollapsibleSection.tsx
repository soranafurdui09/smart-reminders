"use client";

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  accentClassName,
  viewAllHref,
  children
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  accentClassName?: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <section className="premium-card p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${accentClassName ?? 'bg-cyan-400'}`} />
          <div className="text-sm font-semibold text-primary">
            {title} <span className="text-xs text-tertiary">({count})</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-secondary transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? <div className="mt-3 space-y-2">{children}</div> : null}
      {viewAllHref ? (
        <div className="mt-2 text-right">
          <Link href={viewAllHref} className="text-xs font-semibold text-[color:var(--accent)]">
            Vezi toate
          </Link>
        </div>
      ) : null}
    </section>
  );
}
