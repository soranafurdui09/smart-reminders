"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
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
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const profileMenuRef = useRef<HTMLDetailsElement | null>(null);

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

  useEffect(() => {
    const details = profileMenuRef.current;
    if (!details) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!details.open) return;
      const target = event.target as Node | null;
      if (target && details.contains(target)) return;
      details.open = false;
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && details.open) {
        details.open = false;
      }
    };
    document.addEventListener('mousedown', handlePointer, true);
    document.addEventListener('touchstart', handlePointer, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('mousedown', handlePointer, true);
      document.removeEventListener('touchstart', handlePointer, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, []);

  const currentPath = activePath || pathname || '';
  const isActive = useMemo(() => {
    return (href: string) => {
      if (!currentPath) return false;
      if (href === '/app') return currentPath === '/app';
      return currentPath.startsWith(href);
    };
  }, [currentPath]);
  const navLabelByHref = useMemo(() => new Map(navLinks.map((link) => [link.href, link.label])), [navLinks]);
  const showBottomNav = isNativeAndroid || isMobile;
  const showTopNav = !showBottomNav;
  const headerClass = 'bg-surface2 shadow-sm backdrop-blur';
  const headerPadding = isCollapsed ? 'py-2' : 'py-3';
  return (
    <>
      <header className={`sticky top-0 z-30 border-b border-border ${headerClass} safe-top`}>
        <div className={`page-wrap flex flex-wrap items-center justify-between gap-4 ${headerPadding}`}>
          <Link href="/app" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink">
            <span className={`flex ${isCollapsed ? 'h-9 w-9' : 'h-10 w-10'} items-center justify-center rounded-full bg-surfaceMuted shadow-md`}>
              <img src="/brand-icon.svg" alt="" className="h-8 w-8" aria-hidden="true" />
            </span>
            <span className={isCollapsed ? 'text-base' : ''}>{appName}</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-3 md:justify-between">
            {showTopNav ? (
              <nav className="hidden flex-wrap items-center gap-1 rounded-full border border-borderSubtle bg-surfaceMuted p-1 text-sm md:flex">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  if (link.href === '/app/reminders/new') {
                    return (
                      <div key={link.href} className="flex items-center gap-1">
                        <Link
                          href={link.href}
                          className={`rounded-full px-4 py-2 transition-all ${active
                              ? 'bg-[color:var(--accent-soft-bg)] text-ink shadow-sm'
                              : 'text-muted hover:bg-surface hover:text-ink'
                            }`}
                        >
                          {link.label}
                        </Link>
                        <VoiceNavButton
                          href="/app/reminders/new?voice=1"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition hover:border-primary/30 hover:bg-surfaceMuted"
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
                      className={`rounded-full px-4 py-2 transition-all ${active
                          ? 'bg-[color:var(--accent-soft-bg)] text-ink shadow-sm'
                          : 'text-muted hover:bg-surface hover:text-ink'
                        }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <details ref={profileMenuRef} className="relative">
              <summary className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-primary/30 bg-gradient-to-br from-primaryStrong via-primary to-accent text-sm font-semibold text-white shadow-md shadow-sky-500/30 transition hover:brightness-110">
                {userInitial}
              </summary>
              <div className="absolute left-0 z-20 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-borderSubtle bg-[rgb(19_30_52)] p-2 shadow-soft sm:left-auto sm:right-0">
                <div className="px-3 py-2 text-xs text-muted">{userEmail || profileLabel}</div>
                <Link
                  href="/app/settings"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-surfaceMuted hover:translate-x-0.5"
                >
                  {navLabelByHref.get('/app/settings') ?? 'Settings'}
                </Link>
                <Link
                  href="/app/you"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-surfaceMuted hover:translate-x-0.5"
                >
                  {profileLabel}
                </Link>
                <form action="/logout" method="post" className="mt-1">
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-surfaceMuted hover:translate-x-0.5"
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
    </>
  );
}
