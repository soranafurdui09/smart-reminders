"use client";

import { useState } from 'react';
import { Plus } from 'lucide-react';
import QuickAddSheet from '@/components/mobile/QuickAddSheet';

export default function MobileFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed bottom-[calc(var(--bottom-nav-h,72px)_-_24px)] left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-cyan-300 text-slate-950 shadow-[0_16px_40px_rgba(34,211,238,0.45)] transition active:scale-95"
        aria-label="Adaugă reminder"
        onClick={(event) => {
          event.preventDefault();
          if (process.env.NODE_ENV !== 'production') {
            console.log('FAB clicked');
          }
          setOpen(true);
        }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
      <QuickAddSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
