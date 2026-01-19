"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Calendar, History, Home, Plus, Settings } from 'lucide-react';
import VoiceNavButton from '@/components/VoiceNavButton';

type NavLink = {
  href: string;
  label: string;
};

type Props = {
  navLinks: NavLink[];
  activePath?: string;
  appName: string;
  userInitial: string;
  userEmail?: string;
  voiceLabel: string;
  profileLabel: string;
  logoutLabel: string;
  comingSoonLabel: string;
};

const bottomTabs = [
  { href: '/app', icon: Home, key: 'home' },
  { href: '/app/calendar', icon: Calendar, key: 'calendar' },
  { href: '/app/reminders/new', icon: Plus, key: 'add' },
  { href: '/app/history', icon: History, key: 'history' },
  { href: '/app/settings', icon: Settings, key: 'settings' }
] as const;

export default function AppNavigation({
  navLinks,
  activePath,
  appName,
  userInitial,
  userEmail,
  voiceLabel,
  profileLabel,
  logoutLabel,
  comingSoonLabel
}: Props) {
  const pathname = usePathname();
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNativeAndroid(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
  }, []);

  const currentPath = activePath || pathname || '';
  const isActive = useMemo(() => {
    return (href: string) => {
      if (!currentPath) return false;
      if (href === '/app') return currentPath === '/app';
      return currentPath.startsWith(href);
    };
  }, [currentPath]);
  const navLabelByHref = useMemo(() => {
    return new Map(navLinks.map((link) => [link.href, link.label]));
  }, [navLinks]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 shadow-sm backdrop-blur safe-top">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/app" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-sm font-bold text-white shadow-md shadow-sky-500/30">
              RI
            </span>
            <span>{appName}</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-3 md:justify-between">
            {!isNativeAndroid ? (
              <nav className="hidden flex-wrap items-center gap-1 rounded-full border border-borderSubtle bg-surfaceMuted/80 p-1 text-sm md:flex">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  if (link.href === '/app/reminders/new') {
                    return (
                      <div key={link.href} className="flex items-center gap-1">
                        <Link
                          href={link.href}
                          className={`rounded-full px-4 py-2 transition-all ${
                            active
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          {link.label}
                        </Link>
                        <VoiceNavButton
                          href="/app/reminders/new?voice=1"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:border-primary/30 hover:bg-white"
                          label={voiceLabel}
                          title={voiceLabel}
                        >
                          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <path
                              stroke="currentColor"
                              strokeWidth="1.5"
                              d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm0 14a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v4"
                            />
                          </svg>
                        </VoiceNavButton>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`rounded-full px-4 py-2 transition-all ${
                        active
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <div className="hidden md:flex" />
            )}
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink shadow-sm transition hover:bg-surface">
                {userInitial}
              </summary>
              <div className="absolute left-0 z-20 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft sm:left-auto sm:right-0">
                <div className="px-3 py-2 text-xs text-muted">{userEmail || profileLabel}</div>
                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surfaceMuted"
                  type="button"
                  disabled
                  title={comingSoonLabel}
                >
                  {profileLabel}
                </button>
                <form action="/logout" method="post" className="mt-1">
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surfaceMuted"
                    type="submit"
                    data-action-close="true"
                  >
                    {logoutLabel}
                  </button>
                </form>
              </div>
            </details>
          </div>
          {!isNativeAndroid ? (
            <nav className="flex w-full flex-wrap items-center gap-2 md:hidden">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                if (link.href === '/app/reminders/new') {
                  return (
                    <div key={link.href} className="flex items-center gap-2">
                      <Link
                        href={link.href}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          active
                            ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {link.label}
                      </Link>
                      <VoiceNavButton
                        href="/app/reminders/new?voice=1"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:border-primary/30 hover:bg-white"
                        label={voiceLabel}
                        title={voiceLabel}
                      >
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                          <path
                            stroke="currentColor"
                            strokeWidth="1.5"
                            d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm0 14a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v4"
                          />
                        </svg>
                      </VoiceNavButton>
                    </div>
                  );
                }
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      active
                        ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </header>
      {isNativeAndroid ? (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-borderSubtle bg-surface/95 backdrop-blur safe-bottom">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-around px-4 pb-2 pt-2">
            {bottomTabs.map((tab) => {
              const active = isActive(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'text-sky-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                      tab.key === 'add'
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                        : active
                        ? 'bg-sky-100 text-sky-600'
                        : 'bg-surfaceMuted text-slate-500'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    {navLabelByHref.get(tab.href) ?? tab.key}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}
