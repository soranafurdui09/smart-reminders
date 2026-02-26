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
  const isDashboard = pathname === '/app';

  const tabs = [
    { key: 'today', href: '/app?tab=today', icon: Home, label: labels.today, active: pathname === '/app' && currentTab === 'today' },
    { key: 'inbox', href: '/app?tab=inbox', icon: Inbox, label: labels.inbox, active: pathname === '/app' && currentTab === 'inbox' },
    { key: 'calendar', href: '/app/calendar', icon: Calendar, label: labels.calendar, active: pathname?.startsWith('/app/calendar') ?? false },
    { key: 'you', href: '/app/you', icon: User, label: labels.you, active: pathname?.startsWith('/app/you') ?? false }
  ];

  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2);

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 navbar safe-bottom">
      <div className={`relative mx-auto flex w-full max-w-none items-center justify-between px-3 md:max-w-6xl ${
        isDashboard
          ? 'pb-[calc(env(safe-area-inset-bottom)_+_10px)] pt-1.5'
          : 'pb-[calc(env(safe-area-inset-bottom)_+_12px)] pt-2'
      }`}>
        {leftTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              className={`flex flex-1 items-center justify-center rounded-2xl px-2 transition ${
                isDashboard ? 'min-h-[48px] py-0.5' : 'min-h-[44px] py-1'
              } ${
                tab.active ? 'text-text' : 'text-muted2'
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
              <span className={`flex ${isDashboard ? 'flex-col items-center' : ''}`}>
                <span className={`relative flex items-center justify-center ${
                  isDashboard ? 'h-8 w-8 rounded-[12px]' : 'h-11 w-11 rounded-2xl'
                } ${tab.active ? 'bg-accent/20 text-text' : 'bg-surface3 text-muted'}`}>
                  <Icon className={isDashboard ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
                  {tab.active ? (
                    <span className={`absolute h-1 rounded-full bg-accent ${isDashboard ? '-bottom-[3px] w-5' : '-bottom-1 w-6'}`} />
                  ) : null}
                </span>
                {isDashboard ? (
                  <span className={`mt-1 text-[0.52rem] font-semibold uppercase leading-none tracking-[0.07em] ${
                    tab.active ? 'text-text' : 'text-muted2'
                  }`}>
                    {tab.label}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
        <span className={`pointer-events-none flex items-center justify-center ${isDashboard ? 'h-[48px] w-9' : 'h-11 w-11'}`} aria-hidden="true" />
        {rightTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              aria-label={tab.label}
              className={`flex flex-1 items-center justify-center rounded-2xl px-2 transition ${
                isDashboard ? 'min-h-[48px] py-0.5' : 'min-h-[44px] py-1'
              } ${
                tab.active ? 'text-text' : 'text-muted2'
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
              <span className={`flex ${isDashboard ? 'flex-col items-center' : ''}`}>
                <span className={`relative flex items-center justify-center ${
                  isDashboard ? 'h-8 w-8 rounded-[12px]' : 'h-11 w-11 rounded-2xl'
                } ${tab.active ? 'bg-accent/20 text-text' : 'bg-surface3 text-muted'}`}>
                  <Icon className={isDashboard ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
                  {tab.active ? (
                    <span className={`absolute h-1 rounded-full bg-accent ${isDashboard ? '-bottom-[3px] w-5' : '-bottom-1 w-6'}`} />
                  ) : null}
                </span>
                {isDashboard ? (
                  <span className={`mt-1 text-[0.52rem] font-semibold uppercase leading-none tracking-[0.07em] ${
                    tab.active ? 'text-text' : 'text-muted2'
                  }`}>
                    {tab.label}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
