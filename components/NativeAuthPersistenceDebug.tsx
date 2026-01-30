"use client";

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const DEV = process.env.NODE_ENV !== 'production';

const collectCookieNames = () => {
  if (typeof document === 'undefined') return [];
  return document.cookie
    .split(';')
    .map((pair) => pair.trim().split('=')[0])
    .filter((name) => /sb-.*auth-token/i.test(name));
};

const collectLocalStorageKeys = () => {
  if (typeof window === 'undefined') return [];
  try {
    return Object.keys(window.localStorage).filter((key) => /sb-|supabase|pkce/i.test(key));
  } catch {
    return [];
  }
};

const logPersistence = (reason: 'cold-start' | 'resume') => {
  if (!DEV) return;
  const cookieNames = collectCookieNames();
  const localKeys = collectLocalStorageKeys();
  console.log('[native-auth-persist]', JSON.stringify({
    reason,
    cookieNames,
    localStorageKeys: localKeys
  }));
};

export default function NativeAuthPersistenceDebug() {
  useEffect(() => {
    if (!DEV) return;
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return;

    logPersistence('cold-start');
    const handler = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      logPersistence('resume');
    });
    return () => {
      handler.then((sub) => sub.remove());
    };
  }, []);

  return null;
}
