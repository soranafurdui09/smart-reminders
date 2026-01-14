"use client";

import { useMemo, useState } from 'react';
import { isThisWeek, isToday, isTomorrow } from 'date-fns';
import SectionHeader from '@/components/SectionHeader';
import OccurrenceCard from '@/components/OccurrenceCard';
import ReminderFilterBar from './ReminderFilterBar';
import { messages } from '@/lib/i18n';

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
  } | null;
  performed_by?: string | null;
  performed_by_label?: string | null;
  effective_at?: string;
};

type Props = {
  occurrences: OccurrencePayload[];
  copy: typeof messages['ro'];
  membershipId: string;
  googleConnected: boolean;
  initialCreatedBy?: CreatedByOption;
  initialAssignment?: AssignmentOption;
  locale: keyof typeof messages;
  localeTag: string;
};

const groupLabels = (copy: typeof messages['ro']) => ({
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
  googleConnected,
  initialCreatedBy = 'all',
  initialAssignment = 'all',
  locale,
  localeTag
}: Props) {
  const [createdBy, setCreatedBy] = useState<CreatedByOption>(initialCreatedBy);
  const [assignment, setAssignment] = useState<AssignmentOption>(initialAssignment);

  const filteredOccurrences = useMemo(() => {
    const normalized = occurrences
      .filter((occurrence) => occurrence.reminder?.is_active ?? true)
      .filter((occurrence) => {
        if (createdBy === 'me' && occurrence.reminder?.created_by !== membershipId) {
          return false;
        }
        if (createdBy === 'others' && occurrence.reminder?.created_by === membershipId) {
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
  }, [occurrences, createdBy, assignment, membershipId]);

  const nextOccurrence = filteredOccurrences[0];

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

  return (
    <section className="space-y-4">
      <SectionHeader title={copy.dashboard.sectionTitle} description={copy.dashboard.sectionSubtitle} />
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
      {nextOccurrence ? (
        <div className="rounded-2xl border border-slate-100 bg-surface p-4 text-sm text-slate-600">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.dashboard.nextTitle}</div>
          <div className="mt-2 text-base font-semibold text-slate-900">{nextOccurrence.reminder?.title}</div>
          <div className="text-sm text-slate-500">
            {new Date(nextOccurrence.effective_at ?? nextOccurrence.occur_at).toLocaleString(localeTag)}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-surface p-4 text-sm text-slate-500">
          {copy.dashboard.nextEmptyRelaxed}
        </div>
      )}
      {filteredOccurrences.length ? (
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
      )}
    </section>
  );
}
