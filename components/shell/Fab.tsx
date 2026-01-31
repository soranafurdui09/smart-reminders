"use client";

import { useEffect, useState } from 'react';
import MobileFab from '@/components/mobile/MobileFab';

export default function Fab() {
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const readState = () => {
      const count = Number(root.dataset.overlayCount ?? '0');
      setOverlayOpen(count > 0 || root.classList.contains('sheet-open'));
    };
    readState();
    const handleOverlay = () => readState();
    window.addEventListener('overlay:change', handleOverlay as EventListener);
    const observer = new MutationObserver(() => readState());
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-overlay-count'] });
    return () => {
      window.removeEventListener('overlay:change', handleOverlay as EventListener);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`transition-opacity duration-200 ease-out ${overlayOpen ? 'pointer-events-none opacity-0' : ''}`}>
      <MobileFab />
    </div>
  );
}
