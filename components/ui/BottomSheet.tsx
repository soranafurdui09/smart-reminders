"use client";

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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

export default function BottomSheet({
  open,
  onClose,
  children,
  className = '',
  ariaLabel
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    updateOverlayCount(1);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      updateOverlayCount(-1);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`sheet w-full max-w-none max-h-[75vh] overflow-y-auto overscroll-contain px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)_+_16px)] ${className}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/40" />
        {children}
      </div>
    </div>,
    document.body
  );
}
