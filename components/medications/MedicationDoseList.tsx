'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatDateTimeWithTimeZone } from '@/lib/dates';

export type MedicationDoseRow = {
  id: string;
  scheduled_at: string;
  status: string;
  skipped_reason?: string | null;
  taken_at?: string | null;
  snoozed_until?: string | null;
  patient_member_id?: string | null;
  medication?: { id: string; name: string | null } | null;
};

type Labels = {
  taken: string;
  skipped: string;
  skip: string;
  snooze: string;
  skipPrompt: string;
  skipReasonDefault: string;
  pending?: string;
  missed?: string;
};

export default function MedicationDoseList({
  doses,
  locale,
  timeZone,
  labels,
  allowActions = true,
  canEditByDose
}: {
  doses: MedicationDoseRow[];
  locale: string;
  timeZone: string;
  labels: Labels;
  allowActions?: boolean;
  canEditByDose?: (dose: MedicationDoseRow) => boolean;
}) {
  const [items, setItems] = useState(doses);

  const updateDose = useCallback((id: string, next: Partial<MedicationDoseRow>) => {
    setItems((prev) => prev.map((dose) => (dose.id === id ? { ...dose, ...next } : dose)));
  }, []);

  const handleAction = useCallback(
    async (doseId: string, status: 'taken' | 'skipped' | 'snoozed') => {
      const skippedReason =
        status === 'skipped'
          ? window.prompt(labels.skipPrompt, labels.skipReasonDefault) || labels.skipReasonDefault
          : undefined;
      try {
        const response = await fetch(`/api/medications/dose/${doseId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, skippedReason, snoozeMinutes: 10 })
        });
        if (!response.ok) {
          return;
        }
        const payload = await response.json().catch(() => null);
        if (payload?.dose) {
          updateDose(doseId, {
            status: payload.dose.status,
            skipped_reason: payload.dose.skipped_reason ?? null,
            taken_at: payload.dose.taken_at ?? null,
            snoozed_until: payload.dose.snoozed_until ?? null
          });
        }
      } catch (error) {
        console.error('[medication] update dose failed', error);
      }
    },
    [labels.skipPrompt, labels.skipReasonDefault, updateDose]
  );

  const rows = useMemo(
    () =>
      items.map((dose) => {
        const timeLabel = formatDateTimeWithTimeZone(dose.scheduled_at, timeZone, locale);
        const statusLabel =
          dose.status === 'taken'
            ? labels.taken
            : dose.status === 'skipped'
              ? labels.skipped
              : dose.status === 'missed'
                ? labels.missed ?? labels.skipped
                : dose.status === 'snoozed'
                  ? labels.snooze
                  : labels.pending ?? labels.snooze;
        return { ...dose, timeLabel, statusLabel };
      }),
    [items, timeZone, locale, labels.taken, labels.skipped, labels.snooze, labels.pending, labels.missed]
  );

  return (
    <div className="space-y-3">
      {rows.map((dose) => (
        <div key={dose.id} className="card flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-ink">
                {dose.medication?.name || 'Medicament'}
              </div>
              <div className="text-xs text-muted">{dose.timeLabel}</div>
            </div>
            <span className="chip">{dose.statusLabel}</span>
          </div>
          {allowActions && (canEditByDose ? canEditByDose(dose) : true) ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary h-9"
                onClick={() => handleAction(dose.id, 'taken')}
              >
                {labels.taken}
              </button>
              <button
                type="button"
                className="btn btn-secondary h-9"
                onClick={() => handleAction(dose.id, 'snoozed')}
              >
                {labels.snooze}
              </button>
              <button
                type="button"
                className="btn btn-secondary h-9"
                onClick={() => handleAction(dose.id, 'skipped')}
              >
                {labels.skip}
              </button>
            </div>
          ) : null}
          {dose.skipped_reason ? (
            <div className="text-xs text-muted">{dose.skipped_reason}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
