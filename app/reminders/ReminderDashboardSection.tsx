"use client";

import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import OccurrenceCard from '@/components/OccurrenceCard';
import ReminderFilterBar from './ReminderFilterBar';
import SegmentedControl from '@/components/filters/SegmentedControl';
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
  initialCreatedBy?: CreatedByOption;
  initialAssignment?: AssignmentOption;
  locale: Locale;
  localeTag: string;
  userTimeZone?: string;
};

const groupLabels = (copy: MessageBundle) => ({
  today: copy.dashboard.groupToday,
  tomorrow: copy.dashboard.groupTomorrow,
  nextWeek: copy.dashboard.groupNextWeek,
  nextMonth: copy.dashboard.groupNextMonth
});

const CreatedOptions: CreatedByOption[] = ['all', 'me', 'others'];
const AssignmentOptions: AssignmentOption[] = ['all', 'assigned_to_me'];

export default function ReminderDashboardSection({
  occurrences,
  copy,
  membershipId,
  userId,
  googleConnected,
  medicationDoses,
  memberLabels,
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
    tomorrow: true,
    nextWeek: false,
    nextMonth: false
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
    if (createdBy !== 'all') count += 1;
    if (assignment !== 'all') count += 1;
    if (categoryFilter !== 'all') count += 1;
    return count;
  }, [assignment, categoryFilter, createdBy]);

  const effectiveTimeZone = userTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const grouped = useMemo(() => {
    const now = new Date();

    const sections: Record<string, OccurrencePayload[]> = {
      today: [],
      tomorrow: [],
      nextWeek: [],
      nextMonth: []
    };
    const monthBuckets = new Map<string, OccurrencePayload[]>();

    filteredOccurrences.forEach((occurrence) => {
      const rawDate = occurrence.effective_at ?? occurrence.occur_at;
      const reminderTimeZone = resolveReminderTimeZone(occurrence.reminder?.tz ?? null, effectiveTimeZone);
      const compareDate = occurrence.snoozed_until
        ? new Date(rawDate)
        : reminderTimeZone && reminderTimeZone !== 'UTC'
          ? interpretAsTimeZone(rawDate, reminderTimeZone)
          : new Date(rawDate);
      if (Number.isNaN(compareDate.getTime())) {
        return;
      }
      const dayDiff = diffDaysInTimeZone(compareDate, now, effectiveTimeZone);
      if (dayDiff < 0) {
        return;
      }
      if (dayDiff === 0) {
        sections.today.push(occurrence);
        return;
      }
      if (dayDiff === 1) {
        sections.tomorrow.push(occurrence);
        return;
      }
      if (dayDiff <= 7) {
        sections.nextWeek.push(occurrence);
        return;
      }
      if (dayDiff <= 30) {
        sections.nextMonth.push(occurrence);
        return;
      }
      const monthKey = getMonthKeyInTimeZone(compareDate, effectiveTimeZone);
      const existing = monthBuckets.get(monthKey) ?? [];
      existing.push(occurrence);
      monthBuckets.set(monthKey, existing);
    });

    const monthEntries = Array.from(monthBuckets.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { sections, monthEntries };
  }, [effectiveTimeZone, filteredOccurrences]);

  const labels = groupLabels(copy);
  const todayItems = grouped.sections.today;
  const upcomingSections = [
    { key: 'tomorrow', label: labels.tomorrow, items: grouped.sections.tomorrow },
    { key: 'nextWeek', label: labels.nextWeek, items: grouped.sections.nextWeek },
    { key: 'nextMonth', label: labels.nextMonth, items: grouped.sections.nextMonth }
  ];
  const upcomingCount = upcomingSections.reduce((sum, section) => sum + section.items.length, 0) +
    grouped.monthEntries.reduce((sum, [, items]) => sum + items.length, 0);
  const hasUpcoming = upcomingCount > 0;
  const hasMonthGroups = grouped.monthEntries.length > 0;
  const visibleMonthEntries = grouped.monthEntries.slice(0, visibleMonthGroups);
  const hasMoreMonths = grouped.monthEntries.length > visibleMonthGroups;
  const monthLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }),
    [localeTag]
  );
  const householdItems = useMemo(
    () =>
      filteredOccurrences.filter((occurrence) => {
        const reminder = occurrence.reminder;
        if (!reminder) return false;
        const assignedId = reminder.assigned_member_id;
        const createdBy = reminder.created_by;
        return (createdBy && createdBy !== userId) || (assignedId && assignedId !== membershipId);
      }),
    [filteredOccurrences, membershipId, userId]
  );

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
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
    <section className="space-y-8">
      <SectionHeader title={copy.dashboard.sectionTitle} description={copy.dashboard.sectionSubtitle} />
      <SegmentedControl
        options={[
          { value: 'all', label: copy.dashboard.filtersKindAll },
          { value: 'tasks', label: copy.dashboard.filtersKindTasks },
          { value: 'medications', label: copy.dashboard.filtersKindMeds }
        ]}
        value={kindFilter}
        onChange={(value) => setKindFilter(value as typeof kindFilter)}
      />
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
        />
      ) : null}
      {kindFilter !== 'medications' ? (
        <div className="space-y-4">
          <SectionHeader title={copy.dashboard.todayTitle} description={copy.dashboard.todaySubtitle} />
          {todayItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {todayItems.map((occurrence) => (
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
            <div className="card text-sm text-muted">{copy.dashboard.todayEmpty}</div>
          )}
        </div>
      ) : null}

      {kindFilter !== 'tasks' ? (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.dashboard.medicationsTitle}</div>
          {visibleDoses.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleDoses.map((dose) => {
                const details = dose.reminder?.medication_details || {};
                const personLabel = details.personId ? memberLabels[details.personId] : null;
                return (
                  <div key={dose.id} className="card space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-ink">{details.name || dose.reminder?.title}</div>
                        {details.dose ? (
                          <div className="text-xs text-muted">{details.dose}</div>
                        ) : null}
                        {personLabel ? (
                          <div className="text-xs text-muted">{personLabel}</div>
                        ) : null}
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {new Date(dose.scheduled_at).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
              {upcomingSections.map((section) =>
                section.items.length ? (
                  <div key={section.key} className="space-y-3">
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted hover:text-slate-700"
                        aria-expanded={expandedSections[section.key] ?? false}
                        aria-label={expandedSections[section.key] ? copy.common.hide : copy.common.show}
                      >
                        <svg
                          aria-hidden="true"
                          className={`h-3.5 w-3.5 transition ${expandedSections[section.key] ? 'rotate-90' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M7 5l6 5-6 5V5z" />
                        </svg>
                        <span>{section.label}</span>
                        <span className="text-[10px] font-semibold text-slate-400">({section.items.length})</span>
                      </button>
                      <span className="h-px flex-1 bg-borderSubtle" />
                    </div>
                    {expandedSections[section.key] ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {section.items.map((occurrence) => (
                          <OccurrenceCard
                            key={occurrence.id}
                            occurrence={occurrence}
                            locale={locale}
                            googleConnected={googleConnected}
                            userTimeZone={effectiveTimeZone}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null
              )}
              {hasMonthGroups ? (
                <div className="space-y-6">
                  {visibleMonthEntries.map(([monthKey, items]) => {
                    const [year, month] = monthKey.split('-').map(Number);
                    const labelDate = new Date(year, Math.max(0, month - 1), 1);
                    const sectionKey = `month:${monthKey}`;
                    const isExpanded = expandedSections[sectionKey] ?? false;
                    return (
                      <div key={monthKey} className="space-y-3">
                        <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted">
                          <button
                            type="button"
                            onClick={() => toggleSection(sectionKey)}
                            className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted hover:text-slate-700"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? copy.common.hide : copy.common.show}
                          >
                            <svg
                              aria-hidden="true"
                              className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-90' : ''}`}
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M7 5l6 5-6 5V5z" />
                            </svg>
                            <span>{monthLabelFormatter.format(labelDate)}</span>
                            <span className="text-[10px] font-semibold text-slate-400">({items.length})</span>
                          </button>
                          <span className="h-px flex-1 bg-borderSubtle" />
                        </div>
                        {isExpanded ? (
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                        ) : null}
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
          ) : (
            <div className="card text-sm text-muted">{copy.dashboard.upcomingEmpty}</div>
          )}
        </div>
      ) : null}
      {kindFilter !== 'medications' ? (
        <div className="space-y-4">
          <SectionHeader title={copy.dashboard.householdTitle} description={copy.dashboard.householdSubtitle} />
          {householdItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </section>
  );
}
