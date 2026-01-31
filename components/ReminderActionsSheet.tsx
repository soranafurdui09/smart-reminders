"use client";

import { type ReactNode, useEffect, useId } from 'react';
import type { CSSProperties } from 'react';
import { X } from 'lucide-react';

const updateOverlayCount = (delta: number) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  const current = Number(root.dataset.overlayCount ?? '0');
  const next = Math.max(0, current + delta);
  if (next > 0) {
    if (!body.dataset.overlayOverflow) {
      body.dataset.overlayOverflow = body.style.overflow || '';
    }
    body.style.overflow = 'hidden';
    root.dataset.overlayCount = String(next);
    root.classList.add('sheet-open');
  } else {
    const previousOverflow = body.dataset.overlayOverflow ?? '';
    body.style.overflow = previousOverflow;
    delete body.dataset.overlayOverflow;
    delete root.dataset.overlayCount;
    root.classList.remove('sheet-open');
  }
  window.dispatchEvent(new CustomEvent('overlay:change', { detail: { open: next > 0, count: next } }));
};

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
    updateOverlayCount(1);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      updateOverlayCount(-1);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  const badgeStyle = categoryStyle ?? undefined;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#02040a]/70 px-4 pb-[calc(env(safe-area-inset-bottom)_+_16px)]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet w-full max-w-lg p-4 shadow-[0_18px_40px_rgba(6,12,24,0.45)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div id={titleId} className="text-sm font-semibold text-text line-clamp-2">
              {title}
            </div>
            {categoryLabel ? (
              <span
                className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${categoryClassName ?? 'badge badge-blue'}`}
                style={badgeStyle}
              >
                {categoryLabel}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="icon-btn inline-flex h-9 w-9 items-center justify-center"
            onClick={onClose}
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1 text-text">
          {children}
        </div>
      </div>
    </div>
  );
}
