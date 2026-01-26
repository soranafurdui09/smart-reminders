"use client";

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Home, Inbox, User } from 'lucide-react';

export default function BottomNav({
  labels
}: {
  labels: { today: string; inbox: string; calendar: string; you: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = useMemo(() => {
    if (pathname !== '/app') return null;
    const tab = searchParams?.get('tab');
    return tab === 'inbox' ? 'inbox' : 'today';
  }, [pathname, searchParams]);

  const tabs = [
    { key: 'today', href: '/app?tab=today', icon: Home, label: labels.today, active: pathname === '/app' && currentTab === 'today' },
    { key: 'inbox', href: '/app?tab=inbox', icon: Inbox, label: labels.inbox, active: pathname === '/app' && currentTab === 'inbox' },
    { key: 'calendar', href: '/app/calendar', icon: Calendar, label: labels.calendar, active: pathname?.startsWith('/app/calendar') ?? false },
    { key: 'you', href: '/app/you', icon: User, label: labels.you, active: pathname?.startsWith('/app/you') ?? false }
  ];

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.35)] safe-bottom">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-3 pb-[calc(env(safe-area-inset-bottom)_+_8px)] pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-semibold transition ${
                tab.active ? 'text-text' : 'text-muted'
              }`}
              aria-current={tab.active ? 'page' : undefined}
              onClick={() => {
                if (typeof window !== 'undefined' && pathname === '/app' && (tab.key === 'today' || tab.key === 'inbox')) {
                  window.history.replaceState(null, '', tab.href);
                  window.dispatchEvent(new CustomEvent('dashboard:tab', { detail: { tab: tab.key } }));
                  return;
                }
                router.push(tab.href);
              }}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${tab.active ? 'bg-accent/20 text-text' : 'bg-white/10 text-muted'}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
