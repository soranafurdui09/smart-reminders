import Link from 'next/link';
import { ReactNode } from 'react';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';

export default function AppShell({ children, locale = defaultLocale }: { children: ReactNode; locale?: Locale }) {
  const copy = messages[locale];
  const navLinks = [
    { href: '/app', label: copy.nav.dashboard },
    { href: '/app/reminders/new', label: copy.nav.newReminder },
    { href: '/app/history', label: copy.nav.history },
    { href: '/app/household', label: copy.nav.household },
    { href: '/app/settings', label: copy.nav.settings }
  ];
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50">
      <header className="border-b border-sky-500/20 bg-gradient-to-r from-sky-600 via-sky-500 to-emerald-500 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/app" className="text-lg font-semibold tracking-wide">{copy.appName}</Link>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <nav className="flex flex-wrap gap-2 text-sm">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="rounded-lg px-3 py-1.5 text-white/90 hover:bg-white/10">
                  {link.label}
                </Link>
              ))}
            </nav>
            <form action="/logout" method="post">
              <button className="rounded-lg px-3 py-1.5 text-white/90 hover:bg-white/10" type="submit">
                {copy.nav.logout}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
