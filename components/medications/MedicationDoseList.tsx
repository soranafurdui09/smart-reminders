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
  variant = 'default',
  allowActions = true,
  canEditByDose
}: {
  doses: MedicationDoseRow[];
  locale: string;
  timeZone: string;
  labels: Labels;
  variant?: 'default' | 'compact';
  allowActions?: boolean;
  canEditByDose?: (dose: MedicationDoseRow) => boolean;
}) {
  const [items, setItems] = useState(doses);
  const isCompact = variant === 'compact';

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
        const timeLabel = formatDateTimeWithTimeZone(dose.scheduled_at, timeZone);
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
    [items, timeZone, labels.taken, labels.skipped, labels.snooze, labels.pending, labels.missed]
  );

  return (
    <div className={isCompact ? 'space-y-2' : 'space-y-3'}>
      {rows.map((dose) => (
        <div
          key={dose.id}
          className={`${isCompact ? 'surface-a1 rounded-2xl p-3' : 'card'} flex flex-col ${isCompact ? 'gap-2' : 'gap-3'}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`${isCompact ? 'text-sm' : 'text-base'} font-semibold text-ink`}>
                {dose.medication?.name || 'Medicament'}
              </div>
              <div className="text-[11px] text-muted">{dose.timeLabel}</div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                dose.status === 'taken'
                  ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                  : dose.status === 'missed'
                    ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                    : dose.status === 'skipped'
                      ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                      : 'border-sky-400/30 bg-sky-400/10 text-sky-200'
              }`}
            >
              {dose.statusLabel}
            </span>
          </div>
          {allowActions && (canEditByDose ? canEditByDose(dose) : true) ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`btn btn-primary ${isCompact ? 'h-8 px-3 text-xs' : 'h-9'}`}
                onClick={() => handleAction(dose.id, 'taken')}
              >
                {labels.taken}
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${isCompact ? 'h-8 px-3 text-xs' : 'h-9'}`}
                onClick={() => handleAction(dose.id, 'snoozed')}
              >
                {labels.snooze}
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${isCompact ? 'h-8 px-3 text-xs' : 'h-9'}`}
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
