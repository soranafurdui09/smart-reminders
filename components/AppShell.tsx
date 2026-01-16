import Link from 'next/link';
import { ReactNode } from 'react';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import ActionFeedback from '@/components/ActionFeedback';
import VoiceCreateToast from '@/components/VoiceCreateToast';
import { deleteReminder } from '@/app/app/reminders/[id]/actions';
import VoiceNavButton from '@/components/VoiceNavButton';

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
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top,_#dbeafe_0,_transparent_55%)] dark:bg-[#05060a] dark:bg-[radial-gradient(circle_at_top,_#0b1326_0,_transparent_55%)]">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 shadow-sm backdrop-blur">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/app" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-sm font-bold text-white shadow-md shadow-sky-500/30">
              RI
            </span>
            <span>{copy.appName}</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-3 md:justify-between">
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
                        label={copy.remindersNew.voiceNavLabel}
                        title={copy.remindersNew.voiceNavLabel}
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
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink shadow-sm transition hover:bg-surface">
                {userInitial}
              </summary>
              <div className="absolute left-0 z-20 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft sm:left-auto sm:right-0">
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
                  <button
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surfaceMuted"
                    type="submit"
                    data-action-close="true"
                  >
                    {copy.nav.logout}
                  </button>
                </form>
              </div>
            </details>
          </div>
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
                      label={copy.remindersNew.voiceNavLabel}
                      title={copy.remindersNew.voiceNavLabel}
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
        </div>
      </header>
      <main className="page-wrap">{children}</main>
      <VoiceCreateToast copy={copy} locale={locale} undoAction={deleteReminder} />
      <ActionFeedback />
    </div>
  );
}
