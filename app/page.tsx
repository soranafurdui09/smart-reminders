import Link from 'next/link';
import { messages } from '@/lib/i18n';
import { getLocaleFromCookie } from '@/lib/i18n/server';

export default function LandingPage() {
  const locale = getLocaleFromCookie();
  const copy = messages[locale];
  return (
    <main className="min-h-screen">
      <div className="page-wrap flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-lg font-semibold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-sm font-bold text-white">
              RI
            </span>
            {copy.appName}
          </div>
          <nav className="flex gap-3">
            <Link href="/auth" className="btn btn-secondary">{copy.landing.login}</Link>
            <Link href="/auth" className="btn btn-primary">{copy.landing.startFree}</Link>
          </nav>
        </header>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-ink">
              {copy.landing.heroTitle}
            </h1>
            <p className="text-lg text-muted">
              {copy.landing.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth" className="btn btn-primary">{copy.landing.createAccount}</Link>
              <Link href="/app" className="btn btn-secondary">{copy.landing.demo}</Link>
            </div>
          </div>
          <div className="card space-y-4">
            <div className="rounded-2xl bg-surfaceMuted p-4">
              <p className="text-sm font-semibold text-muted">{copy.landing.upcomingLabel}</p>
              <p className="text-lg font-semibold text-ink">{copy.landing.upcomingTitle}</p>
              <p className="text-sm text-muted">{copy.landing.upcomingNotify}</p>
            </div>
            <div className="rounded-2xl border border-dashed border-borderSubtle p-4 text-sm text-muted">
              {copy.landing.familyShare}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
