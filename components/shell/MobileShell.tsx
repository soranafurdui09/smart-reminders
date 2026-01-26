"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import BottomNav from '@/components/shell/BottomNav';
import Fab from '@/components/shell/Fab';
import TopBar from '@/components/shell/TopBar';

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
    <div className="relative min-h-dvh">
      {showMobile ? <TopBar labels={labels} /> : null}
      <main className="page-wrap app-content relative z-0">{children}</main>
      {showMobile ? <BottomNav labels={labels} /> : null}
      {showMobile ? <Fab /> : null}
    </div>
  );
}
