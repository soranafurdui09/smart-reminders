"use client";

import { useEffect, useState } from 'react';

type Mode = 'family' | 'focus';

const MODE_KEY = 'sr_mode';
const REMEMBER_KEY = 'ui_mode_remember';

export function useModePreference(defaultMode: Mode = 'family') {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedRemember = window.localStorage.getItem(REMEMBER_KEY);
    if (storedRemember === 'false') {
      setRemember(false);
      return;
    }
    setRemember(true);
    const storedMode = window.localStorage.getItem(MODE_KEY);
    if (storedMode === 'family' || storedMode === 'focus') {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (remember) {
      window.localStorage.setItem(REMEMBER_KEY, 'true');
      window.localStorage.setItem(MODE_KEY, mode);
    } else {
      window.localStorage.setItem(REMEMBER_KEY, 'false');
      window.localStorage.removeItem(MODE_KEY);
    }
  }, [mode, remember]);

  return {
    mode,
    setMode,
    remember,
    setRemember
  };
}
