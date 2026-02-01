import Link from 'next/link';
import { Bell, ChevronRight, Globe2, HeartPulse, History, Mail, Settings, Users, Pill } from 'lucide-react';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getUserLocale, getUserNotificationPreferences, getUserTimeZone } from '@/lib/data';
import { messages } from '@/lib/i18n';

export default async function YouPage() {
  const user = await requireUser('/app/you');
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const email = user.email || '';
  const notificationPrefs = await getUserNotificationPreferences(user.id);
  const timeZone = await getUserTimeZone(user.id);
  const initial = email.trim().charAt(0).toUpperCase() || 'U';
  const statusItems = [
    {
      id: 'push',
      label: copy.you.statusPush,
      value: notificationPrefs.notifyByPush ? copy.you.statusOn : copy.you.statusOff,
      icon: Bell
    },
    {
      id: 'email',
      label: copy.you.statusEmail,
      value: notificationPrefs.notifyByEmail ? copy.you.statusOn : copy.you.statusOff,
      icon: Mail
    },
    {
      id: 'timezone',
      label: copy.you.statusTimezone,
      value: timeZone || copy.you.statusUnknown,
      icon: Globe2
    }
  ];

  return (
    <AppShell locale={locale} activePath="/app/you" userEmail={email}>
      <div className="space-y-8 pb-24">
        <SectionHeader title={copy.you.title} description={copy.you.subtitle} />

        <section className="surface-a1 rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:rgba(79,141,255,0.16)] text-lg font-semibold text-[color:rgb(var(--accent))] shadow-[0_10px_24px_rgba(30,64,175,0.35)]">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="break-words text-lg font-semibold text-ink [overflow-wrap:anywhere]">
                {email || copy.common.profile}
              </div>
              <div className="text-xs text-muted">{copy.common.profile}</div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {statusItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2"
                >
                  <Icon className="h-4 w-4 text-[color:rgb(var(--accent))]" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {item.label}
                    </div>
                    <div className="text-xs font-semibold text-ink">{item.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <HeartPulse className="h-4 w-4 text-[color:rgb(var(--accent))]" />
              <span>{copy.you.sectionHealth}</span>
            </div>
            <Link href="/app/medications" className="card flex items-center justify-between gap-3 hover:bg-surfaceMuted">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface3 text-[color:rgb(var(--accent))]">
                  <Pill className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-ink">{copy.you.medications}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Users className="h-4 w-4 text-[color:rgb(var(--accent))]" />
              <span>{copy.you.sectionFamily}</span>
            </div>
            <Link href="/app/household" className="card flex items-center justify-between gap-3 hover:bg-surfaceMuted">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface3 text-[color:rgb(var(--accent))]">
                  <Users className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-ink">{copy.you.household}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <History className="h-4 w-4 text-[color:rgb(var(--accent))]" />
              <span>{copy.you.sectionJournal}</span>
            </div>
            <Link href="/app/history" className="card flex items-center justify-between gap-3 hover:bg-surfaceMuted">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface3 text-[color:rgb(var(--accent))]">
                  <History className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-ink">{copy.you.history}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Settings className="h-4 w-4 text-[color:rgb(var(--accent))]" />
              <span>{copy.you.sectionPreferences}</span>
            </div>
            <Link href="/app/settings" className="card flex items-center justify-between gap-3 hover:bg-surfaceMuted">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface3 text-[color:rgb(var(--accent))]">
                  <Settings className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-ink">{copy.you.settings}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
