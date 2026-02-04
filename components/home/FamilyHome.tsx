"use client";

import Link from 'next/link';
import { AlertTriangle, Calendar, CheckCircle2, Circle, Pill, SunMedium } from 'lucide-react';
import type { ReactNode } from 'react';
import NextUpCard from '@/components/home/NextUpCard';
import QuickAddBar from '@/components/home/QuickAddBar';
import AtAGlanceRow from '@/components/home/AtAGlanceRow';
import FilteredTaskList from '@/components/home/FilteredTaskList';
import OverdueDenseRow from '@/components/home/OverdueDenseRow';
import MedsTeaserCard from '@/components/home/MedsTeaserCard';
import ReminderRowMobile from '@/components/mobile/ReminderRowMobile';
import ReminderFiltersPanel from '@/components/dashboard/ReminderFiltersPanel';
import ListReminderButton from '@/components/lists/ListReminderButton';
import ListShareSheet from '@/components/lists/ListShareSheet';
import { getCategoryChipStyle } from '@/lib/categories';

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
  homeSubtitle,
  homeTab,
  setHomeTab,
  setUiMode,
  rememberMode,
  setRememberMode,
  nextOccurrence,
  nextOccurrenceLabel,
  nextCategory,
  nextTone,
  overdueTileClass,
  homeSegment,
  handleSegmentSelect,
  todayOpenItems,
  soonItems,
  visibleDoses,
  nextDoseTileLabel,
  overdueItems,
  overdueOldestLabel,
  nextUpActionsSheet,
  googleConnected,
  effectiveTimeZone,
  segmentItems,
  priorityItems,
  overdueTopItems,
  showRecover,
  setShowRecover,
  localeTag,
  router,
  sectionFlash,
  householdMembers,
  medsTodayStats,
  householdItems,
  setNextActionsOpen
}: Props) {
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
            <div className="homeTopControls mx-4 mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
              <div className="homeTabToggle flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-[11px]">
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 transition ${
                    homeTab === 'home' ? 'bg-white/10 text-white' : 'text-white/60'
                  }`}
                  onClick={() => setHomeTab('home')}
                >
                  Acasă
                </button>
                <button
                  type="button"
                  className={`rounded-full px-3 py-1 transition ${
                    homeTab === 'overview' ? 'bg-white/10 text-white' : 'text-white/60'
                  }`}
                  onClick={() => setHomeTab('overview')}
                >
                  Overview
                </button>
              </div>
            </div>

            {homeTab === 'overview' ? (
              <section className="space-y-3">
                <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
                  <div className="text-sm font-semibold text-[color:var(--text-0)]">Situația ta</div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/70">
                      <div className="text-base font-semibold text-white">{todayOpenItems.length}</div>
                      {copy.dashboard.todayTitle}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/70">
                      <div className="text-base font-semibold text-white">{soonItems.length}</div>
                      {copy.dashboard.todaySoon}
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs text-white/70">
                      <div className="text-base font-semibold text-white">{overdueItems.length}</div>
                      {copy.dashboard.todayOverdue}
                    </div>
                  </div>
                </div>
                <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
                  <div className="text-sm font-semibold text-[color:var(--text-0)]">Medicamente</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                    <span>{copy.dashboard.medicationsTileTitle}</span>
                    <span>
                      {medsTodayStats.taken}/{medsTodayStats.total}
                    </span>
                  </div>
                </div>
                <div className="home-glass-panel rounded-[var(--radius-lg)] px-[var(--space-2)] py-[var(--space-2)]">
                  <div className="text-sm font-semibold text-[color:var(--text-0)]">Grupuri</div>
                  <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                    <span>{copy.dashboard.householdTitle}</span>
                    <span>{householdItems.length}</span>
                  </div>
                </div>
                {visibleDoses.length ? (
                  <MedsTeaserCard
                    title={copy.dashboard.medicationsTitle}
                    subtitle={`Următoarea doză: ${new Date(visibleDoses[0].scheduled_at).toLocaleTimeString(localeTag, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`}
                    actionLabel={copy.medicationsHub.viewDetails}
                    onAction={() => {
                      router.push('/app/medications');
                    }}
                  />
                ) : (
                  <MedsTeaserCard title={copy.dashboard.medicationsTitle} subtitle={copy.dashboard.medicationsEmpty} />
                )}
              </section>
            ) : (
              <>
                <NextUpCard
                  title={copy.dashboard.nextTitle}
                  subtext={copy.dashboard.nextUpHelper}
                  taskTitle={nextOccurrence?.reminder?.title ?? undefined}
                  timeLabel={nextOccurrenceLabel ?? undefined}
                  badge={nextCategory?.label}
                  badgeStyle={nextCategory ? getCategoryChipStyle(nextCategory.color, true) : undefined}
                  tone={nextTone}
                  statusLabel={copy.dashboard.todayOverdue}
                  emptyLabel={copy.dashboard.nextUpEmpty}
                  action={
                    nextOccurrence?.id && nextOccurrence?.reminder?.id && nextOccurrence?.occur_at
                      ? {
                          occurrenceId: nextOccurrence.id,
                          reminderId: nextOccurrence.reminder.id,
                          occurAt: nextOccurrence.occur_at,
                          label: copy.dashboard.nextUpAction,
                          feedbackLabel: copy.common.actionDone
                        }
                      : null
                  }
                  secondaryLabels={{
                    snooze30: copy.dashboard.nextUpSnooze30,
                    snoozeTomorrow: copy.dashboard.nextUpSnoozeTomorrow
                  }}
                  focusCopy={copy.dashboard.nextUpFocusLine}
                  moreLabel={copy.common.moreActions}
                  onMoreActions={nextOccurrence ? () => setNextActionsOpen(true) : undefined}
                />

                {nextUpActionsSheet}

                <QuickAddBar />

                <AtAGlanceRow
                  metrics={[
                    {
                      id: 'today',
                      label: copy.dashboard.todayTileTitle,
                      count: todayOpenItems.length,
                      subLabel: todayOpenItems.length ? copy.dashboard.todayTileHint : copy.dashboard.todayTileEmpty,
                      tileClass: 'stat-tile-today',
                      icon: SunMedium
                    },
                    {
                      id: 'soon',
                      label: copy.dashboard.soonTileTitle,
                      count: soonItems.length,
                      subLabel: copy.dashboard.soonTileHint,
                      tileClass: 'stat-tile-soon',
                      icon: Calendar
                    },
                    {
                      id: 'meds',
                      label: copy.dashboard.medicationsTileTitle,
                      count: visibleDoses.length,
                      subLabel: nextDoseTileLabel,
                      tileClass: 'stat-tile-meds',
                      icon: Pill
                    },
                    {
                      id: 'overdue',
                      label: copy.dashboard.todayOverdue,
                      count: overdueItems.length,
                      subLabel: overdueOldestLabel,
                      tileClass: overdueTileClass,
                      icon: AlertTriangle
                    }
                  ]}
                  activeId={homeSegment}
                  variant="secondary"
                  onSelect={(id) => {
                    if (id === 'overdue') handleSegmentSelect('overdue');
                    if (id === 'today') handleSegmentSelect('today');
                    if (id === 'soon') handleSegmentSelect('soon');
                  }}
                />

                {!overdueTopItems.length ? null : (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[color:var(--text-0)]">{copy.dashboard.overdueTopTitle}</div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[color:var(--brand-blue)]"
                        onClick={() => setShowRecover((prev: boolean) => !prev)}
                      >
                        {copy.dashboard.overdueTopCta}
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {copy.dashboard.priorityFilters.map((label: string) => (
                        <span key={label} className="home-chip">
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {priorityItems.map((occurrence: any) => (
                        <OverdueDenseRow
                          key={occurrence.id}
                          occurrence={occurrence}
                          locale={locale}
                          googleConnected={googleConnected}
                          userTimeZone={effectiveTimeZone}
                          variant="priority"
                          primaryLabel={copy.dashboard.nextUpAction}
                          secondaryLabel={copy.dashboard.prioritySnooze}
                        />
                      ))}
                    </div>
                  </section>
                )}

                <div id="section-today" aria-hidden="true" />
                <div id="section-soon" aria-hidden="true" />
                <div id="section-overdue" aria-hidden="true" />

                <section id="overdue-list" className="space-y-2">
                  <div className={`flex items-center justify-between text-sm font-semibold text-[color:var(--text-0)] ${
                      sectionFlash === homeSegment ? 'section-focus' : ''
                    }`}>
                    <span>
                      {homeSegment === 'overdue'
                        ? copy.dashboard.todayOverdue
                        : homeSegment === 'soon'
                          ? copy.dashboard.todaySoon
                          : copy.dashboard.todayTitle}
                    </span>
                    <span className="text-xs text-[color:var(--text-2)]">
                      {segmentItems.length} {copy.dashboard.reminderCountLabel}
                    </span>
                  </div>
                  {homeSegment === 'overdue' ? (
                    overdueItems.length ? (
                      <div className="space-y-2">
                        {overdueItems.map((occurrence: any) => (
                          <OverdueDenseRow
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="home-glass-panel rounded-[var(--radius-lg)] p-[var(--space-3)] text-sm text-[color:var(--text-2)]">
                        {copy.dashboard.todayEmpty}
                      </div>
                    )
                  ) : (
                    <FilteredTaskList
                      items={segmentItems}
                      locale={locale}
                      googleConnected={googleConnected}
                      userTimeZone={effectiveTimeZone}
                      emptyLabel={copy.dashboard.todayEmpty}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </section>
  );
}
