"use client";

import { useMemo, useState } from 'react';
import { isThisWeek, isToday, isTomorrow } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';
import OccurrenceCard from '@/components/OccurrenceCard';
import ReminderFilterBar from './ReminderFilterBar';
import { messages, type Locale } from '@/lib/i18n';
import { formatDateTimeWithTimeZone } from '@/lib/dates';

type CreatedByOption = 'all' | 'me' | 'others';
type AssignmentOption = 'all' | 'assigned_to_me';

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
};

const groupLabels = (copy: MessageBundle) => ({
  today: copy.dashboard.groupToday,
  tomorrow: copy.dashboard.groupTomorrow,
  week: copy.dashboard.groupWeek,
  later: copy.dashboard.groupLater
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
  localeTag
}: Props) {
  const [createdBy, setCreatedBy] = useState<CreatedByOption>(initialCreatedBy);
  const [assignment, setAssignment] = useState<AssignmentOption>(initialAssignment);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [kindFilter, setKindFilter] = useState<'all' | 'tasks' | 'medications'>('all');
  const [doseState, setDoseState] = useState<MedicationDose[]>(medicationDoses);

  const filteredOccurrences = useMemo(() => {
    const normalized = occurrences
      .filter((occurrence) => occurrence.reminder?.is_active ?? true)
      .filter((occurrence) => {
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
        return true;
      })
      .map((occurrence) => ({
        ...occurrence,
        effective_at: occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at
      }))
      .sort((a, b) => new Date(a.effective_at ?? a.occur_at).getTime() - new Date(b.effective_at ?? b.occur_at).getTime());
    return normalized;
  }, [occurrences, createdBy, assignment, membershipId, userId, kindFilter]);

  const nextOccurrence = filteredOccurrences[0];
  const nextOccurrenceTimeZone = nextOccurrence?.reminder?.tz ?? null;

  const groups = useMemo(() => {
    const sections: Record<string, OccurrencePayload[]> = {
      today: [],
      tomorrow: [],
      week: [],
      later: []
    };
    filteredOccurrences.forEach((occurrence) => {
      const compareDate = new Date(occurrence.effective_at ?? occurrence.occur_at);
      if (isToday(compareDate)) {
        sections.today.push(occurrence);
      } else if (isTomorrow(compareDate)) {
        sections.tomorrow.push(occurrence);
      } else if (isThisWeek(compareDate, { weekStartsOn: 1 })) {
        sections.week.push(occurrence);
      } else {
        sections.later.push(occurrence);
      }
    });
    return sections;
  }, [filteredOccurrences]);

  const labels = groupLabels(copy);
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
    <section className="space-y-4">
      <SectionHeader title={copy.dashboard.sectionTitle} description={copy.dashboard.sectionSubtitle} />
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/60 p-2 text-sm font-semibold text-slate-700">
        {[
          { value: 'all', label: copy.dashboard.filtersKindAll },
          { value: 'tasks', label: copy.dashboard.filtersKindTasks },
          { value: 'medications', label: copy.dashboard.filtersKindMeds }
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            className={`rounded-full px-3 py-1 transition ${
              kindFilter === item.value
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setKindFilter(item.value as typeof kindFilter)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">{copy.dashboard.filtersTitle}</div>
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
        />
      ) : null}
      {kindFilter !== 'medications' ? (
        nextOccurrence ? (
          <div className="rounded-2xl border border-slate-100 bg-surface p-4 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.dashboard.nextTitle}</div>
            <div className="mt-2 text-base font-semibold text-slate-900">{nextOccurrence.reminder?.title}</div>
            <div className="text-sm text-slate-500">
              {formatDateTimeWithTimeZone(nextOccurrence.effective_at ?? nextOccurrence.occur_at, nextOccurrenceTimeZone)}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-surface p-4 text-sm text-slate-500">
            {copy.dashboard.nextEmptyRelaxed}
          </div>
        )
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
        filteredOccurrences.length ? (
          <div className="space-y-6">
            {Object.entries(groups).map(([key, items]) =>
              items.length ? (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-semibold uppercase text-muted">
                    <span>{labels[key as keyof typeof labels]}</span>
                    <span className="h-px flex-1 bg-borderSubtle" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((occurrence) => (
                      <OccurrenceCard
                        key={occurrence.id}
                        occurrence={occurrence}
                        locale={locale}
                        googleConnected={googleConnected}
                      />
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="card text-sm text-muted">{copy.dashboard.emptyFriendly}</div>
        )
      ) : null}
    </section>
  );
}
