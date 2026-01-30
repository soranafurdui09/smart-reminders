"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import BottomNav from '@/components/shell/BottomNav';
import Fab from '@/components/shell/Fab';
import TopBar from '@/components/shell/TopBar';
import NativeShellGate from '@/components/NativeShellGate';

export default function MobileShell({
  children,
  labels
}: {
  children: ReactNode;
  labels: { today: string; inbox: string; calendar: string; you: string };
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const showMobile = isMobile || isNativeAndroid;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('has-bottom-nav', showMobile);
    if (showMobile) {
      document.documentElement.style.setProperty('--bottom-nav-h', '64px');
      document.documentElement.style.setProperty('--fab-clearance', '72px');
    } else {
      document.documentElement.style.removeProperty('--bottom-nav-h');
      document.documentElement.style.removeProperty('--fab-clearance');
    }
  }, [showMobile]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      {isNativeAndroid ? <NativeShellGate /> : null}
      {showMobile ? <TopBar labels={labels} /> : null}
      <main className="page-wrap app-content relative z-0 flex-1 overflow-y-auto">{children}</main>
      {showMobile ? <BottomNav labels={labels} /> : null}
      {showMobile ? <Fab /> : null}
      {isNativeAndroid ? (
        <div className="pointer-events-none fixed bottom-[calc(var(--bottom-nav-h)_+_env(safe-area-inset-bottom)_+_8px)] right-3 z-[55] rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/80">
          NATIVE SHELL
        </div>
      ) : null}
    </div>
  );
}
