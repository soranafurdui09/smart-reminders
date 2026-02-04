"use client";

import { useEffect, useState } from 'react';

type Mode = 'family' | 'focus';

const MODE_KEY = 'sr_mode';

export function useModePreference(defaultMode: Mode = 'family') {
  const [mode, setMode] = useState<Mode>(defaultMode);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedMode = window.localStorage.getItem(MODE_KEY);
    if (storedMode === 'family' || storedMode === 'focus') {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  return {
    mode,
    setMode
  };
}
