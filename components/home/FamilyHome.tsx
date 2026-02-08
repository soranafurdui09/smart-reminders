"use client";

import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ReactNode } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import QuickAddBar from '@/components/home/QuickAddBar';
import AtAGlanceRow from '@/components/home/AtAGlanceRow';
import ReminderRowMobile from '@/components/mobile/ReminderRowMobile';
import ReminderFiltersPanel from '@/components/dashboard/ReminderFiltersPanel';
import ListReminderButton from '@/components/lists/ListReminderButton';
import ListShareSheet from '@/components/lists/ListShareSheet';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';
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
  todayOpenItems,
  soonItems,
  visibleDoses,
  overdueItems,
  overdueTileClass,
  homeSegment,
  handleSegmentSelect,
  medsTodayStats
}: Props) {
  const nextToneClassName = nextTone === 'overdue' ? 'next-reminder-card--overdue' : nextTone === 'urgent' ? 'next-reminder-card--urgent' : '';
  const nextTitle = nextOccurrence?.reminder?.title ?? '';
  const hasNextAction = Boolean(nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at);
  const isNextEmpty = !nextTitle || !nextOccurrenceLabel;
  const nextCategoryStyle = nextCategory ? getCategoryChipStyle(nextCategory.color, true) : undefined;
  const activeCategory = categoryFilter !== 'all' ? getReminderCategory(categoryFilter) : null;
  const activeFilterLabel = activeCategory?.label ? `Afișezi: ${activeCategory.label} (${filteredOverdueCount})` : null;
  const soonPreview = filteredSoonItems.slice(0, 3);
  const hasMoreSoon = filteredSoonItems.length > soonPreview.length;
  const tilesReady =
    Array.isArray(todayOpenItems)
    && Array.isArray(soonItems)
    && Array.isArray(overdueItems)
    && (Array.isArray(visibleDoses) || Number.isFinite(medsTodayStats?.total));
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
  const getOverdueMeta = (occurrence: any) => {
    const reminder = occurrence.reminder ?? null;
    const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
    const resolvedTimeZone = resolveReminderTimeZone(reminder?.tz ?? null, effectiveTimeZone ?? null);
    const displayLabel = occurrence.snoozed_until
      ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
      : formatReminderDateTime(displayAt, reminder?.tz ?? null, effectiveTimeZone ?? null);
    const parsed = new Date(displayAt);
    if (Number.isNaN(parsed.getTime())) return displayLabel;
    const now = new Date();
    const dayDiff = diffDaysInTimeZone(parsed, now, resolvedTimeZone || effectiveTimeZone || 'UTC');
    const rtf = new Intl.RelativeTimeFormat(locale === 'ro' ? 'ro-RO' : locale, { numeric: 'auto' });
    if (dayDiff !== 0) {
      return `${displayLabel} · ${rtf.format(dayDiff, 'day')}`;
    }
    const diffMinutes = Math.round((parsed.getTime() - now.getTime()) / 60000);
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) >= 1) {
      return `${displayLabel} · ${rtf.format(diffHours, 'hour')}`;
    }
    return `${displayLabel} · ${rtf.format(diffMinutes, 'minute')}`;
  };

  return (
      <section className={`homeRoot premium ${uiMode === 'focus' ? 'modeFocus' : 'modeFamily'} space-y-[var(--space-3)]`}>
        {tilesReady ? (
          <AtAGlanceRow
            metrics={metrics}
            activeId={homeSegment}
            onSelect={(id) => {
              if (id === 'today' || id === 'soon' || id === 'overdue') {
                handleSegmentSelect(id);
              }
            }}
          />
        ) : (
          <div className="home-glass-panel at-a-glance-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`tile-skeleton-${index}`} className="h-20 rounded-2xl bg-surfaceMuted/70" />
              ))}
            </div>
          </div>
        )}
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
                <summary className="flex cursor-pointer items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted2">
                  Filtre
                  <span className="text-[11px] font-semibold text-muted2 group-open:rotate-180 transition">▾</span>
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
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Restante</div>
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
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Azi</div>
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
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Următoarele 7 zile</div>
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
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Mai târziu</div>
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
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Fără dată</div>
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
                        <div className="text-[11px] font-semibold text-[color:rgb(var(--accent-2))]">
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
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Restante</div>
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
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Azi</div>
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
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Următoarele 7 zile</div>
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
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Mai târziu</div>
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
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Fără dată</div>
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
          <div className="home-slate space-y-3 today-shell home-compact">
            <div className="home-slate-bg" aria-hidden="true" />
            {header as ReactNode}
            <>
                <div className={`next-reminder-card ${nextToneClassName}`}>
                  <span className="next-reminder-topline" aria-hidden="true" />
                  <span className="next-reminder-corner" aria-hidden="true" />
                  <div className="next-reminder-label">{copy.dashboard.nextTitle}</div>
                  {isNextEmpty ? (
                    <div className="next-reminder-time mt-2">{copy.dashboard.nextUpEmpty}</div>
                  ) : (
                    <>
                      <div className="next-reminder-title mt-2">{nextTitle}</div>
                      <div className="next-reminder-time mt-1">{nextOccurrenceLabel}</div>
                      {nextNotifyTimeLabel ? (
                        <div className="next-reminder-time mt-1 text-[color:var(--text-2)]">
                          🔔 Te anunț la {nextNotifyTimeLabel}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {nextCategory ? (
                          <span className="next-reminder-pill" style={nextCategoryStyle}>
                            {nextCategory.label}
                          </span>
                        ) : null}
                        {nextTone === 'overdue' ? (
                          <span className="next-reminder-overdue">{copy.dashboard.todayOverdue}</span>
                        ) : null}
                      </div>
                      {hasNextAction ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <form action={markDone}>
                            <input type="hidden" name="occurrenceId" value={nextOccurrence?.id ?? ''} />
                            <input type="hidden" name="reminderId" value={nextOccurrence?.reminder?.id ?? ''} />
                            <input type="hidden" name="occurAt" value={nextOccurrence?.occur_at ?? ''} />
                            <input type="hidden" name="done_comment" value="" />
                            <ActionSubmitButton
                              className="next-reminder-primary"
                              type="submit"
                              data-action-feedback={copy.common.actionDone}
                            >
                              {copy.dashboard.nextUpAction}
                            </ActionSubmitButton>
                          </form>
                          <form action={snoozeOccurrence}>
                            <input type="hidden" name="occurrenceId" value={nextOccurrence?.id ?? ''} />
                            <input type="hidden" name="mode" value="30" />
                            <ActionSubmitButton
                              className="next-reminder-secondary"
                              type="submit"
                              data-action-feedback={copy.common.actionSnoozed}
                            >
                              Amână
                            </ActionSubmitButton>
                          </form>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {nextUpActionsSheet}

                <QuickAddBar />

                {!overdueTopItems.length ? null : (
                  <div className="flex flex-wrap items-center gap-2">
                    {!isControlSessionDone ? (
                      <form action={markDone}>
                        <input type="hidden" name="occurrenceId" value={overdueTopItems[0]?.id ?? ''} />
                        <input type="hidden" name="reminderId" value={overdueTopItems[0]?.reminder?.id ?? ''} />
                        <input type="hidden" name="occurAt" value={overdueTopItems[0]?.occur_at ?? ''} />
                        <input type="hidden" name="done_comment" value="" />
                        <ActionSubmitButton
                          className="home-priority-primary"
                          type="submit"
                          data-action-feedback={copy.common.actionDone}
                          disabled={!overdueTopItems[0]}
                          onClick={() => {
                            setControlSessionCount((prev: number) => Math.min(prev + 1, controlSessionMax));
                          }}
                        >
                          Rezolvă următorul ({Math.min(controlSessionCount + 1, controlSessionMax)}/{controlSessionMax})
                        </ActionSubmitButton>
                      </form>
                    ) : null}
                    <form action={snoozeOccurrence}>
                      <input type="hidden" name="occurrenceId" value={overdueTopItems[0]?.id ?? ''} />
                      <input type="hidden" name="option_id" value="tomorrow" />
                      <ActionSubmitButton
                        className="home-priority-secondary"
                        type="submit"
                        data-action-feedback={copy.common.actionSnoozed}
                        disabled={!overdueTopItems[0]}
                      >
                        Mută pe mâine
                      </ActionSubmitButton>
                    </form>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[color:var(--brand-blue)]"
                      onClick={() => {
                        router.push('/app?tab=today&segment=overdue');
                      }}
                    >
                      Vezi toate
                    </button>
                  </div>
                )}
                {isControlSessionDone ? (
                  <div className="text-xs text-[color:var(--text-2)]">Sesiune încheiată. Restul pot aștepta.</div>
                ) : null}

                {!overdueTopItems.length ? null : (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[color:var(--text-0)]">Priorități de recuperat</div>
                    </div>
                    <div className="text-xs text-[color:var(--text-2)]">Rezolvă unul. Restul pot aștepta.</div>
                    {activeFilterLabel ? (
                      <div className="text-xs text-[color:var(--text-2)]">{activeFilterLabel}</div>
                    ) : null}
                    <div className="space-y-2">
                      {overdueTopItems.slice(0, 5).map((occurrence: any, index: number) => {
                        const reminder = occurrence.reminder ?? null;
                        const categoryId = inferReminderCategoryId({
                          title: reminder?.title,
                          notes: reminder?.notes,
                          kind: reminder?.kind,
                          category: reminder?.category,
                          medicationDetails: reminder?.medication_details
                        });
                        const category = getReminderCategory(categoryId);
                        const categoryStyle = getCategoryChipStyle(category.color, true);

                        return (
                          <div
                            key={occurrence.id}
                            className={`home-priority-row py-2 ${index === 0 ? '' : 'opacity-60'}`}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <div
                                className={`home-priority-title line-clamp-2 ${index === 0 ? 'text-[color:var(--text-0)]' : 'text-[color:var(--text-1)]'}`}
                              >
                                {reminder?.title}
                              </div>
                              <div className="home-priority-meta text-[color:var(--text-2)]">{getOverdueMeta(occurrence)}</div>
                              {category?.label ? (
                                <span className="home-category-pill" style={categoryStyle}>
                                  {category.label}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {filteredSoonItems.length ? (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[color:var(--text-0)]">Urmează în curând</div>
                      {hasMoreSoon ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-secondary"
                          onClick={() => {
                            router.push('/app?tab=today&segment=soon');
                          }}
                        >
                          Vezi toate
                        </button>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {soonPreview.map((occurrence: any) => (
                        <ReminderRowMobile
                          key={occurrence.id}
                          occurrence={occurrence}
                          locale={locale}
                          googleConnected={googleConnected}
                          userTimeZone={effectiveTimeZone}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}
              </>
          </div>
        )}
      </section>
  );
}
