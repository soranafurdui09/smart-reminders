import Link from 'next/link';
import { ReactNode } from 'react';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';

export default function AppShell({
  children,
  locale = defaultLocale,
  activePath,
  userEmail
}: {
  children: ReactNode;
  locale?: Locale;
  activePath?: string;
  userEmail?: string | null;
}) {
  const copy = messages[locale];
  const navLinks = [
    { href: '/app', label: copy.nav.dashboard },
    { href: '/app/reminders/new', label: copy.nav.newReminder },
    { href: '/app/calendar', label: copy.nav.calendar },
    { href: '/app/history', label: copy.nav.history },
    { href: '/app/household', label: copy.nav.household },
    { href: '/app/settings', label: copy.nav.settings }
  ];
  const safeEmail = userEmail || '';
  const userInitial = safeEmail.trim().charAt(0).toUpperCase() || 'U';
  const isActive = (href: string) => {
    if (!activePath) return false;
    if (href === '/app') return activePath === '/app';
    return activePath.startsWith(href);
  };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 shadow-sm backdrop-blur">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/app" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-sm font-bold text-white shadow-md shadow-sky-500/30">
              RI
            </span>
            <span>{copy.appName}</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-3 md:justify-between">
            <nav className="hidden flex-wrap items-center gap-1 rounded-full border border-border-subtle bg-surfaceMuted/80 p-1 text-sm md:flex">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-4 py-2 transition-all ${
                      active
                        ? 'bg-surface text-ink shadow-sm'
                        : 'text-muted hover:bg-surface hover:text-ink'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink shadow-sm transition hover:bg-surface">
                {userInitial}
              </summary>
              <div className="absolute right-0 z-20 mt-3 w-56 rounded-2xl border border-border-subtle bg-surface p-2 shadow-soft">
                <div className="px-3 py-2 text-xs text-muted">
                  {safeEmail || copy.common.profile}
                </div>
                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surfaceMuted"
                  type="button"
                  disabled
                  title={copy.common.comingSoon}
                >
                  {copy.common.profile}
                </button>
                <form action="/logout" method="post" className="mt-1">
                  <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surfaceMuted" type="submit">
                    {copy.nav.logout}
                  </button>
                </form>
              </div>
            </details>
          </div>
          <nav className="flex w-full flex-wrap items-center gap-2 md:hidden">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? 'border-primary/40 bg-primarySoft text-primaryStrong'
                      : 'border-border-subtle text-muted hover:border-primary/30 hover:bg-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="page-wrap">{children}</main>
    </div>
  );
}
