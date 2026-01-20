"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNativeAndroid(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsCollapsed(false);
      return;
    }
    const handleScroll = () => {
      setIsCollapsed(window.scrollY > 16);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

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

  const showBottomNav = isNativeAndroid || isMobile;
  const showTopNav = !showBottomNav;
  const headerClass = showBottomNav
    ? 'bg-white/95 shadow-sm'
    : 'bg-surface/80 shadow-sm backdrop-blur';
  const headerPadding = isCollapsed ? 'py-2' : 'py-3';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('has-bottom-nav', showBottomNav);
    if (showBottomNav) {
      document.documentElement.style.setProperty('--bottom-nav-h', '72px');
    } else {
      document.documentElement.style.removeProperty('--bottom-nav-h');
    }
  }, [showBottomNav]);

  return (
    <>
      <header className={`sticky top-0 z-30 border-b border-border/70 ${headerClass} safe-top`}>
        <div className={`page-wrap flex flex-wrap items-center justify-between gap-4 ${headerPadding}`}>
          <Link href="/app" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink">
            <span className={`flex ${isCollapsed ? 'h-9 w-9' : 'h-10 w-10'} items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-sm font-bold text-white shadow-md shadow-sky-500/30`}>
              RI
            </span>
            <span className={isCollapsed ? 'text-base' : ''}>{appName}</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-3 md:justify-between">
            {showTopNav ? (
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
            ) : null}
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
        </div>
      </header>
      {showBottomNav ? (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 border-t border-borderSubtle bg-surface/95 safe-bottom pointer-events-auto ${isNativeAndroid ? '' : 'md:hidden'}`}>
          <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 pb-2 pt-2">
            <div className="flex flex-1 items-center justify-between">
              {bottomTabs.slice(0, 2).map((tab) => {
                const active = isActive(tab.href);
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-1 text-[11px] font-semibold transition ${
                      active ? 'text-sky-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => router.push(tab.href)}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-sky-100 text-sky-600' : 'bg-surfaceMuted text-slate-500'}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap">{navLabelByHref.get(tab.href) ?? tab.key}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="absolute left-1/2 -translate-x-1/2 -translate-y-5 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-float shadow-sky-500/30 transition active:scale-95 pointer-events-auto"
              aria-label={navLabelByHref.get('/app/reminders/new') ?? 'Add'}
              onClick={(event) => {
                event.preventDefault();
                if (process.env.NODE_ENV !== 'production') {
                  console.log('FAB clicked');
                }
                setFabOpen(true);
              }}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex flex-1 items-center justify-between">
              {bottomTabs.slice(2).map((tab) => {
                const active = isActive(tab.href);
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-1 text-[11px] font-semibold transition ${
                      active ? 'text-sky-600' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => router.push(tab.href)}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-sky-100 text-sky-600' : 'bg-surfaceMuted text-slate-500'}`}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap">{navLabelByHref.get(tab.href) ?? tab.key}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      ) : null}
      {fabOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 px-4 pb-6 md:hidden"
          onClick={() => setFabOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-float"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label="Adaugă reminder"
          >
            <div className="text-sm font-semibold text-slate-900">Adaugă reminder</div>
            <p className="mt-1 text-xs text-slate-500">Alege cum vrei să creezi.</p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                className="btn btn-primary h-11 justify-center"
                onClick={() => {
                  setFabOpen(false);
                  router.push('/app/reminders/new?voice=1');
                }}
              >
                Creează cu voce
              </button>
              <button
                type="button"
                className="btn btn-secondary h-11 justify-center"
                onClick={() => {
                  setFabOpen(false);
                  router.push('/app/reminders/new');
                }}
              >
                Scrie simplu (AI recomandat)
              </button>
              <button
                type="button"
                className="btn btn-secondary h-11 justify-center"
                onClick={() => {
                  setFabOpen(false);
                  router.push('/app/reminders/new?mode=manual');
                }}
              >
                Completare manuală
              </button>
            </div>
            <button
              type="button"
              className="mt-3 w-full text-xs font-semibold text-slate-500"
              onClick={() => setFabOpen(false)}
            >
              Închide
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
