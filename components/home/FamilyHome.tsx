"use client";

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import QuickAddBar from '@/components/home/QuickAddBar';
import ReminderRowMobile from '@/components/mobile/ReminderRowMobile';
import ReminderFiltersPanel from '@/components/dashboard/ReminderFiltersPanel';
import ListReminderButton from '@/components/lists/ListReminderButton';
import ListShareSheet from '@/components/lists/ListShareSheet';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';

type Props = Record<string, any>;

export default function FamilyHome({
  header,
  uiMode,
  activeTab,
  inboxView,
  setInboxView,
  taskItems,
  listItems,
  inboxReminderItems,
  copy,
  taskBuckets,
  taskPending,
  handleToggleTask,
  inboxOverdue,
  inboxToday,
  inboxSoon,
  inboxLater,
  reminderUndatedLimited,
  reminderUndated,
  mobileInboxLimit,
  setMobileInboxLimit,
  locale,
  kindFilter,
  createdBy,
  assignment,
  categoryFilter,
  setKindFilter,
  setCreatedBy,
  setAssignment,
  setCategoryFilter,
  CreatedOptions,
  AssignmentOptions,
  nextOccurrence,
  nextOccurrenceLabel,
  filteredSoonItems,
  nextUpActionsSheet,
  googleConnected,
  effectiveTimeZone,
  localeTag,
  router,
  householdMembers,
  householdItems,
  todayOpenItems,
  overdueItems
}: Props) {
  const nextTitle = nextOccurrence?.reminder?.title ?? '';
  const hasNextAction = Boolean(nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at);
  const isNextEmpty = !nextTitle || !nextOccurrenceLabel;

  // ── New home redesign state ───────────────────────────────────────
  const [mounted, setMounted] = useState(false);
  const [isMorning, setIsMorning] = useState(false);
  const [heroResolved, setHeroResolved] = useState(false);
  const [heroSlideOut, setHeroSlideOut] = useState(false);
  const [showResolveNext, setShowResolveNext] = useState(false);
  const [, startResolveTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
    const h = new Date().getHours();
    setIsMorning(h >= 6 && h < 10);
  }, []);

  useEffect(() => {
    if (!heroResolved) return;
    const t1 = setTimeout(() => setHeroSlideOut(true), 1100);
    const t2 = setTimeout(() => setShowResolveNext(true), 1540);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [heroResolved]);

  const minutesUntilNext = useMemo(() => {
    if (!nextOccurrence) return null;
    const rawDate = nextOccurrence.snoozed_until ?? nextOccurrence.effective_at ?? nextOccurrence.occur_at;
    if (!rawDate) return null;
    const at = new Date(rawDate);
    if (Number.isNaN(at.getTime())) return null;
    return Math.round((at.getTime() - Date.now()) / 60000);
  }, [nextOccurrence]);

  const heroLabel = nextOccurrence?.reminder?.assigned_member_id
    ? 'FAMILIE · PRIORITATE COMUNĂ'
    : 'PRIORITATE ACUM';

  const heroContextLabel = nextOccurrence?.reminder?.assigned_member_id
    ? 'Familie'
    : 'Personal';

  // Today tasks shown in "Restul Zilei" (excluding the hero task)
  const todayTasks = useMemo(() => {
    if (!Array.isArray(todayOpenItems)) return [];
    return todayOpenItems
      .filter((item: any) => !nextOccurrence || item.id !== nextOccurrence.id)
      .slice(0, 6);
  }, [todayOpenItems, nextOccurrence]);

  // Next task to suggest after hero completion
  const nextAfterHero = useMemo(() => {
    if (todayTasks.length > 0) return todayTasks[0];
    return Array.isArray(filteredSoonItems) && filteredSoonItems.length > 0
      ? filteredSoonItems[0]
      : null;
  }, [todayTasks, filteredSoonItems]);

  // Family module counts
  const familyUrgentCount = useMemo(() => {
    if (!Array.isArray(householdItems)) return 0;
    return householdItems.filter((item: any) => overdueItems.some((o: any) => o.id === item.id)).length;
  }, [householdItems, overdueItems]);

  const familyUpcomingCount = useMemo(() => {
    if (!Array.isArray(householdItems)) return 0;
    return householdItems.filter((item: any) => !overdueItems.some((o: any) => o.id === item.id)).length;
  }, [householdItems, overdueItems]);

  const householdItemsSlice = useMemo(() => {
    if (!Array.isArray(householdItems)) return [];
    return householdItems.slice(0, 4);
  }, [householdItems]);
  const familyPeekItem = householdItemsSlice[0] ?? null;
  const familySummaryLabel = familyUrgentCount > 0
    ? `${familyUrgentCount} necesită confirmare`
    : familyUpcomingCount > 0
      ? `${familyUpcomingCount} azi`
      : 'Totul este aliniat';

  const handleResolve = () => {
    if (heroResolved) return;
    if (!nextOccurrence?.id || !nextOccurrence?.reminder?.id || !nextOccurrence?.occur_at) return;
    setHeroResolved(true);
    const occurrenceId = nextOccurrence.id;
    const reminderId = nextOccurrence.reminder.id as string;
    const occurAt = nextOccurrence.occur_at;
    // Submit server action after animation completes
    setTimeout(() => {
      startResolveTransition(async () => {
        const formData = new FormData();
        formData.append('occurrenceId', occurrenceId);
        formData.append('reminderId', reminderId);
        formData.append('occurAt', occurAt);
        formData.append('done_comment', '');
        await markDone(formData);
      });
    }, 1500);
  };
  const getFamilyPeekMeta = (occurrence: any) => {
    const reminder = occurrence.reminder ?? null;
    const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
    const resolvedTimeZone = resolveReminderTimeZone(reminder?.tz ?? null, effectiveTimeZone ?? null);
    if (!displayAt) return '';
    return occurrence.snoozed_until
      ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
      : formatReminderDateTime(displayAt, reminder?.tz ?? null, effectiveTimeZone ?? null);
  };

  return (
      <section className={`homeRoot premium ${uiMode === 'focus' ? 'modeFocus' : 'modeFamily'} space-y-[var(--space-3)]`}>
        {activeTab === 'inbox' ? (
          <div className="space-y-[var(--space-3)]">
            <div className="card-soft flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)]">
              <div className="text-sm font-semibold text-text">Inbox</div>
              <div className="text-xs text-muted2">
              {inboxView === 'tasks'
                ? `${taskItems.length} taskuri`
                : inboxView === 'lists'
                  ? `${listItems.length} liste`
                  : `${inboxReminderItems.length} ${copy.dashboard.reminderCountLabel}`}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`premium-chip ${inboxView === 'reminders' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                onClick={() => setInboxView('reminders')}
              >
                Remindere
              </button>
              <button
                type="button"
                className={`premium-chip ${inboxView === 'tasks' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                onClick={() => setInboxView('tasks')}
              >
                Taskuri
              </button>
              <button
                type="button"
                className={`premium-chip ${inboxView === 'lists' ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
                onClick={() => setInboxView('lists')}
              >
                Liste
              </button>
            </div>
            {inboxView === 'reminders' ? (
              <details className="card-soft group p-[var(--space-3)]">
                <summary className="flex cursor-pointer items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-wide text-muted2">
                  Filtre
                  <span className="text-[0.6875rem] font-semibold text-muted2 group-open:rotate-180 transition">▾</span>
                </summary>
                <div className="mt-[var(--space-2)]">
                  <ReminderFiltersPanel
                    locale={locale}
                    kindFilter={kindFilter}
                    createdBy={createdBy}
                    assignment={assignment}
                    category={categoryFilter}
                    onChangeKind={(value) => setKindFilter(value)}
                    onChangeCreatedBy={(value) => {
                      if (CreatedOptions.includes(value)) {
                        setCreatedBy(value);
                      }
                    }}
                    onChangeAssignment={(value) => {
                      if (AssignmentOptions.includes(value)) {
                        setAssignment(value);
                      }
                    }}
                    onChangeCategory={(value) => setCategoryFilter(value)}
                  />
                </div>
              </details>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'rent', label: 'Plată chirie', text: 'Plata chiriei pe 1 ale lunii la 9:00' },
                { id: 'itp', label: 'RCA/ITP', text: 'ITP mașină pe 1 iunie la 10:00' },
                { id: 'meds', label: 'Medicament zilnic', href: '/app/medications/new' },
                { id: 'appointment', label: 'Programare', text: 'Programare la dentist mâine la 12:00' }
              ].map((chip) =>
                chip.href ? (
                  <Link key={chip.id} href={chip.href} className="chip chip-selected">
                    {chip.label}
                  </Link>
                ) : (
                  <Link
                    key={chip.id}
                    href={`/app/reminders/new?quick=${encodeURIComponent(chip.text ?? '')}`}
                    className="chip"
                  >
                    {chip.label}
                  </Link>
                )
              )}
            </div>
            {inboxView === 'tasks' ? (
              taskItems.length ? (
                <div className="space-y-[var(--space-3)]">
                  {taskBuckets.overdue.length ? (
                    <div className="space-y-2">
                      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Restante</div>
                      {taskBuckets.overdue.map((item: any) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.today.length ? (
                    <div className="space-y-2">
                      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Azi</div>
                      {taskBuckets.today.map((item: any) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.soon.length ? (
                    <div className="space-y-2">
                      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Următoarele 7 zile</div>
                      {taskBuckets.soon.map((item: any) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.later.length ? (
                    <div className="space-y-2">
                      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Mai târziu</div>
                      {taskBuckets.later.map((item: any) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                            {item.due_date ? (
                              <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {taskBuckets.undated.length ? (
                    <div className="space-y-2">
                      <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Fără dată</div>
                      {taskBuckets.undated.map((item: any) => (
                        <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
                          <button
                            type="button"
                            className="mt-0.5 text-[color:rgb(var(--accent))]"
                            aria-pressed={item.done}
                            aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                            onClick={() => handleToggleTask(item)}
                            disabled={taskPending}
                          >
                            {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                              {item.title}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="premium-card p-[var(--space-3)] text-sm text-tertiary">
                  Nu ai taskuri în Inbox.
                </div>
              )
            ) : inboxView === 'lists' ? (
              listItems.length ? (
                <div className="space-y-[var(--space-2)]">
                  {listItems.map((list: any) => (
                    <div key={list.id} className="premium-card space-y-2 px-4 py-3 transition hover:bg-surfaceMuted">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/app/lists/${list.id}`} className="text-sm font-semibold text-ink truncate">
                            {list.name}
                          </Link>
                          <div className="text-xs text-tertiary">
                            {list.doneCount}/{list.totalCount} finalizate
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="chip">
                            {list.type === 'shopping' ? 'Shopping' : 'Listă'}
                          </span>
                          <div className="flex items-center gap-2">
                            <ListReminderButton listId={list.id} listTitle={list.name} />
                            <ListShareSheet listId={list.id} members={householdMembers} shared={Boolean(list.household_id)} />
                          </div>
                        </div>
                      </div>
                      {list.household_id ? (
                        <div className="text-[0.6875rem] font-semibold text-[color:rgb(var(--accent-2))]">
                          Shared · {householdMembers.length}
                        </div>
                      ) : null}
                      {list.previewItems.length ? (
                        <div className="space-y-1 text-xs text-muted">
                          {list.previewItems.map((item: any) => (
                            <div key={item.id} className={item.done ? 'line-through text-tertiary' : ''}>
                              • {item.title}{item.qty ? ` · ${item.qty}` : ''}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-tertiary">Nicio intrare încă.</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="premium-card p-[var(--space-3)] text-sm text-tertiary">
                  Nu ai liste create.
                </div>
              )
            ) : (
              <>
                {inboxOverdue.length ? (
                  <div className="space-y-2">
                    <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Restante</div>
                    {inboxOverdue.map((occurrence: any) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {inboxToday.length ? (
                  <div className="space-y-2">
                    <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Azi</div>
                    {inboxToday.map((occurrence: any) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {inboxSoon.length ? (
                  <div className="space-y-2">
                    <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Următoarele 7 zile</div>
                    {inboxSoon.map((occurrence: any) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {inboxLater.length ? (
                  <div className="space-y-2">
                    <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Mai târziu</div>
                    {inboxLater.map((occurrence: any) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {reminderUndatedLimited.length ? (
                  <div className="space-y-2">
                    <div className="text-[0.6875rem] font-semibold uppercase tracking-wide text-tertiary">Fără dată</div>
                    {reminderUndatedLimited.map((occurrence: any) => (
                      <ReminderRowMobile
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                        userTimeZone={effectiveTimeZone}
                      />
                    ))}
                  </div>
                ) : null}
                {!inboxOverdue.length && !inboxToday.length && !inboxSoon.length && !inboxLater.length && !reminderUndatedLimited.length ? (
                  <div className="premium-card p-[var(--space-3)] text-sm text-tertiary">
                    {copy.dashboard.empty}
                  </div>
                ) : null}
              </>
            )}
            {inboxView === 'reminders' && reminderUndated.length > mobileInboxLimit ? (
              <button
                type="button"
                className="text-xs font-semibold text-secondary"
                onClick={() => setMobileInboxLimit((prev: number) => prev + 20)}
              >
                {copy.dashboard.viewMoreMonths}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="home-slate today-shell home-compact" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingBottom: '1.25rem' }}>
            <div className="home-slate-bg" aria-hidden="true" />

            {/* ── 1. App Header ──────────────────────────────── */}
            {header as ReactNode}

            {/* ── 2. Morning Banner (06:00–10:00) ────────────── */}
            {mounted && isMorning ? (
              <div
                className="animate-in"
                style={{
                  margin: '0 0.75rem',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(108, 111, 245, 0.07)',
                  border: '1px solid rgba(108, 111, 245, 0.16)',
                  animationDelay: '100ms',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary, #8b8aa0)' }}>
                  ✦ Dimineață · Începe cu un singur lucru
                </span>
              </div>
            ) : null}

            {/* ── 3. Hero Card ────────────────────────────────── */}
            <div
              className="animate-in"
              style={{
                margin: '0 0.75rem',
                animationDelay: '150ms',
                transition: 'opacity 380ms cubic-bezier(0.16,1,0.3,1), transform 380ms cubic-bezier(0.16,1,0.3,1)',
                opacity: heroSlideOut ? 0 : 1,
                transform: heroSlideOut ? 'translateY(-1rem)' : 'translateY(0)',
                pointerEvents: heroSlideOut ? 'none' : undefined,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  borderRadius: '1rem',
                  background: 'var(--bg-elevated, #1a1b2e)',
                  border: '1px solid var(--border-default, #1e1f35)',
                  padding: '14px 14px 13px',
                  overflow: 'hidden',
                }}
              >
                {/* Left accent bar */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    borderRadius: '0 3px 3px 0',
                    background: 'var(--accent-color, #6c6ff5)',
                  }}
                />

                {/* Top-right glow */}
                <div
                  className="pointer-events-none"
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: 80,
                    height: 80,
                    background: 'radial-gradient(circle at top right, rgba(108,111,245,0.08), transparent 70%)',
                  }}
                />

                <div style={{ paddingLeft: '10px' }}>
                  {/* Row 1: label + timer chip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.06em',
                        color: 'var(--accent-text, #a5a8ff)',
                      }}
                    >
                      {heroLabel}
                    </span>
                    {minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext < 120 ? (
                      <span
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid var(--border-default, #1e1f35)',
                          borderRadius: '5px',
                          padding: '3px 8px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '10px',
                          color: 'var(--text-secondary, #8b8aa0)',
                          flexShrink: 0,
                        }}
                      >
                        În {minutesUntilNext} min
                      </span>
                    ) : null}
                  </div>

                  {/* Row 2: title */}
                  {isNextEmpty ? (
                    <div style={{ marginTop: '12px', color: 'var(--text-secondary, #8b8aa0)', fontSize: '14px' }}>
                      Totul e în regulă azi ✓
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          marginTop: '8px',
                          marginBottom: '6px',
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: heroResolved ? 'var(--success-text, #6ee7b7)' : 'var(--text-primary, #eeedf5)',
                          lineHeight: 1.3,
                          transition: 'color 200ms ease',
                        }}
                      >
                        {nextTitle}
                      </div>

                      {/* Row 3: meta chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '12px' }}>
                        {nextOccurrenceLabel ? (
                          <span
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-strong, #2a2b45)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '11px',
                              color: 'var(--text-secondary, #8b8aa0)',
                            }}
                          >
                            {nextOccurrenceLabel}
                          </span>
                        ) : null}
                        <span
                          style={{
                            background: 'rgba(108,111,245,0.10)',
                            border: '1px solid rgba(108,111,245,0.20)',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            color: 'var(--accent-text, #a5a8ff)',
                          }}
                        >
                          {heroContextLabel}
                        </span>
                      </div>

                      {/* Row 4: action buttons */}
                      {hasNextAction ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              height: '40px',
                              background: heroResolved
                                ? 'var(--success-color, #34d399)'
                                : 'rgba(108,111,245,0.92)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '14px',
                              borderRadius: '10px',
                              border: 'none',
                              cursor: heroResolved ? 'default' : 'pointer',
                              transition: 'background 200ms ease, box-shadow 200ms ease',
                              boxShadow: heroResolved
                                ? '0 2px 8px rgba(52,211,153,0.20)'
                                : '0 1px 4px rgba(108,111,245,0.18)',
                            }}
                            onClick={handleResolve}
                            disabled={heroResolved}
                          >
                            {heroResolved ? '✓ Rezolvat!' : '✓ Rezolvă'}
                          </button>
                          <form action={snoozeOccurrence}>
                            <input type="hidden" name="occurrenceId" value={nextOccurrence?.id ?? ''} />
                            <input type="hidden" name="mode" value="30" />
                            <ActionSubmitButton
                              type="submit"
                              style={{
                                height: '40px',
                                padding: '0 14px',
                                background: 'var(--bg-subtle, #1f2035)',
                                border: '1px solid var(--border-default, #1e1f35)',
                                color: 'var(--text-secondary, #8b8aa0)',
                                fontWeight: 600,
                                fontSize: '13px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap' as const,
                              }}
                            >
                              Amână
                            </ActionSubmitButton>
                          </form>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── 4. Family Coordination Module ───────────────── */}
            {Array.isArray(householdMembers) && householdMembers.length > 1 ? (
              <div
                className="animate-in"
                style={{ margin: '0 0.75rem', animationDelay: '200ms' }}
              >
                <div
                  style={{
                    borderRadius: '12px',
                    background: 'var(--bg-raised, #13141f)',
                    border: '1px solid var(--border-default, #1e1f35)',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #eeedf5)' }}>
                      Coordonare familie
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #8b8aa0)' }}>
                      {familySummaryLabel}
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: '9px',
                      border: '1px solid var(--border-default, #1e1f35)',
                      background: 'rgba(255,255,255,0.02)',
                      padding: '8px 10px',
                    }}
                  >
                    <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted, #4a4860)' }}>
                      Acum
                    </div>
                    <div
                      style={{
                        marginTop: '2px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary, #eeedf5)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {familyPeekItem?.reminder?.title ?? 'Nicio acțiune comună acum'}
                    </div>
                    {familyPeekItem ? (
                      <div style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-muted, #4a4860)' }}>
                        {getFamilyPeekMeta(familyPeekItem)}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <button
                      type="button"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--accent-text, #a5a8ff)',
                        background: 'transparent',
                        border: '1px solid rgba(108,111,245,0.28)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                      onClick={() => router.push('/app/household')}
                    >
                      Coordonează
                    </button>
                    <button
                      type="button"
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-secondary, #8b8aa0)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      onClick={() => router.push('/app/household')}
                    >
                      Vezi tot
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── 5. Restul Zilei ─────────────────────────────── */}
            {todayTasks.length > 0 ? (
              <div
                className="animate-in"
                style={{ margin: '0 0.75rem', animationDelay: '280ms' }}
              >
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted, #4a4860)',
                    }}
                  >
                    RESTUL ZILEI
                  </span>
                  <button
                    type="button"
                    style={{
                      fontFamily: 'var(--font-mono, monospace)',
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.06em',
                      color: 'var(--text-muted, #4a4860)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => router.push('/app?tab=today')}
                  >
                    TOATE →
                  </button>
                </div>

                {/* Task cards */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '5px' }}>
                  {todayTasks.map((occurrence: any, idx: number) => {
                    const reminder = occurrence.reminder ?? null;
                    const title = reminder?.title ?? '—';
                    const rawDate = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
                    const timeLabel = rawDate ? new Date(rawDate).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' }) : null;
                    const dayDiff = rawDate ? diffDaysInTimeZone(new Date(rawDate), new Date(), effectiveTimeZone || 'UTC') : null;
                    const metaLabel = dayDiff === 1 ? 'Scadent mâine' : (reminder?.category ?? null);
                    const isWarnMeta = dayDiff !== null && dayDiff <= 1;
                    return (
                      <div
                        key={occurrence.id}
                        className="animate-in"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 10px',
                          borderRadius: '9px',
                          background: 'var(--bg-raised, #13141f)',
                          border: '1px solid var(--border-default, #1e1f35)',
                          animationDelay: `${280 + 60 * idx}ms`,
                        }}
                      >
                        {/* Checkbox */}
                        <form action={markDone} style={{ flexShrink: 0 }}>
                          <input type="hidden" name="occurrenceId" value={occurrence.id ?? ''} />
                          <input type="hidden" name="reminderId" value={reminder?.id ?? ''} />
                          <input type="hidden" name="occurAt" value={occurrence.occur_at ?? ''} />
                          <input type="hidden" name="done_comment" value="" />
                          <ActionSubmitButton
                            type="submit"
                            spinner={false}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              border: '1.5px solid var(--border-strong, #2a2b45)',
                              background: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              flexShrink: 0,
                            }}
                            aria-label={`Marchează ${title} ca rezolvat`}
                          >
                            <span style={{ fontSize: '8px', opacity: 0 }}>○</span>
                          </ActionSubmitButton>
                        </form>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--text-primary, #eeedf5)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' as const,
                            }}
                          >
                            {title}
                          </div>
                          {metaLabel ? (
                            <div
                              style={{
                                fontSize: '11px',
                                fontFamily: 'var(--font-mono, monospace)',
                                color: isWarnMeta ? 'var(--amber-text, #fcd34d)' : 'var(--text-muted, #4a4860)',
                                marginTop: '1px',
                              }}
                            >
                              {metaLabel}
                            </div>
                          ) : null}
                        </div>

                        {/* Time */}
                        {timeLabel ? (
                          <div
                            style={{
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono, monospace)',
                              color: 'var(--text-muted, #4a4860)',
                              flexShrink: 0,
                            }}
                          >
                            {timeLabel}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ── 6. Resolve Next (appears after hero completion) */}
            {showResolveNext && nextAfterHero ? (
              <div
                className="animate-in"
                style={{
                  margin: '0 0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(108,111,245,0.08)',
                  border: '1px solid rgba(108,111,245,0.20)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-secondary, #8b8aa0)' }}>
                  → Urmează:{' '}
                  <span style={{ color: 'var(--text-primary, #eeedf5)', fontWeight: 600 }}>
                    {(nextAfterHero as any).reminder?.title ?? '—'}
                  </span>
                </span>
              </div>
            ) : null}

            {/* ── 7. Quick Add (below first task items) ───────── */}
            {todayTasks.length > 0 ? (
              <div
                className="animate-in"
                style={{ margin: '0 0.75rem', animationDelay: '340ms' }}
              >
                <QuickAddBar />
              </div>
            ) : null}

            {/* Legacy: next actions sheet */}
            {nextUpActionsSheet}

          </div>
        )}
      </section>
  );
}
