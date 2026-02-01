"use client";

import { useEffect, useState } from 'react';

const getKeyboardInset = () => {
  if (typeof window === 'undefined') return 0;
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const inset = window.innerHeight - viewport.height - viewport.offsetTop;
  return inset > 0 ? inset : 0;
};

export default function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateInset = () => setInset(getKeyboardInset());
    updateInset();

    viewport.addEventListener('resize', updateInset);
    viewport.addEventListener('scroll', updateInset);
    window.addEventListener('orientationchange', updateInset);
    window.addEventListener('resize', updateInset);

    return () => {
      viewport.removeEventListener('resize', updateInset);
      viewport.removeEventListener('scroll', updateInset);
      window.removeEventListener('orientationchange', updateInset);
      window.removeEventListener('resize', updateInset);
    };
  }, []);

  return inset;
}
