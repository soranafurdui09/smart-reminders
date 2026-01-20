"use client";

import { type ReactNode, useEffect, useId } from 'react';
import type { CSSProperties } from 'react';
import { X } from 'lucide-react';

export default function ReminderActionsSheet({
  open,
  onClose,
  title,
  categoryLabel,
  categoryClassName,
  categoryStyle,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  categoryLabel?: string;
  categoryClassName?: string;
  categoryStyle?: CSSProperties;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/40 px-4 pb-[calc(env(safe-area-inset-bottom)_+_16px)]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-float"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id={titleId} className="text-sm font-semibold text-slate-900 line-clamp-2">
              {title}
            </div>
            {categoryLabel ? (
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${categoryClassName ?? 'bg-slate-100 text-slate-700'}`}
                style={categoryStyle}
              >
                {categoryLabel}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500"
            onClick={onClose}
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
