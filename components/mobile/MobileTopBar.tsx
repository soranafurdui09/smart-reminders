"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search, UserRound } from 'lucide-react';

export default function MobileTopBar({
  labels
}: {
  labels: {
    today: string;
    inbox: string;
    calendar: string;
    you: string;
  };
}) {
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

  return (
    <div className="safe-top sticky top-0 z-40 border-b border-border bg-bg backdrop-blur-xl">
      <div className="page-wrap flex items-center justify-between gap-3 py-3">
        <div className="text-base font-semibold text-text">{title}</div>
        <div className="flex items-center gap-2">
          <Link
            href="/app?tab=inbox"
            className="premium-icon-btn h-9 w-9 text-text"
            aria-label="Căutare"
          >
            <Search className="h-4 w-4" />
          </Link>
          <Link
            href="/app/settings"
            className="premium-icon-btn h-9 w-9 text-text"
            aria-label="Setări"
          >
            <UserRound className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
