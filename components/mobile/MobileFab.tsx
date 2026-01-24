"use client";

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import FabMenu from '@/components/navigation/FabMenu';

export default function MobileFab() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOpen = () => {
      setOpen(true);
    };
    window.addEventListener('quickadd:open', handleOpen as EventListener);
    return () => window.removeEventListener('quickadd:open', handleOpen as EventListener);
  }, []);

  return (
    <>
      <button
        type="button"
        className="fixed bottom-[calc(var(--bottom-nav-h,72px)_-_24px)] left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-[color:var(--accent-strong)] text-[#04131b] shadow-[0_16px_40px_rgba(53,182,221,0.35)] transition active:scale-95"
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
      <FabMenu
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
