"use client";

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Calendar, Clock, Home, PlusCircle } from 'lucide-react';
import { messages, defaultLocale, getLocaleTag, type Locale } from '@/lib/i18n';
import ReminderDashboardSection from '@/app/reminders/ReminderDashboardSection';
import NativeAppChrome from '@/components/NativeAppChrome';
import NativeShellGate from '@/components/NativeShellGate';
import NativeNotificationSync from '@/components/NativeNotificationSync';
import TimeZoneSync from '@/components/TimeZoneSync';
import NativeSpeechErrorToast from '@/components/NativeSpeechErrorToast';
import VoiceCreateToast from '@/components/VoiceCreateToast';
import ActionFeedback from '@/components/ActionFeedback';
import { deleteReminder } from '@/app/app/reminders/[id]/actions';
import { formatDateTimeWithTimeZone } from '@/lib/dates';
import { getReminderCategory, inferReminderCategoryId } from '@/lib/categories';

type DashboardPayload = {
  ok: true;
  locale: Locale;
  localeTag: string;
  user: { id: string; email?: string | null };
  membershipId: string;
  householdId: string;
  userTimeZone?: string | null;
  googleConnected: boolean;
  memberLabels: Record<string, string>;
  medicationDoses: any[];
  inboxTasks: any[];
  occurrences: any[];
};

type DashboardErrorPayload = {
  ok: false;
  reason: 'no-household';
  locale: Locale;
  localeTag: string;
  user: { id: string; email?: string | null };
};

type HistoryPayload = {
  ok: true;
  locale: Locale;
  localeTag: string;
  user: { id: string; email?: string | null };
  householdId: string;
  userTimeZone?: string | null;
  rangeDays: number;
  items: any[];
  hasMore: boolean;
  memberLabels: Record<string, string>;
  statsRows: Array<{ id: string; label: string; initial: string; counts: { done: number; snoozed: number } }>;
  hasStats: boolean;
};

type HistoryErrorPayload = {
  ok: false;
  reason: 'no-household';
  locale: Locale;
  localeTag: string;
  user: { id: string; email?: string | null };
};

type TabKey = 'dashboard' | 'history' | 'new';

const DEV = process.env.NODE_ENV !== 'production';
const NativeFab = dynamic(() => import('@/components/mobile/MobileFab'), { ssr: false });

const getNativeAllowed = () => {
  if (typeof window === 'undefined') {
    return { allowed: false, isAndroid: false };
  }
  const ua = window.navigator.userAgent || '';
  const isCapNative = Capacitor.isNativePlatform();
  const isAndroid = isCapNative && Capacitor.getPlatform() === 'android';
  const isWebView = /\bwv\b/i.test(ua);
  return { allowed: isAndroid || isWebView, isAndroid };
};

export default function NativePage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [isNativeAllowed, setIsNativeAllowed] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardPayload | DashboardErrorPayload | null>(null);
  const [history, setHistory] = useState<HistoryPayload | HistoryErrorPayload | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { allowed, isAndroid: android } = getNativeAllowed();
    setIsNativeAllowed(allowed);
    setIsAndroid(android);
    if (!allowed) {
      router.replace('/app');
      return;
    }
    document.documentElement.classList.add('has-bottom-nav');
    document.documentElement.style.setProperty('--bottom-nav-h', '64px');
    document.documentElement.style.setProperty('--fab-clearance', '72px');
    return () => {
      document.documentElement.classList.remove('has-bottom-nav');
      document.documentElement.style.removeProperty('--bottom-nav-h');
      document.documentElement.style.removeProperty('--fab-clearance');
    };
  }, [router]);

  useEffect(() => {
    if (!isNativeAllowed) return;
    let alive = true;
    const run = async () => {
      setLoadingDashboard(true);
      setError(null);
      if (DEV) console.time('native_bootstrap');
      try {
        const res = await fetch('/api/native/dashboard', { cache: 'no-store', credentials: 'include' });
        if (res.redirected) {
          window.location.assign(res.url);
          return;
        }
        if (!res.ok) {
          setError(`dashboard:${res.status}`);
          return;
        }
        const data = (await res.json()) as DashboardPayload | DashboardErrorPayload;
        if (!alive) return;
        setDashboard(data);
      } catch (fetchError) {
        if (!alive) return;
        console.error('[native] dashboard fetch failed', fetchError);
        setError('dashboard:fetch-failed');
      } finally {
        if (DEV) console.timeEnd('native_bootstrap');
        if (alive) setLoadingDashboard(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [isNativeAllowed]);

  useEffect(() => {
    if (tab !== 'history') return;
    if (history || loadingHistory || !isNativeAllowed) return;
    let alive = true;
    const run = async () => {
      setLoadingHistory(true);
      if (DEV) console.time('native_history_load');
      try {
        const res = await fetch('/api/native/history', { cache: 'no-store', credentials: 'include' });
        if (res.redirected) {
          window.location.assign(res.url);
          return;
        }
        if (!res.ok) {
          setError(`history:${res.status}`);
          return;
        }
        const data = (await res.json()) as HistoryPayload | HistoryErrorPayload;
        if (!alive) return;
        setHistory(data);
      } catch (fetchError) {
        if (!alive) return;
        console.error('[native] history fetch failed', fetchError);
        setError('history:fetch-failed');
      } finally {
        if (DEV) console.timeEnd('native_history_load');
        if (alive) setLoadingHistory(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [tab, history, loadingHistory, isNativeAllowed]);

  const resolvedLocale = useMemo(() => {
    if (dashboard && dashboard.ok) return dashboard.locale;
    if (history && history.ok) return history.locale;
    return defaultLocale;
  }, [dashboard, history]);
  const resolvedLocaleTag = useMemo(() => {
    if (dashboard && dashboard.ok) return dashboard.localeTag;
    if (history && history.ok) return history.localeTag;
    return getLocaleTag(resolvedLocale);
  }, [dashboard, history, resolvedLocale]);
  const copy = messages[resolvedLocale];

  const tabs = useMemo(
    () => ([
      { key: 'dashboard' as const, label: copy.nav.dashboard, icon: Home },
      { key: 'calendar' as const, label: copy.nav.calendar, icon: Calendar },
      { key: 'history' as const, label: copy.nav.history, icon: Clock },
      { key: 'new' as const, label: copy.nav.newReminder, icon: PlusCircle }
    ]),
    [copy.nav.calendar, copy.nav.dashboard, copy.nav.history, copy.nav.newReminder]
  );

  if (!isNativeAllowed) {
    return (
      <div className="min-h-screen bg-app text-ink">
        <div className="page-wrap py-12 text-center text-sm text-muted">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-ink">
      <NativeAppChrome />
      {isAndroid ? <NativeShellGate /> : null}
      <div className="native-shell-root relative flex min-h-dvh flex-col">
        <header className="safe-top sticky top-0 z-40 border-b border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(59,130,246,0.12),rgba(6,12,18,0.76))] backdrop-blur-xl">
          <div className="page-wrap flex min-h-[56px] items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="text-base font-semibold text-text">
                {tab === 'dashboard' ? copy.nav.dashboard : tab === 'history' ? copy.nav.history : copy.nav.newReminder}
              </div>
              {tab === 'dashboard' ? (
                <div className="text-[11px] text-muted">{copy.dashboard.subtitle}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80"
              onClick={() => {
                if (tab === 'new') {
                  router.push('/app/reminders/new');
                }
              }}
              disabled={tab !== 'new'}
            >
              {copy.common.create}
            </button>
          </div>
        </header>

        <main className="page-wrap app-content relative z-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {copy.remindersNew.error}
            </div>
          ) : null}

          {tab === 'dashboard' ? (
            <>
              {loadingDashboard ? (
                <div className="mt-6 space-y-3">
                  <div className="h-20 rounded-2xl bg-surfaceMuted/70" />
                  <div className="h-28 rounded-2xl bg-surfaceMuted/70" />
                  <div className="h-28 rounded-2xl bg-surfaceMuted/70" />
                </div>
              ) : dashboard && dashboard.ok ? (
                <ReminderDashboardSection
                  occurrences={dashboard.occurrences}
                  copy={copy}
                  membershipId={dashboard.membershipId}
                  householdId={dashboard.householdId}
                  userId={dashboard.user.id}
                  googleConnected={dashboard.googleConnected}
                  medicationDoses={dashboard.medicationDoses}
                  inboxTasks={dashboard.inboxTasks}
                  memberLabels={dashboard.memberLabels}
                  initialCreatedBy="all"
                  initialAssignment="all"
                  initialTab="today"
                  locale={dashboard.locale}
                  localeTag={resolvedLocaleTag}
                  userTimeZone={dashboard.userTimeZone ?? undefined}
                />
              ) : (
                <div className="mt-6 rounded-2xl border border-borderSubtle bg-surface p-4 text-sm text-muted">
                  {copy.history.noHousehold}
                </div>
              )}
            </>
          ) : null}

          {tab === 'history' ? (
            <>
              {loadingHistory ? (
                <div className="mt-6 space-y-3">
                  <div className="h-20 rounded-2xl bg-surfaceMuted/70" />
                  <div className="h-20 rounded-2xl bg-surfaceMuted/70" />
                </div>
              ) : history && history.ok ? (
                <div className="mt-4 space-y-6">
                  <section className="card space-y-4">
                    <div>
                      <div className="text-lg font-semibold text-ink">{copy.history.statsTitle}</div>
                      <p className="text-sm text-muted">{copy.history.statsSubtitle}</p>
                    </div>
                    {history.hasStats ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        {history.statsRows.map((row) => (
                          <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSubtle bg-surface p-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surfaceMuted text-sm font-semibold text-ink">
                                {row.initial}
                              </div>
                              <div className="min-w-0 text-sm font-semibold text-ink truncate">{row.label}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                              <span className="inline-flex items-center gap-1">
                                {row.counts.done} {copy.history.statsDoneLabel}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                {row.counts.snoozed} {copy.history.statsSnoozedLabel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted">{copy.history.statsEmpty}</div>
                    )}
                  </section>

                  <section>
                    <div className="mb-4 space-y-1">
                      <h2 className="text-xl font-semibold text-ink">{copy.history.sectionTitle}</h2>
                      <p className="text-sm text-muted">{copy.history.sectionSubtitle}</p>
                    </div>
                    {history.items.length ? (
                      <div className="space-y-3">
                        {history.items.map((occurrence) => {
                          const reminder = occurrence.reminder;
                          const categoryId = inferReminderCategoryId({
                            title: reminder?.title,
                            notes: null,
                            kind: null,
                            category: reminder?.category,
                            medicationDetails: null
                          });
                          const category = getReminderCategory(categoryId);
                          const doneAt = occurrence.done_at || occurrence.performed_at || occurrence.occur_at;
                          const performerLabel = occurrence.performed_by
                            ? history.memberLabels[occurrence.performed_by] || copy.history.performerUnknown
                            : copy.history.performerUnknown;
                          return (
                            <div key={occurrence.id} className="rounded-2xl border border-borderSubtle bg-surface p-4">
                              <div className="text-sm font-semibold text-ink">{reminder?.title || copy.dashboard.nextTitle}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                                <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">
                                  {category.label}
                                </span>
                                {doneAt ? (
                                  <span>
                                    {formatDateTimeWithTimeZone(doneAt, history.userTimeZone ?? undefined)}
                                  </span>
                                ) : null}
                                <span>{copy.common.doneBy} {performerLabel}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted">{copy.history.statsEmpty}</div>
                    )}
                  </section>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-borderSubtle bg-surface p-4 text-sm text-muted">
                  {copy.history.noHousehold}
                </div>
              )}
            </>
          ) : null}

          {tab === 'new' ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
                <div className="text-lg font-semibold text-ink">{copy.remindersNew.title}</div>
                <p className="text-sm text-muted">{copy.remindersNew.subtitle}</p>
                <button
                  type="button"
                  className="btn btn-primary mt-4"
                  onClick={() => router.push('/app/reminders/new')}
                >
                  {copy.common.create}
                </button>
              </div>
            </div>
          ) : null}
        </main>

        <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 navbar safe-bottom">
          <div className="relative mx-auto flex w-full max-w-none items-center justify-between px-3 pb-[calc(env(safe-area-inset-bottom)_+_12px)] pt-2">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[44px] flex-1 items-center justify-center rounded-2xl px-2 py-1 transition ${
                    active ? 'text-text' : 'text-muted2'
                  }`}
                  onClick={() => {
                    if (item.key === 'calendar') {
                      router.push('/app/calendar');
                      return;
                    }
                    setTab(item.key);
                  }}
                >
                  <span className={`relative flex h-11 w-11 items-center justify-center rounded-2xl ${active ? 'bg-accent/20 text-text' : 'bg-surface3 text-muted'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {active ? <span className="absolute -bottom-1 h-1 w-6 rounded-full bg-accent" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <NativeFab />
      <TimeZoneSync />
      <NativeNotificationSync />
      <NativeSpeechErrorToast />
      <VoiceCreateToast copy={copy} locale={resolvedLocale} undoAction={deleteReminder} />
      <ActionFeedback />
    </div>
  );
}
