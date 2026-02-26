"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePathname } from 'next/navigation';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import BottomNav from '@/components/shell/BottomNav';
import Fab from '@/components/shell/Fab';
import TopBar from '@/components/shell/TopBar';
import NativeShellGate from '@/components/NativeShellGate';
import NativeAuthPersistenceDebug from '@/components/NativeAuthPersistenceDebug';

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
  const pathname = usePathname();
  const showTopBar = showMobile && pathname !== '/app';

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
    <div className="native-shell-root relative flex min-h-dvh flex-col">
      {isNativeAndroid ? <NativeShellGate /> : null}
      {isNativeAndroid ? <NativeAuthPersistenceDebug /> : null}
      {showTopBar ? <TopBar labels={labels} /> : null}
      <main className="page-wrap app-content relative z-0 flex-1 overflow-y-auto">{children}</main>
      {showMobile ? <BottomNav labels={labels} /> : null}
      {showMobile ? <Fab /> : null}
    </div>
  );
}
