"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, UserRound } from 'lucide-react';

export default function TopBar({
  labels
}: {
  labels: { today: string; inbox: string; calendar: string; you: string };
}) {
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get('tab');
  const title = pathname === '/app'
    ? tab === 'inbox'
      ? labels.inbox
      : labels.today
    : pathname?.startsWith('/app/calendar')
      ? labels.calendar
      : pathname?.startsWith('/app/you')
        ? labels.you
        : labels.today;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSubtitle = (event: Event) => {
      const detail = (event as CustomEvent<{ subtitle?: string }>).detail;
      setSubtitle(detail?.subtitle ?? null);
    };
    const handleClear = () => setSubtitle(null);
    window.addEventListener('topbar:subtitle', handleSubtitle as EventListener);
    window.addEventListener('topbar:clear', handleClear as EventListener);
    return () => {
      window.removeEventListener('topbar:subtitle', handleSubtitle as EventListener);
      window.removeEventListener('topbar:clear', handleClear as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setCompact(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="safe-top sticky top-0 z-40 border-b border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(6,12,18,0.76))] backdrop-blur-xl">
      <div className={`mx-auto flex min-h-[56px] w-full max-w-none md:max-w-6xl items-center justify-between gap-3 px-4 ${compact ? 'py-1.5' : 'py-2'}`}>
        <div className="min-w-0">
          <div className="text-base font-semibold text-text">{title}</div>
          {subtitle ? <div className="text-[11px] text-muted">{subtitle}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app?tab=inbox" className="icon-btn h-9 w-9" aria-label="Căutare">
            <Search className="h-4 w-4" />
          </Link>
          <Link href="/app/settings" className="icon-btn h-9 w-9" aria-label="Setări">
            <UserRound className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
