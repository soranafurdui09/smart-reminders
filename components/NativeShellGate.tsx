"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

const logNativeScrollState = () => {
  if (process.env.NODE_ENV === 'production') return;
  const html = document.documentElement;
  const body = document.body;
  const scrollContainer = document.querySelector<HTMLElement>('.app-content');
  console.debug('[native-shell] scroll state', {
    bodyOverflow: body.style.overflow || 'unset',
    htmlOverflow: html.style.overflow || 'unset',
    appContentClientHeight: scrollContainer?.clientHeight ?? 0,
    appContentScrollHeight: scrollContainer?.scrollHeight ?? 0
  });
};

export default function NativeShellGate() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return;
    const html = document.documentElement;
    html.classList.add('native-shell');

    return () => {
      html.classList.remove('native-shell');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();
    if (!isNative) return;
    const html = document.documentElement;
    const body = document.body;
    body.style.overflow = '';
    html.style.overflow = '';
    body.classList.remove('overflow-hidden');
    html.classList.remove('overflow-hidden');
    logNativeScrollState();
  }, [pathname]);

  return null;
}
