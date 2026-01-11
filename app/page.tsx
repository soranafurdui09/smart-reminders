import Link from 'next/link';
import { getLocaleFromCookie, messages } from '@/lib/i18n';

export default function LandingPage() {
  const locale = getLocaleFromCookie();
  const copy = messages[locale];
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e2e8f0,#f8fafc_45%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold">{copy.appName}</div>
          <nav className="flex gap-3">
            <Link href="/auth" className="btn btn-secondary">{copy.landing.login}</Link>
            <Link href="/auth" className="btn btn-primary">{copy.landing.startFree}</Link>
          </nav>
        </header>

        <section className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900">
              {copy.landing.heroTitle}
            </h1>
            <p className="text-lg text-slate-600">
              {copy.landing.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth" className="btn btn-primary">{copy.landing.createAccount}</Link>
              <Link href="/app" className="btn btn-secondary">{copy.landing.demo}</Link>
            </div>
          </div>
          <div className="card space-y-4">
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-700">{copy.landing.upcomingLabel}</p>
              <p className="text-lg font-semibold">{copy.landing.upcomingTitle}</p>
              <p className="text-sm text-slate-500">{copy.landing.upcomingNotify}</p>
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              {copy.landing.familyShare}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
