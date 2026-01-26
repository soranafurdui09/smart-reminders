"use client";

import { type ReactNode, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';
import MobileFab from '@/components/mobile/MobileFab';

export default function MobileShell({
  header,
  children,
  labels
}: {
  header: ReactNode;
  children: ReactNode;
  labels: {
    today: string;
    inbox: string;
    calendar: string;
    you: string;
  };
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const showMobile = isMobile || isNativeAndroid;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('has-bottom-nav', showMobile);
    if (showMobile) {
      document.documentElement.style.setProperty('--bottom-nav-h', '68px');
      document.documentElement.style.setProperty('--fab-clearance', '80px');
    } else {
      document.documentElement.style.removeProperty('--bottom-nav-h');
      document.documentElement.style.removeProperty('--fab-clearance');
    }
  }, [showMobile]);

  return (
    <div className="relative min-h-dvh">
      <div className="sticky top-0 z-40">{header}</div>
      <main className="page-wrap app-content relative z-0">{children}</main>
      {showMobile ? <MobileBottomNav labels={labels} /> : null}
      {showMobile ? <MobileFab /> : null}
    </div>
  );
}
