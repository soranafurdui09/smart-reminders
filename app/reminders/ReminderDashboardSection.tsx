"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import OccurrenceCard from '@/components/OccurrenceCard';
import ReminderFilterBar from './ReminderFilterBar';
import SegmentedControl from '@/components/filters/SegmentedControl';
import SemanticSearch from '@/components/SemanticSearch';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { messages, type Locale } from '@/lib/i18n';
import {
  diffDaysInTimeZone,
  getMonthKeyInTimeZone,
  interpretAsTimeZone,
  resolveReminderTimeZone
} from '@/lib/dates';
import { inferReminderCategoryId, type ReminderCategoryId } from '@/lib/categories';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import SmartSnoozeMenu from '@/components/SmartSnoozeMenu';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';

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
  done_comment?: string | null;
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

const formatTimeOnly = (
  value: string,
  reminderTimeZone: string | null | undefined,
  userTimeZone: string | null | undefined,
  localeTag: string
) => {
  const resolved = resolveReminderTimeZone(reminderTimeZone ?? null, userTimeZone ?? null);
  const date = resolved && resolved !== 'UTC' ? interpretAsTimeZone(value, resolved) : new Date(value);
  return new Intl.DateTimeFormat(localeTag, { hour: '2-digit', minute: '2-digit' }).format(date);
};

const getUrgencyStyles = (copy: MessageBundle) => ({
  overdue: {
    label: copy.dashboard.todayOverdue,
    className: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  soon: {
    label: copy.dashboard.todaySoon,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-700'
  },
  today: {
    label: copy.dashboard.todayRest,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    later: false
  });

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

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    <section className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-8 lg:col-start-1">
          <div className="space-y-4">
            <SectionHeader title={copy.dashboard.todayTitle} description={copy.dashboard.todaySubtitle} />
            {kindFilter !== 'medications' ? (
              hasToday ? (
                <div className="space-y-6">
                  {todayBuckets.overdue.length ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-700">
                        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
                        {copy.dashboard.todayOverdue}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {todayBuckets.overdue.map((occurrence) => (
                          <OccurrenceCard
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
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-yellow-700">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
                        {copy.dashboard.todaySoon}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {todayBuckets.soon.map((occurrence) => (
                          <OccurrenceCard
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
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                        {copy.dashboard.todayRest}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {todayBuckets.today.map((occurrence) => (
                          <OccurrenceCard
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
                <div className="card text-sm text-muted">{copy.dashboard.todayEmpty}</div>
              )
            ) : null}
          </div>

          {kindFilter !== 'tasks' ? (
            <div className="space-y-4">
              <SectionHeader title={copy.dashboard.medicationsTitle} />
              {visibleDoses.length ? (
                <div className="grid gap-3 md:grid-cols-2">
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
                        : 'border-slate-200 bg-white text-slate-600';
                    return (
                      <div key={dose.id} className="rounded-2xl border border-borderSubtle bg-white/90 p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                              <span aria-hidden="true">💊</span>
                              <span>{details.name || dose.reminder?.title}</span>
                            </div>
                            {details.dose ? (
                              <div className="text-xs text-muted">{details.dose}</div>
                            ) : null}
                            {personLabel ? (
                              <div className="text-xs text-muted">{personLabel}</div>
                            ) : null}
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
                <div className="card text-sm text-muted">{copy.dashboard.medicationsEmpty}</div>
              )}
            </div>
          ) : null}

          {kindFilter !== 'medications' ? (
            <div className="space-y-4">
              <SectionHeader title={copy.dashboard.upcomingTitle} description={copy.dashboard.upcomingSubtitle} />
              {hasUpcoming ? (
                <div className="space-y-6">
                  {upcomingEntries.map(([dayKey, items]) => {
                    const [year, month, day] = dayKey.split('-').map(Number);
                    const dayDate = new Date(year, Math.max(0, month - 1), day);
                    return (
                      <div key={dayKey} className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {dayLabelFormatter.format(dayDate)}
                        </div>
                        <div className="space-y-3 border-l border-borderSubtle pl-4">
                          {items.map((occurrence) => {
                            const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
                            const timeLabel = formatTimeOnly(
                              displayAt,
                              occurrence.reminder?.tz ?? null,
                              effectiveTimeZone,
                              localeTag
                            );
                            return (
                              <div key={occurrence.id} className="relative">
                                <span className="absolute -left-[10px] top-6 h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-borderSubtle bg-white/90 px-4 py-3 shadow-sm">
                                  <div className="space-y-1">
                                    <div className="text-xs font-semibold text-slate-500">{timeLabel}</div>
                                    <div className="text-sm font-semibold text-ink">{occurrence.reminder?.title}</div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <SmartSnoozeMenu
                                      occurrenceId={occurrence.id}
                                      dueAt={displayAt}
                                      title={occurrence.reminder?.title}
                                      notes={occurrence.reminder?.notes}
                                      category={occurrence.reminder?.category}
                                      copy={copy}
                                      snoozeAction={snoozeOccurrence}
                                    />
                                    <details className="group">
                                      <summary className="btn btn-primary dropdown-summary h-9">
                                        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                                          <path
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                        {copy.common.doneAction}
                                      </summary>
                                      <form
                                        action={markDone}
                                        className="mt-3 space-y-2 rounded-2xl border border-borderSubtle bg-surfaceMuted p-3 sm:w-72"
                                      >
                                        <input type="hidden" name="occurrenceId" value={occurrence.id} />
                                        <input type="hidden" name="reminderId" value={occurrence.reminder?.id} />
                                        <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                                        <label className="text-xs font-semibold text-muted">{copy.common.commentOptional}</label>
                                        <textarea
                                          name="done_comment"
                                          rows={2}
                                          className="input"
                                          placeholder={copy.common.commentPlaceholder}
                                          aria-label={copy.common.commentLabel}
                                        />
                                        <ActionSubmitButton
                                          className="btn btn-primary w-full"
                                          type="submit"
                                          data-action-feedback={copy.common.actionDone}
                                        >
                                          {copy.common.doneConfirm}
                                        </ActionSubmitButton>
                                      </form>
                                    </details>
                                    <details className="relative">
                                      <summary
                                        className="btn btn-secondary dropdown-summary h-9 w-9 p-0 text-lg leading-none"
                                        aria-label={copy.common.moreActions}
                                      >
                                        <span aria-hidden="true">...</span>
                                      </summary>
                                      <div className="absolute right-0 z-20 mt-3 w-56 rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft">
                                        {occurrence.reminder?.id ? (
                                          <div className="space-y-1">
                                            <Link
                                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                                              href={`/app/reminders/${occurrence.reminder.id}`}
                                              data-action-close="true"
                                            >
                                              {copy.common.details}
                                            </Link>
                                            <Link
                                              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                                              href={`/app/reminders/${occurrence.reminder.id}/edit`}
                                              data-action-close="true"
                                            >
                                              {copy.common.edit}
                                            </Link>
                                            <form action={cloneReminder}>
                                              <input type="hidden" name="reminderId" value={occurrence.reminder.id} />
                                              <ActionSubmitButton
                                                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                                                type="submit"
                                                data-action-feedback={copy.common.actionCloned}
                                              >
                                                {copy.reminderDetail.clone}
                                              </ActionSubmitButton>
                                            </form>
                                            <details className="mt-2 rounded-lg border border-dashed border-slate-200 p-2 text-xs font-semibold text-slate-700">
                                              <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-slate-400">
                                                {copy.actions.calendar}
                                              </summary>
                                              <div className="mt-2 space-y-1">
                                                <GoogleCalendarSyncButton
                                                  reminderId={occurrence.reminder.id}
                                                  connected={googleConnected}
                                                  variant="menu"
                                                  copy={{
                                                    syncLabel: copy.actions.sendDirect,
                                                    syncLoading: copy.reminderDetail.googleCalendarSyncing,
                                                    syncSuccess: copy.reminderDetail.googleCalendarSyncSuccess,
                                                    syncError: copy.reminderDetail.googleCalendarSyncError,
                                                    connectFirst: copy.reminderDetail.googleCalendarConnectFirst,
                                                    connectLink: copy.reminderDetail.googleCalendarConnectLink
                                                  }}
                                                />
                                                <GoogleCalendarAutoBlockButton
                                                  reminderId={occurrence.reminder.id}
                                                  connected={googleConnected}
                                                  hasDueDate={Boolean(occurrence.reminder.due_at)}
                                                  variant="menu"
                                                  copy={{
                                                    label: copy.actions.schedule,
                                                    loading: copy.reminderDetail.googleCalendarAutoBlocking,
                                                    success: copy.reminderDetail.googleCalendarAutoBlockSuccess,
                                                    error: copy.reminderDetail.googleCalendarAutoBlockError,
                                                    connectHint: copy.reminderDetail.googleCalendarConnectFirst,
                                                    connectLink: copy.reminderDetail.googleCalendarConnectLink,
                                                    missingDueDate: copy.reminderDetail.googleCalendarAutoBlockMissingDueDate,
                                                    confirmIfBusy: copy.reminderDetail.googleCalendarAutoBlockConfirmBusy
                                                  }}
                                                />
                                              </div>
                                            </details>
                                            <GoogleCalendarDeleteDialog
                                              reminderId={occurrence.reminder.id}
                                              hasGoogleEvent={Boolean(occurrence.reminder.google_event_id)}
                                              copy={{
                                                label: copy.common.delete,
                                                dialogTitle: copy.reminderDetail.googleCalendarDeleteTitle,
                                                dialogHint: copy.reminderDetail.googleCalendarDeleteHint,
                                                justReminder: copy.reminderDetail.googleCalendarDeleteOnly,
                                                reminderAndCalendar: copy.reminderDetail.googleCalendarDeleteBoth,
                                                cancel: copy.reminderDetail.googleCalendarDeleteCancel
                                              }}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    </details>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card text-sm text-muted">{copy.dashboard.upcomingEmpty}</div>
              )}
            </div>
          ) : null}

        </div>

        <aside className="space-y-6 lg:col-start-2">
          <div className="rounded-2xl border border-borderSubtle bg-white/80 p-4 shadow-sm">
            <SemanticSearch
              householdId={householdId}
              localeTag={localeTag}
              copy={copy.search}
            />
          </div>
          <div className="rounded-2xl border border-borderSubtle bg-white/80 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {copy.dashboard.filtersTitle}
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => setFiltersOpen((prev) => !prev)}
              >
                {filtersOpen ? copy.common.hide : copy.common.show}
              </button>
            </div>
            {filtersOpen ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.dashboard.filtersTitle}</div>
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
            ) : null}
          </div>
        </aside>

        <div className="space-y-8 lg:col-start-1">
          {kindFilter !== 'medications' ? (
            <div className="space-y-4">
              <SectionHeader title={copy.dashboard.householdTitle} description={copy.dashboard.householdSubtitle} />
              {householdItems.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {householdItems.map((occurrence) => (
                    <OccurrenceCard
                      key={occurrence.id}
                      occurrence={occurrence}
                      locale={locale}
                      googleConnected={googleConnected}
                      userTimeZone={effectiveTimeZone}
                    />
                  ))}
                </div>
              ) : (
                <div className="card text-sm text-muted">{copy.dashboard.householdEmpty}</div>
              )}
            </div>
          ) : null}

          {kindFilter !== 'medications' && hasMonthGroups ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {copy.dashboard.groupNextMonth}
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  onClick={() => toggleSection('later')}
                >
                  {expandedSections.later ? copy.common.hide : copy.common.show}
                </button>
              </div>
              {expandedSections.later ? (
                <div className="space-y-6">
                  {visibleMonthEntries.map(([monthKey, items]) => {
                    const [year, month] = monthKey.split('-').map(Number);
                    const labelDate = new Date(year, Math.max(0, month - 1), 1);
                    return (
                      <div key={monthKey} className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {monthLabelFormatter.format(labelDate)}
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {items.map((occurrence) => (
                            <OccurrenceCard
                              key={occurrence.id}
                              occurrence={occurrence}
                              locale={locale}
                              googleConnected={googleConnected}
                              userTimeZone={effectiveTimeZone}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {hasMoreMonths ? (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setVisibleMonthGroups((prev) => prev + 2)}
                      >
                        {copy.dashboard.viewMoreMonths}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
