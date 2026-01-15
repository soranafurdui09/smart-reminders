"use client";

import { useEffect, useMemo, useState } from 'react';
import SemanticSearch from '@/components/SemanticSearch';
import ReminderFilterBar from './ReminderFilterBar';
import SegmentedControl from '@/components/filters/SegmentedControl';
import ReminderCard from '@/components/dashboard/ReminderCard';
import { messages, type Locale } from '@/lib/i18n';
import {
  diffDaysInTimeZone,
  getMonthKeyInTimeZone,
  interpretAsTimeZone,
  resolveReminderTimeZone
} from '@/lib/dates';
import { inferReminderCategoryId, type ReminderCategoryId } from '@/lib/categories';

type CreatedByOption = 'all' | 'me' | 'others';
type AssignmentOption = 'all' | 'assigned_to_me';
type CategoryOption = 'all' | ReminderCategoryId;

type OccurrencePayload = {
  id: string;
  occur_at: string;
  snoozed_until?: string | null;
  status: string;
  reminder?: {
    id?: string;
    title?: string;
    due_at?: string | null;
    created_by?: string | null;
    assigned_member_id?: string | null;
    is_active?: boolean;
    notes?: string | null;
    google_event_id?: string | null;
    assigned_member_label?: string | null;
    kind?: string | null;
    category?: string | null;
    medication_details?: any;
    tz?: string | null;
  } | null;
  performed_by?: string | null;
  performed_by_label?: string | null;
  effective_at?: string;
};

type MedicationDose = {
  id: string;
  scheduled_at: string;
  status: string;
  skipped_reason?: string | null;
  taken_at?: string | null;
  reminder?: {
    id?: string;
    title?: string;
    medication_details?: any;
    created_by?: string | null;
  } | null;
};

type MessageBundle = typeof messages[Locale];

type Props = {
  occurrences: OccurrencePayload[];
  copy: MessageBundle;
  membershipId: string;
  userId: string;
  googleConnected: boolean;
  medicationDoses: MedicationDose[];
  memberLabels: Record<string, string>;
  householdId: string;
  initialCreatedBy?: CreatedByOption;
  initialAssignment?: AssignmentOption;
  locale: Locale;
  localeTag: string;
  userTimeZone?: string;
};

const CreatedOptions: CreatedByOption[] = ['all', 'me', 'others'];
const AssignmentOptions: AssignmentOption[] = ['all', 'assigned_to_me'];

const getDayKey = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
};

const getCompareDate = (occurrence: OccurrencePayload, timeZone: string) => {
  const rawDate = occurrence.effective_at ?? occurrence.occur_at;
  const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, timeZone);
  if (occurrence.snoozed_until) {
    return new Date(rawDate);
  }
  if (reminderTimeZone && reminderTimeZone !== 'UTC') {
    return interpretAsTimeZone(rawDate, reminderTimeZone);
  }
  return new Date(rawDate);
};

const getUrgencyStyles = (copy: MessageBundle) => ({
  overdue: {
    label: copy.dashboard.todayOverdue,
    stripClass: 'bg-red-500',
    badgeClass: 'border-red-200 bg-red-50 text-red-700'
  },
  soon: {
    label: copy.dashboard.todaySoon,
    stripClass: 'bg-amber-500',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  today: {
    label: copy.dashboard.todayRest,
    stripClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  upcoming: {
    label: copy.dashboard.upcomingTitle,
    stripClass: 'bg-sky-500',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-700'
  },
  scheduled: {
    label: copy.common.statusOpen,
    stripClass: 'bg-slate-300',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-600'
  }
});

export default function ReminderDashboardSection({
  occurrences,
  copy,
  membershipId,
  userId,
  googleConnected,
  medicationDoses,
  memberLabels,
  householdId,
  initialCreatedBy = 'all',
  initialAssignment = 'all',
  locale,
  localeTag,
  userTimeZone
}: Props) {
  const [createdBy, setCreatedBy] = useState<CreatedByOption>(initialCreatedBy);
  const [assignment, setAssignment] = useState<AssignmentOption>(initialAssignment);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<'all' | 'tasks' | 'medications'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryOption>('all');
  const [doseState, setDoseState] = useState<MedicationDose[]>(medicationDoses);
  const [visibleMonthGroups, setVisibleMonthGroups] = useState(2);

  const filteredOccurrences = useMemo(() => {
    const normalized = occurrences
      .filter((occurrence) => occurrence.reminder?.is_active ?? true)
      .filter((occurrence) => {
        const reminder = occurrence.reminder ?? null;
        if (kindFilter === 'tasks' && occurrence.reminder?.kind === 'medication') {
          return false;
        }
        if (kindFilter === 'medications') {
          return false;
        }
        if (createdBy === 'me' && occurrence.reminder?.created_by !== userId) {
          return false;
        }
        if (createdBy === 'others' && occurrence.reminder?.created_by === userId) {
          return false;
        }
        if (assignment === 'assigned_to_me' && occurrence.reminder?.assigned_member_id !== membershipId) {
          return false;
        }
        if (categoryFilter !== 'all') {
          const categoryId = inferReminderCategoryId({
            title: reminder?.title,
            notes: reminder?.notes,
            kind: reminder?.kind,
            category: reminder?.category,
            medicationDetails: reminder?.medication_details
          });
          if (categoryId !== categoryFilter) {
            return false;
          }
        }
        return true;
      })
      .map((occurrence) => ({
        ...occurrence,
        effective_at: occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at
      }))
      .sort((a, b) => new Date(a.effective_at ?? a.occur_at).getTime() - new Date(b.effective_at ?? b.occur_at).getTime());
    return normalized;
  }, [occurrences, createdBy, assignment, membershipId, userId, kindFilter, categoryFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (kindFilter !== 'all') count += 1;
    if (createdBy !== 'all') count += 1;
    if (assignment !== 'all') count += 1;
    if (categoryFilter !== 'all') count += 1;
    return count;
  }, [assignment, categoryFilter, createdBy, kindFilter]);

  const effectiveTimeZone = userTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const urgencyStyles = useMemo(() => getUrgencyStyles(copy), [copy]);

  const grouped = useMemo(() => {
    const now = new Date();
    const soonCutoff = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayBuckets: Record<'overdue' | 'soon' | 'today', OccurrencePayload[]> = {
      overdue: [],
      soon: [],
      today: []
    };
    const upcomingByDay = new Map<string, OccurrencePayload[]>();
    const monthBuckets = new Map<string, OccurrencePayload[]>();

    filteredOccurrences.forEach((occurrence) => {
      const compareDate = getCompareDate(occurrence, effectiveTimeZone);
      if (Number.isNaN(compareDate.getTime())) {
        return;
      }
      const dayDiff = diffDaysInTimeZone(compareDate, now, effectiveTimeZone);
      if (dayDiff <= 0) {
        if (compareDate.getTime() < now.getTime()) {
          todayBuckets.overdue.push(occurrence);
        } else if (compareDate.getTime() <= soonCutoff.getTime()) {
          todayBuckets.soon.push(occurrence);
        } else {
          todayBuckets.today.push(occurrence);
        }
        return;
      }
      if (dayDiff <= 7) {
        const key = getDayKey(compareDate, effectiveTimeZone);
        const existing = upcomingByDay.get(key) ?? [];
        existing.push(occurrence);
        upcomingByDay.set(key, existing);
        return;
      }
      const monthKey = getMonthKeyInTimeZone(compareDate, effectiveTimeZone);
      const existing = monthBuckets.get(monthKey) ?? [];
      existing.push(occurrence);
      monthBuckets.set(monthKey, existing);
    });

    const monthEntries = Array.from(monthBuckets.entries()).sort(([a], [b]) => a.localeCompare(b));
    const upcomingEntries = Array.from(upcomingByDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { todayBuckets, upcomingEntries, monthEntries };
  }, [effectiveTimeZone, filteredOccurrences]);

  const todayBuckets = grouped.todayBuckets;
  const hasToday = todayBuckets.overdue.length + todayBuckets.soon.length + todayBuckets.today.length > 0;
  const upcomingEntries = grouped.upcomingEntries;
  const hasUpcoming = upcomingEntries.length > 0;
  const monthEntries = grouped.monthEntries;
  const hasMonthGroups = monthEntries.length > 0;
  const visibleMonthEntries = monthEntries.slice(0, visibleMonthGroups);
  const hasMoreMonths = monthEntries.length > visibleMonthGroups;
  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }),
    [localeTag]
  );
  const dayLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { weekday: 'short', day: 'numeric', month: 'short' }),
    [localeTag]
  );

  const householdItems = useMemo(
    () =>
      filteredOccurrences.filter((occurrence) => {
        const reminder = occurrence.reminder;
        if (!reminder) return false;
        const assignedId = reminder.assigned_member_id;
        const createdByUser = reminder.created_by;
        return (createdByUser && createdByUser !== userId) || (assignedId && assignedId !== membershipId);
      }),
    [filteredOccurrences, membershipId, userId]
  );

  const visibleDoses = useMemo(
    () => doseState.filter((dose) => dose.status === 'pending').slice(0, 5),
    [doseState]
  );

  const handleDoseStatus = async (doseId: string, status: 'taken' | 'skipped', skippedReason?: string) => {
    try {
      const response = await fetch(`/api/medications/dose/${doseId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, skippedReason })
      });
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => null);
      if (!payload?.dose) {
        return;
      }
      setDoseState((prev) =>
        prev.map((dose) =>
          dose.id === doseId
            ? { ...dose, status: payload.dose.status, skipped_reason: payload.dose.skipped_reason, taken_at: payload.dose.taken_at }
            : dose
        )
      );
    } catch (error) {
      console.error('[medication] update dose failed', error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setFiltersOpen(true);
    }
  }, []);

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] md:gap-8">
        <aside className="order-1 space-y-4 lg:order-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
            <SemanticSearch householdId={householdId} localeTag={localeTag} copy={copy.search} />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.dashboard.filtersTitle}</div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 md:hidden"
                  onClick={() => setFiltersOpen((prev) => !prev)}
                >
                  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 6h16M7 12h10M10 18h4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {copy.dashboard.filtersTitle}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
              </div>
              <div className={`${filtersOpen ? 'block' : 'hidden md:block'} space-y-4`}>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.dashboard.filtersKindLabel}</div>
                  <SegmentedControl
                    options={[
                      { value: 'all', label: copy.dashboard.filtersKindAll },
                      { value: 'tasks', label: copy.dashboard.filtersKindTasks },
                      { value: 'medications', label: copy.dashboard.filtersKindMeds }
                    ]}
                    value={kindFilter}
                    onChange={(value) => setKindFilter(value as typeof kindFilter)}
                    className="mt-2"
                  />
                </div>
                <ReminderFilterBar
                  createdBy={createdBy}
                  assignment={assignment}
                  category={categoryFilter}
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
                  showHeader={false}
                  className="border-0 bg-transparent px-0 py-0 shadow-none"
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="order-2 space-y-6 lg:order-1">
          {kindFilter !== 'medications' ? (
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg aria-hidden="true" className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{copy.dashboard.todayTitle}</h2>
                </div>
              </header>
              {hasToday ? (
                <div className="space-y-5">
                  {todayBuckets.overdue.length ? (
                    <div className="space-y-3">
                      <header className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-700">
                          <svg aria-hidden="true" className="h-4 w-4 text-red-500" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            />
                            <path d="M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          {copy.dashboard.todayOverdue}
                        </div>
                        <span className="text-xs text-slate-500">
                          {todayBuckets.overdue.length} {copy.dashboard.reminderCountLabel}
                        </span>
                      </header>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {todayBuckets.overdue.map((occurrence) => (
                          <ReminderCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                            urgency={urgencyStyles.overdue}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {todayBuckets.soon.length ? (
                    <div className="space-y-3">
                      <header className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-700">
                          <svg aria-hidden="true" className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none">
                            <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          {copy.dashboard.todaySoon}
                        </div>
                        <span className="text-xs text-slate-500">
                          {todayBuckets.soon.length} {copy.dashboard.reminderCountLabel}
                        </span>
                      </header>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {todayBuckets.soon.map((occurrence) => (
                          <ReminderCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                            urgency={urgencyStyles.soon}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {todayBuckets.today.length ? (
                    <div className="space-y-3">
                      <header className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-700">
                          <svg aria-hidden="true" className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                          {copy.dashboard.todayRest}
                        </div>
                        <span className="text-xs text-slate-500">
                          {todayBuckets.today.length} {copy.dashboard.reminderCountLabel}
                        </span>
                      </header>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {todayBuckets.today.map((occurrence) => (
                          <ReminderCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                            urgency={urgencyStyles.today}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  {copy.dashboard.todayEmpty}
                </div>
              )}
            </section>
          ) : null}

          {kindFilter !== 'tasks' ? (
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg aria-hidden="true" className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                    <path d="M10 2l8 8-8 8-8-8 8-8z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 2v20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{copy.dashboard.medicationsTitle}</h2>
                </div>
                {visibleDoses.length ? (
                  <span className="text-xs text-slate-500">
                    {visibleDoses.length} {copy.dashboard.doseCountLabel}
                  </span>
                ) : null}
              </header>
              {visibleDoses.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {visibleDoses.map((dose) => {
                    const details = dose.reminder?.medication_details || {};
                    const personLabel = details.personId ? memberLabels[details.personId] : null;
                    const statusLabel = dose.status === 'taken'
                      ? copy.dashboard.medicationsTaken
                      : dose.status === 'skipped'
                        ? copy.dashboard.medicationsSkipped
                        : copy.common.statusOpen;
                    const statusClass = dose.status === 'taken'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : dose.status === 'skipped'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600';
                    return (
                      <div key={dose.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <svg aria-hidden="true" className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M6.5 17.5l11-11a4 4 0 00-5.66-5.66l-11 11a4 4 0 105.66 5.66z"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                />
                                <path d="M8 16l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                              <span>{details.name || dose.reminder?.title}</span>
                            </div>
                            {details.dose ? <div className="text-xs text-slate-500">{details.dose}</div> : null}
                            {personLabel ? <div className="text-xs text-slate-500">{personLabel}</div> : null}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs font-semibold text-slate-500">
                              {new Date(dose.scheduled_at).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-primary h-8 px-3 text-xs"
                            onClick={() => handleDoseStatus(dose.id, 'taken')}
                          >
                            {copy.dashboard.medicationsTaken}
                          </button>
                          <details className="relative">
                            <summary className="btn btn-secondary h-8 px-3 text-xs">...</summary>
                            <div className="absolute left-0 z-20 mt-2 w-48 rounded-xl border border-borderSubtle bg-surface p-2 shadow-soft">
                              <button
                                type="button"
                                className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surfaceMuted"
                                onClick={() => handleDoseStatus(dose.id, 'skipped')}
                              >
                                {copy.dashboard.medicationsSkip}
                              </button>
                              {[copy.dashboard.medicationsReasonForgot, copy.dashboard.medicationsReasonNoStock].map((reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-slate-500 hover:bg-surfaceMuted"
                                  onClick={() => handleDoseStatus(dose.id, 'skipped', reason)}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  {copy.dashboard.medicationsEmpty}
                </div>
              )}
            </section>
          ) : null}

          {kindFilter !== 'medications' ? (
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg aria-hidden="true" className="h-4 w-4 text-sky-500" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{copy.dashboard.upcomingTitle}</h2>
                </div>
              </header>
              {hasUpcoming ? (
                <div className="space-y-5">
                  {upcomingEntries.map(([dayKey, items]) => {
                    const [year, month, day] = dayKey.split('-').map(Number);
                    const dayDate = new Date(year, Math.max(0, month - 1), day);
                    return (
                      <div key={dayKey} className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {dayLabelFormatter.format(dayDate)}
                        </div>
                        <div className="space-y-3">
                          {items.map((occurrence) => (
                            <ReminderCard
                              key={occurrence.id}
                              occurrence={occurrence}
                              locale={locale}
                              googleConnected={googleConnected}
                              userTimeZone={effectiveTimeZone}
                              urgency={urgencyStyles.upcoming}
                              variant="row"
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  {copy.dashboard.upcomingEmpty}
                </div>
              )}
            </section>
          ) : null}

          {kindFilter !== 'medications' ? (
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg aria-hidden="true" className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5s-3 1.34-3 3 1.34 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45v2h6v-2c0-2.66-4-3.5-7-3.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{copy.dashboard.householdTitle}</h2>
                </div>
              </header>
              {householdItems.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {householdItems.map((occurrence) => (
                    <ReminderCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      locale={locale}
                      googleConnected={googleConnected}
                      userTimeZone={effectiveTimeZone}
                      urgency={urgencyStyles.scheduled}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  {copy.dashboard.householdEmpty}
                </div>
              )}
            </section>
          ) : null}

          {kindFilter !== 'medications' && hasMonthGroups ? (
            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg aria-hidden="true" className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-900">{copy.dashboard.groupNextMonth}</h2>
                </div>
                {hasMoreMonths ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    onClick={() => setVisibleMonthGroups((prev) => prev + 2)}
                  >
                    {copy.dashboard.viewMoreMonths}
                  </button>
                ) : null}
              </header>
              <div className="space-y-5">
                {visibleMonthEntries.map(([monthKey, items]) => {
                  const [year, month] = monthKey.split('-').map(Number);
                  const labelDate = new Date(year, Math.max(0, month - 1), 1);
                  return (
                    <div key={monthKey} className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {monthLabelFormatter.format(labelDate)}
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {items.map((occurrence) => (
                          <ReminderCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                            urgency={urgencyStyles.scheduled}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
