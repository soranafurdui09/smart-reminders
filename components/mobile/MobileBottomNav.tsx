"use client";

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Home, Inbox, Users } from 'lucide-react';

export default function MobileBottomNav({
  labels
}: {
  labels: {
    today: string;
    inbox: string;
    calendar: string;
    family: string;
  };
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
    {
      key: 'today',
      href: '/app?tab=today',
      icon: Home,
      label: labels.today,
      active: pathname === '/app' && currentTab === 'today'
    },
    {
      key: 'inbox',
      href: '/app?tab=inbox',
      icon: Inbox,
      label: labels.inbox,
      active: pathname === '/app' && currentTab === 'inbox'
    },
    {
      key: 'calendar',
      href: '/app/calendar',
      icon: Calendar,
      label: labels.calendar,
      active: pathname?.startsWith('/app/calendar') ?? false
    },
    {
      key: 'family',
      href: '/app/household',
      icon: Users,
      label: labels.family,
      active: pathname?.startsWith('/app/household') ?? false
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-borderSubtle bg-surface/95 safe-bottom">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-3 pb-2 pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1 text-[11px] font-semibold transition ${
                tab.active ? 'text-sky-600' : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-current={tab.active ? 'page' : undefined}
              onClick={() => router.push(tab.href)}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${tab.active ? 'bg-sky-100 text-sky-600' : 'bg-surfaceMuted text-slate-500'}`}>
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
