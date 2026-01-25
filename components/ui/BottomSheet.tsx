"use client";

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/35 px-4 pb-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`premium-sheet w-full max-w-lg max-h-[85vh] overflow-y-auto overscroll-contain p-4 ${className}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[color:rgba(0,0,0,0.12)]" />
        {children}
      </div>
    </div>,
    document.body
  );
}
