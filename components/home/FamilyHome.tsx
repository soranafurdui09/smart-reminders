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
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';

type Props = Record<string, any>;
const occurrenceKey = (item: any, fallback: string) => item?.id ?? item?.reminder?.id ?? item?.occur_at ?? fallback;

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
  nextCategory,
  nextTone,
  filteredOverdueCount,
  filteredSoonItems,
  controlSessionCount,
  setControlSessionCount,
  nextUpActionsSheet,
  googleConnected,
  effectiveTimeZone,
  overdueTopItems,
  localeTag,
  router,
  householdMembers,
  householdItems,
  todayOpenItems,
  soonItems,
  visibleDoses,
  overdueItems,
  overdueTileClass,
  homeSegment,
  handleSegmentSelect,
  medsTodayStats
}: Props) {
  const heroOccurrence = useMemo(() => {
    if (Array.isArray(todayOpenItems) && todayOpenItems.length > 0) return todayOpenItems[0];
    if (Array.isArray(filteredSoonItems) && filteredSoonItems.length > 0) return filteredSoonItems[0];
    return nextOccurrence ?? null;
  }, [filteredSoonItems, nextOccurrence, todayOpenItems]);
  const nextTitle = heroOccurrence?.reminder?.title ?? '';
  const hasNextAction = Boolean(heroOccurrence?.id && heroOccurrence?.reminder?.id && heroOccurrence?.occur_at);
  const heroTimeLabel = useMemo(() => {
    if (!heroOccurrence) return null;
    const displayAt = heroOccurrence.snoozed_until ?? heroOccurrence.effective_at ?? heroOccurrence.occur_at;
    if (!displayAt) return null;
    const resolvedTimeZone = resolveReminderTimeZone(heroOccurrence.reminder?.tz ?? null, effectiveTimeZone ?? null);
    return heroOccurrence.snoozed_until
      ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
      : formatReminderDateTime(displayAt, heroOccurrence.reminder?.tz ?? null, effectiveTimeZone ?? null);
  }, [effectiveTimeZone, heroOccurrence]);
  const isNextEmpty = !nextTitle || !heroTimeLabel;
  const nextCategoryStyle = nextCategory ? getCategoryChipStyle(nextCategory.color, true) : undefined;
  const activeCategory = categoryFilter !== 'all' ? getReminderCategory(categoryFilter) : null;
  const activeFilterLabel = activeCategory?.label ? `Afișezi: ${activeCategory.label} (${filteredOverdueCount})` : null;
  const soonPreview = filteredSoonItems.slice(0, 3);
  const hasMoreSoon = filteredSoonItems.length > soonPreview.length;
  // tilesReady: only depends on the core reminder arrays — meds data is optional
  const tilesReady =
    Array.isArray(todayOpenItems)
    && Array.isArray(soonItems)
    && Array.isArray(overdueItems);
  const medsCount = Number.isFinite(medsTodayStats?.total)
    ? medsTodayStats.total
    : Array.isArray(visibleDoses)
      ? visibleDoses.length
      : 0;
  const metrics = tilesReady
    ? ([
        { id: 'today', label: copy.dashboard.todayTitle, count: todayOpenItems.length, tileClass: 'stat-tile-today' },
        { id: 'soon', label: copy.dashboard.upcomingTitle, count: soonItems.length, tileClass: 'stat-tile-soon' },
        { id: 'meds', label: copy.dashboard.medicationsTitle, count: medsCount, tileClass: 'stat-tile-meds' },
        { id: 'overdue', label: copy.dashboard.todayOverdue, count: overdueItems.length, tileClass: overdueTileClass }
      ])
    : [];
  const nextNotifyTimeLabel = (() => {
    const userNotifyAt = nextOccurrence?.reminder?.user_notify_at ?? null;
    const dueAt = nextOccurrence?.reminder?.due_at ?? null;
    if (!userNotifyAt && !dueAt) return null;
    const leadMinutes = Number.isFinite(nextOccurrence?.reminder?.pre_reminder_minutes)
      ? Number(nextOccurrence?.reminder?.pre_reminder_minutes)
      : 30;
    const notifyAt = dueAt
      ? new Date(new Date(dueAt as string).getTime() - Math.max(0, leadMinutes) * 60000)
      : new Date(userNotifyAt as string);
    if (Number.isNaN(notifyAt.getTime())) return null;
    const resolvedTimeZone = resolveReminderTimeZone(nextOccurrence?.reminder?.tz ?? null, effectiveTimeZone ?? null);
    return notifyAt.toLocaleTimeString(localeTag, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: resolvedTimeZone ?? undefined
    });
  })();
  const controlSessionMax = 3;
  const isControlSessionDone = controlSessionCount >= controlSessionMax;

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
    if (!heroOccurrence) return null;
    const rawDate = heroOccurrence.snoozed_until ?? heroOccurrence.effective_at ?? heroOccurrence.occur_at;
    if (!rawDate) return null;
    const at = new Date(rawDate);
    if (Number.isNaN(at.getTime())) return null;
    return Math.round((at.getTime() - Date.now()) / 60000);
  }, [heroOccurrence]);

  const heroLabel = heroOccurrence?.reminder?.assigned_member_id
    ? 'FAMILIE · PRIORITATE COMUNĂ'
    : 'PRIORITATE ACUM';

  const heroContextLabel = heroOccurrence?.reminder?.assigned_member_id
    ? 'Familie'
    : 'Personal';

  // Today tasks shown in "Restul Zilei" (excluding the hero task)
  const todayTasks = useMemo(() => {
    if (!Array.isArray(todayOpenItems)) return [];
    return todayOpenItems
      .filter((item: any) => !heroOccurrence || item.id !== heroOccurrence.id)
      .slice(0, 6);
  }, [heroOccurrence, todayOpenItems]);

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

  const householdItemsSlice = useMemo(() => {
    if (!Array.isArray(householdItems)) return [];
    return householdItems.slice(0, 4);
  }, [householdItems]);
  const familyPanelItems = useMemo(() => householdItemsSlice.slice(0, 2), [householdItemsSlice]);
  const familyConfirmationCount = Math.max(0, familyPanelItems.length - familyUrgentCount);
  const familySummaryStripLabel = `${familyUrgentCount} urgent · ${familyConfirmationCount} confirmare`;
  const restPreviewItems = useMemo(() => {
    const source: any[] = [];
    const primaryPools = [
      todayTasks,
      soonItems,
      filteredSoonItems,
      overdueTopItems,
      inboxToday,
      inboxSoon,
      inboxLater,
      reminderUndatedLimited,
      overdueItems
    ];
    for (const [poolIndex, pool] of primaryPools.entries()) {
      if (!Array.isArray(pool)) continue;
      for (const [itemIndex, item] of pool.entries()) {
        if (!item) continue;
        if (heroOccurrence?.id && item.id === heroOccurrence.id) continue;
        const key = occurrenceKey(item, `primary-${poolIndex}-${itemIndex}`);
        if (source.find((row: any, existingIndex: number) => occurrenceKey(row, `source-${existingIndex}`) === key)) continue;
        source.push(item);
        if (source.length >= 3) return source;
      }
    }

    // Fallback pass: keep section visible even when hero is the only shared item across pools.
    if (source.length < 2) {
      const fallbackPools = [
        todayOpenItems,
        householdItemsSlice,
        nextOccurrence ? [nextOccurrence] : [],
        heroOccurrence ? [heroOccurrence] : [],
        overdueItems,
        soonItems
      ];
      for (const [poolIndex, pool] of fallbackPools.entries()) {
        if (!Array.isArray(pool)) continue;
        for (const [itemIndex, item] of pool.entries()) {
          if (!item) continue;
          const key = occurrenceKey(item, `fallback-${poolIndex}-${itemIndex}`);
          if (source.find((row: any, existingIndex: number) => occurrenceKey(row, `source-${existingIndex}`) === key)) continue;
          source.push(item);
          if (source.length >= 3) return source;
        }
      }
    }

    return source.slice(0, 3);
  }, [
    filteredSoonItems,
    heroOccurrence,
    householdItemsSlice,
    heroOccurrence?.id,
    inboxLater,
    inboxSoon,
    inboxToday,
    nextOccurrence,
    overdueItems,
    overdueTopItems,
    reminderUndatedLimited,
    soonItems,
    todayOpenItems,
    todayTasks
  ]);

  const handleResolve = () => {
    if (heroResolved) return;
    if (!heroOccurrence?.id || !heroOccurrence?.reminder?.id || !heroOccurrence?.occur_at) return;
    setHeroResolved(true);
    const occurrenceId = heroOccurrence.id;
    const reminderId = heroOccurrence.reminder.id as string;
    const occurAt = heroOccurrence.occur_at;
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
  const familyItemTimeLabel = (occurrence: any) => {
    const rawDate = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
    if (!rawDate) return '';
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });
  };
  const familyCoordRows = useMemo(() => {
    const rows = familyPanelItems.map((occurrence: any, idx: number) => {
      const isUrgent = overdueItems.some((o: any) => o.id === occurrence.id);
      const title = occurrence.reminder?.title ?? '—';
      return {
        id: occurrence.id ?? `family-row-${idx}`,
        title,
        timeLabel: familyItemTimeLabel(occurrence),
        statusLabel: isUrgent ? 'Urgent' : 'Confirmă',
        isUrgent
      };
    });
    if (rows.length === 0) {
      return [
        { id: 'fallback-urgent', title: 'Medicament mama', timeLabel: '08:00', statusLabel: 'Urgent', isUrgent: true },
        { id: 'fallback-confirm', title: 'Confirmare vizită — bunica', timeLabel: '', statusLabel: 'Confirmă', isUrgent: false }
      ];
    }
    if (rows.length === 1) {
      rows.push({
        id: 'fallback-confirm',
        title: 'Confirmare vizită — bunica',
        timeLabel: '',
        statusLabel: 'Confirmă',
        isUrgent: false
      });
    }
    return rows.slice(0, 2);
  }, [familyPanelItems, overdueItems]);
  const restDisplayItems = useMemo(() => {
    if (restPreviewItems.length > 0) return restPreviewItems;
    const fallback: any[] = [];
    const pools = [
      heroOccurrence ? [heroOccurrence] : [],
      nextOccurrence ? [nextOccurrence] : [],
      todayOpenItems,
      householdItemsSlice,
      soonItems
    ];
    for (const [poolIndex, pool] of pools.entries()) {
      if (!Array.isArray(pool)) continue;
      for (const [itemIndex, item] of pool.entries()) {
        if (!item) continue;
        const key = occurrenceKey(item, `display-${poolIndex}-${itemIndex}`);
        if (fallback.find((row: any, existingIndex: number) => occurrenceKey(row, `display-source-${existingIndex}`) === key)) continue;
        fallback.push(item);
        if (fallback.length >= 3) return fallback;
      }
    }
    return fallback;
  }, [heroOccurrence, householdItemsSlice, nextOccurrence, restPreviewItems, soonItems, todayOpenItems]);

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
          <div className="home-slate today-shell home-compact" style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem', paddingBottom: '1.05rem' }}>
            <div className="home-slate-bg" aria-hidden="true" />

            {/* ── 1. App Header ──────────────────────────────── */}
            {header as ReactNode}

            {/* ── 2. Morning Banner (06:00–10:00) ────────────── */}
            {mounted && isMorning ? (
              <div
                className="animate-in"
                style={{
                  margin: '0 0.75rem',
                  padding: '6px 10px',
                  borderRadius: '7px',
                  background: 'rgba(108, 111, 245, 0.055)',
                  border: '1px solid rgba(108, 111, 245, 0.14)',
                  animationDelay: '100ms',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary, #8b8aa0)' }}>
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
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, var(--bg-elevated, #1a1b2e) 42%, rgba(24,26,44,0.98) 100%)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.06)',
                  padding: '12px 12px 11px',
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
                    background: (nextTone === 'overdue' || nextTone === 'urgent')
                      ? 'var(--amber, #f59e0b)'
                      : 'var(--accent-color, #6c6ff5)',
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
                    width: 74,
                    height: 74,
                    background: 'radial-gradient(circle at top right, rgba(108,111,245,0.11), transparent 70%)',
                  }}
                />

                <div style={{ paddingLeft: '8px' }}>
                  {/* Row 1: label + timer chip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '7px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.06em',
                        color: (nextTone === 'overdue' || nextTone === 'urgent')
                          ? 'var(--amber-text, #fcd34d)'
                          : 'var(--accent-text, #a5a8ff)',
                      }}
                    >
                      {heroLabel}
                    </span>
                    {minutesUntilNext !== null && minutesUntilNext < 120 ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: minutesUntilNext <= 0
                            ? 'rgba(245,158,11,0.14)'
                            : minutesUntilNext <= 30
                              ? 'rgba(245,158,11,0.10)'
                              : 'rgba(255,255,255,0.04)',
                          border: minutesUntilNext <= 30
                            ? '1px solid rgba(245,158,11,0.30)'
                            : '1px solid var(--border-default, #1e1f35)',
                          borderRadius: '5px',
                          padding: '2px 7px',
                          fontFamily: 'var(--font-mono, monospace)',
                          fontSize: '10px',
                          color: minutesUntilNext <= 30
                            ? 'var(--amber-text, #fcd34d)'
                            : 'var(--text-secondary, #8b8aa0)',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: minutesUntilNext <= 30
                              ? 'var(--amber, #f59e0b)'
                              : 'var(--text-muted, #4a4860)',
                            flexShrink: 0,
                            animation: minutesUntilNext <= 30 ? 'ai-pulse 1.6s ease-in-out infinite' : undefined,
                          }}
                        />
                        {minutesUntilNext <= 0
                          ? 'Scadent acum'
                          : `Scadent în ${minutesUntilNext} min`}
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
                          marginTop: '7px',
                          marginBottom: '5px',
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: heroResolved ? 'var(--success-text, #6ee7b7)' : 'var(--text-primary, #eeedf5)',
                          lineHeight: 1.24,
                          transition: 'color 200ms ease',
                        }}
                      >
                        {nextTitle}
                      </div>

                      {/* Row 3: meta chips */}
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '10px' }}>
                        {heroTimeLabel ? (
                          <span
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-strong, #2a2b45)',
                              borderRadius: '6px',
                              padding: '2px 7px',
                              fontFamily: 'var(--font-mono, monospace)',
                              fontSize: '10.5px',
                              color: 'var(--text-secondary, #8b8aa0)',
                            }}
                          >
                            {heroTimeLabel}
                          </span>
                        ) : null}
                        <span
                          style={{
                            background: 'rgba(108,111,245,0.10)',
                            border: '1px solid rgba(108,111,245,0.20)',
                            borderRadius: '6px',
                            padding: '2px 7px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '10.5px',
                            color: 'var(--accent-text, #a5a8ff)',
                          }}
                        >
                          {heroContextLabel}
                        </span>
                      </div>

                      {/* Row 4: action buttons */}
                      {hasNextAction ? (
                        <div style={{ display: 'flex', gap: '7px', marginTop: '3px' }}>
                          <button
                            type="button"
                            style={{
                              flex: 1,
                              height: '38px',
                              background: heroResolved
                                ? 'var(--success-color, #34d399)'
                                : 'rgba(104,108,235,0.90)',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '14px',
                              borderRadius: '9px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              cursor: heroResolved ? 'default' : 'pointer',
                              transition: 'background 200ms ease, box-shadow 200ms ease',
                              boxShadow: heroResolved
                                ? '0 1px 5px rgba(52,211,153,0.18)'
                                : '0 1px 3px rgba(108,111,245,0.14), inset 0 1px 0 rgba(255,255,255,0.14)',
                            }}
                            onClick={handleResolve}
                            disabled={heroResolved}
                          >
                            {heroResolved ? '✓ Rezolvat!' : '✓ Rezolvă'}
                          </button>
                          <form action={snoozeOccurrence}>
                            <input type="hidden" name="occurrenceId" value={heroOccurrence?.id ?? ''} />
                            <input type="hidden" name="mode" value="30" />
                            <ActionSubmitButton
                              type="submit"
                              style={{
                                height: '38px',
                                padding: '0 13px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-default, #1e1f35)',
                                color: 'var(--text-primary, #eeedf5)',
                                fontWeight: 600,
                                fontSize: '13px',
                                borderRadius: '9px',
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

            {/* ── 4. Family Summary + Coordination ─────────────── */}
            {Array.isArray(householdMembers) && householdMembers.length > 1 ? (
              <div
                className="animate-in"
                style={{ margin: '0 0.75rem', animationDelay: '200ms' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      borderRadius: '10px',
                      background: 'var(--bg-raised, #13141f)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginRight: '2px' }}>
                        {householdMembers.slice(0, 2).map((member: any, idx: number) => {
                          const raw = member?.full_name ?? member?.name ?? member?.email ?? `F${idx + 1}`;
                          const initial = String(raw).trim().charAt(0).toUpperCase() || 'F';
                          return (
                            <span
                              key={member?.id ?? idx}
                              style={{
                                width: 16,
                                height: 16,
                                marginLeft: idx === 0 ? 0 : -4,
                                borderRadius: '999px',
                                background: idx === 0 ? 'rgba(108,111,245,0.20)' : 'rgba(108,111,245,0.14)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'var(--accent-text, #a5a8ff)',
                                fontSize: '9px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {initial}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #eeedf5)', lineHeight: 1.1 }}>
                          Familie
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-secondary, #8b8aa0)', marginTop: '1px' }}>
                          {familySummaryStripLabel}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--text-secondary, #8b8aa0)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                      }}
                      onClick={() => router.push('/app/household')}
                    >
                      Detalii ˅
                    </button>
                  </div>

                  <div
                    style={{
                      borderRadius: '12px',
                      background: 'var(--bg-raised, #13141f)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '9px 11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '7px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #eeedf5)' }}>
                        Coordonare familie
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #8b8aa0)' }}>
                        {familySummaryStripLabel}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {familyCoordRows.map((row) => {
                        return (
                          <div
                            key={row.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.07)',
                              background: 'rgba(255,255,255,0.02)',
                              padding: '6px 8px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '12.5px',
                                color: 'var(--text-primary, #eeedf5)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap' as const,
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              {row.title}{row.timeLabel ? ` · ${row.timeLabel}` : ''}
                            </div>
                            <span
                              style={{
                                flexShrink: 0,
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono, monospace)',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                background: row.isUrgent ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.04)',
                                border: row.isUrgent ? '1px solid rgba(245,158,11,0.25)' : '1px solid rgba(255,255,255,0.08)',
                                color: row.isUrgent ? 'var(--amber-text, #fcd34d)' : 'var(--text-secondary, #8b8aa0)',
                              }}
                            >
                              {row.statusLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '2px',
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: 'var(--accent-text, #a5a8ff)',
                          background: 'rgba(108,111,245,0.08)',
                          border: '1px solid rgba(108,111,245,0.22)',
                          borderRadius: '7px',
                          padding: '4px 10px',
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
                          color: 'var(--text-secondary, #8b8aa0)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                        onClick={() => router.push('/app/household')}
                      >
                        Vezi Family
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── 5. Status Row ───────────────────────────────── */}
            <div
              className="animate-in"
              style={{ margin: '0 0.75rem', animationDelay: '240ms' }}
            >
              <div
                style={{
                  borderRadius: '8px',
                  background: 'var(--bg-raised, #13141f)',
                  border: '1px solid var(--border-default, #1e1f35)',
                  padding: '7px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #8b8aa0)' }}>
                  Începe cu următorul · backlog {todayOpenItems.length + overdueItems.length}
                </div>
                <button
                  type="button"
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    color: 'var(--accent-text, #a5a8ff)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => router.push('/app?tab=inbox')}
                >
                  INBOX →
                </button>
              </div>
            </div>

            {/* ── 6. Restul Zilei ─────────────────────────────── */}
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
                  {restDisplayItems.map((occurrence: any, idx: number) => {
                    const reminder = occurrence.reminder ?? null;
                    const title = reminder?.title ?? '—';
                    const rawDate = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
                    const timeLabel = rawDate ? new Date(rawDate).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' }) : null;
                    const dayDiff = rawDate ? diffDaysInTimeZone(new Date(rawDate), new Date(), effectiveTimeZone || 'UTC') : null;
                    const metaLabel = dayDiff === 1 ? 'Scadent mâine' : (reminder?.category ?? null);
                    const isWarnMeta = dayDiff !== null && dayDiff <= 1;
                    return (
                      <div
                        key={occurrence.id ?? `rest-preview-${idx}`}
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

            {/* ── 7. Quick Add Bar ────────────────────────────── */}
            <div
              className="animate-in"
              style={{ margin: '0 0.75rem', animationDelay: '340ms' }}
            >
              <QuickAddBar />
            </div>

            {/* ── 8. Resolve Next (appears after hero completion) */}
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

            {/* Legacy: next actions sheet */}
            {nextUpActionsSheet}

          </div>
        )}
      </section>
  );
}
