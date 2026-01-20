"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, Pill, SunMedium, Users } from 'lucide-react';
import SemanticSearch from '@/components/SemanticSearch';
import ReminderFiltersPanel from '@/components/dashboard/ReminderFiltersPanel';
import ReminderCard from '@/components/dashboard/ReminderCard';
import { messages, type Locale } from '@/lib/i18n';
import {
  diffDaysInTimeZone,
  coerceDateForTimeZone,
  formatReminderDateTime,
  getMonthKeyInTimeZone,
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
  return coerceDateForTimeZone(rawDate, reminderTimeZone);
};

const getUrgencyStyles = (copy: MessageBundle) => ({
  overdue: {
    key: 'overdue' as const,
    label: copy.dashboard.todayOverdue
  },
  soon: {
    key: 'soon' as const,
    label: copy.dashboard.todaySoon
  },
  today: {
    key: 'today' as const,
    label: copy.dashboard.todayRest
  },
  upcoming: {
    key: 'upcoming' as const,
    label: copy.dashboard.upcomingTitle
  },
  scheduled: {
    key: 'upcoming' as const,
    label: copy.common.statusOpen
  }
});

const SectionHeading = ({
  label,
  icon,
  countLabel
}: {
  label: string;
  icon?: React.ReactNode;
  countLabel?: string;
}) => (
  <div className="flex items-center gap-3">
    <span className="h-px flex-1 bg-slate-200" />
    <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
      {icon}
      <span>{label}</span>
      {countLabel ? (
        <span className="text-[11px] font-semibold text-slate-500 normal-case">{countLabel}</span>
      ) : null}
    </span>
    <span className="h-px flex-1 bg-slate-200" />
  </div>
);

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
  const [kindFilter, setKindFilter] = useState<'all' | 'tasks' | 'medications'>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryOption>('all');
  const [doseState, setDoseState] = useState<MedicationDose[]>(medicationDoses);
  const [visibleMonthGroups, setVisibleMonthGroups] = useState(2);
  const [showOverdue, setShowOverdue] = useState(false);
  const [showToday, setShowToday] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      const rawDate = occurrence.effective_at ?? occurrence.occur_at;
      const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
      const compareDate = occurrence.snoozed_until
        ? new Date(rawDate)
        : coerceDateForTimeZone(rawDate, reminderTimeZone);
      if (Number.isNaN(compareDate.getTime())) {
        return;
      }
      const bucketTimeZone = reminderTimeZone || effectiveTimeZone;
      const dayDiff = diffDaysInTimeZone(compareDate, now, bucketTimeZone);
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
        const key = getDayKey(compareDate, bucketTimeZone);
        const existing = upcomingByDay.get(key) ?? [];
        existing.push(occurrence);
        upcomingByDay.set(key, existing);
        return;
      }
      const monthKey = getMonthKeyInTimeZone(compareDate, bucketTimeZone);
      const existing = monthBuckets.get(monthKey) ?? [];
      existing.push(occurrence);
      monthBuckets.set(monthKey, existing);
    });

    const monthEntries = Array.from(monthBuckets.entries()).sort(([a], [b]) => a.localeCompare(b));
    const upcomingEntries = Array.from(upcomingByDay.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { todayBuckets, upcomingEntries, monthEntries };
  }, [effectiveTimeZone, filteredOccurrences]);

  const todayBuckets = grouped.todayBuckets;
  const todayItems = [...todayBuckets.soon, ...todayBuckets.today];
  const hasToday = todayBuckets.overdue.length + todayItems.length > 0;
  const upcomingEntries = grouped.upcomingEntries;
  const hasUpcoming = upcomingEntries.length > 0;
  const monthEntries = grouped.monthEntries;
  const hasMonthGroups = monthEntries.length > 0;
  const visibleMonthEntries = monthEntries.slice(0, visibleMonthGroups);
  const hasMoreMonths = monthEntries.length > visibleMonthGroups;
  const previewMonthEntry = monthEntries[0];
  const previewMonthItems = previewMonthEntry?.[1]?.slice(0, 3) ?? [];
  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }),
    [localeTag]
  );
  const dayLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { weekday: 'short', day: 'numeric', month: 'short' }),
    [localeTag]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (autoExpanded) return;
    if (isMobile) {
      if (todayItems.length) {
        setShowToday(true);
      }
      setShowOverdue(false);
      setShowUpcoming(false);
      setAutoExpanded(true);
      return;
    }
    if (hasToday) {
      if (todayBuckets.overdue.length) {
        setShowOverdue(true);
      } else if (todayItems.length) {
        setShowToday(true);
      }
      setAutoExpanded(true);
      return;
    }
    if (hasUpcoming) {
      setShowUpcoming(true);
      setAutoExpanded(true);
    }
  }, [
    autoExpanded,
    hasToday,
    hasUpcoming,
    isMobile,
    todayBuckets.overdue.length,
    todayItems.length
  ]);

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

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] md:gap-8">
        <aside className="order-1 space-y-4 lg:order-2">
          <div className="rounded-3xl border border-gray-300 bg-white p-4 shadow-sm md:p-5">
            <SemanticSearch householdId={householdId} localeTag={localeTag} copy={copy.search} />
            <div className="mt-4">
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
          </div>
        </aside>

        <div className="order-2 space-y-6 lg:order-1">
          <div className="h-px bg-slate-200/70" />
          {kindFilter !== 'medications' ? (
            <section className="mt-8 space-y-5">
              <SectionHeading
                label={copy.dashboard.todayTitle}
                icon={<SunMedium className="h-4 w-4 text-amber-500" aria-hidden="true" />}
              />

              {todayBuckets.overdue.length ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setShowOverdue((prev) => !prev)}
                    aria-expanded={showOverdue}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-700">
                      <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
                      {copy.dashboard.todayOverdue}
                    </div>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {todayBuckets.overdue.length} {copy.dashboard.reminderCountLabel}
                      <svg
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition ${showOverdue ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 7l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {showOverdue ? (
                    <div className="grid gap-3 list-optimized">
                      {todayBuckets.overdue.map((occurrence) => (
                        <ReminderCard
                          key={occurrence.id}
                          occurrence={occurrence}
                          locale={locale}
                          googleConnected={googleConnected}
                          userTimeZone={effectiveTimeZone}
                          urgency={urgencyStyles.overdue}
                          variant="row"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {todayItems.length ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between"
                    onClick={() => setShowToday((prev) => !prev)}
                    aria-expanded={showToday}
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-700">
                      <SunMedium className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                      {copy.dashboard.todayRest}
                    </div>
                    <span className="flex items-center gap-2 text-xs text-slate-500">
                      {todayItems.length} {copy.dashboard.reminderCountLabel}
                      <svg
                        aria-hidden="true"
                        className={`h-3.5 w-3.5 transition ${showToday ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M5 7l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {showToday ? (
                    <div className="grid gap-3 list-optimized">
                      {todayItems.map((occurrence) => {
                        const compareDate = getCompareDate(occurrence, effectiveTimeZone);
                        const urgency = compareDate.getTime() <= new Date().getTime() + 2 * 60 * 60 * 1000
                          ? urgencyStyles.soon
                          : urgencyStyles.today;
                        return (
                          <ReminderCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                            urgency={urgency}
                            variant="row"
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                !todayBuckets.overdue.length ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                    {copy.dashboard.todayEmpty}
                  </div>
                ) : null
              )}
            </section>
          ) : null}

          {kindFilter !== 'tasks' ? (
            <section className="mt-8 space-y-4">
              <SectionHeading
                label={copy.dashboard.medicationsTitle}
                icon={<Pill className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
                countLabel={
                  visibleDoses.length
                    ? `${visibleDoses.length} ${copy.dashboard.doseCountLabel}`
                    : undefined
                }
              />
              {visibleDoses.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
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
                            <div className="absolute right-0 z-[1000] mt-2 w-48 max-h-[60vh] overflow-y-auto rounded-xl border border-borderSubtle bg-surface p-2 shadow-soft">
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
            <section className="mt-8 space-y-4">
              <button
                type="button"
                className="flex w-full items-center gap-3"
                onClick={() => setShowUpcoming((prev) => !prev)}
                aria-expanded={showUpcoming}
              >
                <span className="h-px flex-1 bg-slate-200" />
                <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <Calendar className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  <span>{copy.dashboard.upcomingTitle}</span>
                  <span className="text-[11px] font-semibold text-slate-500 normal-case">
                    {hasUpcoming ? upcomingEntries.length : 0} {copy.dashboard.reminderCountLabel}
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition ${showUpcoming ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M5 7l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </button>
              {showUpcoming ? (
                hasUpcoming ? (
                  <div className="space-y-5">
                    {upcomingEntries.map(([dayKey, items]) => {
                      const [year, month, day] = dayKey.split('-').map(Number);
                      const dayDate = new Date(year, Math.max(0, month - 1), day);
                      return (
                        <div key={dayKey} className="space-y-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {dayLabelFormatter.format(dayDate)}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
                            {items.map((occurrence) => (
                              <ReminderCard
                                key={occurrence.id}
                                occurrence={occurrence}
                                locale={locale}
                                googleConnected={googleConnected}
                                userTimeZone={effectiveTimeZone}
                                urgency={urgencyStyles.upcoming}
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
                )
              ) : null}
            </section>
          ) : null}

          {kindFilter !== 'medications' ? (
            <section className="mt-8 space-y-4">
              <SectionHeading
                label={copy.dashboard.householdTitle}
                icon={<Users className="h-4 w-4 text-purple-500" aria-hidden="true" />}
              />
              {householdItems.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
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
            <section className="mt-8 space-y-4">
              <button
                type="button"
                className="flex w-full items-center gap-3"
                onClick={() => setShowMonths((prev) => !prev)}
                aria-expanded={showMonths}
              >
                <span className="h-px flex-1 bg-slate-200" />
                <span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <Calendar className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{copy.dashboard.groupNextMonth}</span>
                  <span className="text-[11px] font-semibold text-slate-500 normal-case">
                    {visibleMonthEntries.length} {copy.dashboard.reminderCountLabel}
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 transition ${showMonths ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M5 7l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </button>
              {showMonths ? (
                <>
                  {hasMoreMonths ? (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        onClick={() => setVisibleMonthGroups((prev) => prev + 2)}
                      >
                        {copy.dashboard.viewMoreMonths}
                      </button>
                    </div>
                  ) : null}
                  <div className="space-y-5">
                    {visibleMonthEntries.map(([monthKey, items]) => {
                      const [year, month] = monthKey.split('-').map(Number);
                      const labelDate = new Date(year, Math.max(0, month - 1), 1);
                      return (
                        <div key={monthKey} className="space-y-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {monthLabelFormatter.format(labelDate)}
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 list-optimized">
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
                </>
              ) : (
                <div className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
                  {previewMonthEntry ? (
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {monthLabelFormatter.format(new Date(Number(previewMonthEntry[0].split('-')[0]), Math.max(0, Number(previewMonthEntry[0].split('-')[1]) - 1), 1))}
                      </div>
                      <div className="space-y-2">
                        {previewMonthItems.map((occurrence) => {
                          const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
                          const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
                          return (
                            <div key={occurrence.id} className="flex items-center justify-between text-xs text-slate-500">
                              <span className="truncate">{occurrence.reminder?.title ?? copy.dashboard.nextTitle}</span>
                              <span className="whitespace-nowrap text-slate-400">
                                {formatReminderDateTime(displayAt, reminderTimeZone, effectiveTimeZone)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                        onClick={() => setShowMonths(true)}
                      >
                        {copy.dashboard.viewMoreMonths}
                      </button>
                    </div>
                  ) : (
                    <div>{copy.dashboard.upcomingEmpty}</div>
                  )}
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
