"use client";

import { useMemo, useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { getSmartSnoozeOptions, inferReminderCategory } from '@/lib/reminders/snooze';

export default function SmartSnoozeMenu({
  occurrenceId,
  dueAt,
  title,
  notes,
  category,
  copy,
  snoozeAction
}: {
  occurrenceId: string;
  dueAt: string | null;
  title?: string | null;
  notes?: string | null;
  category?: string | null;
  copy: any;
  snoozeAction: (formData: FormData) => void;
}) {
  // UI flow: compute options instantly on the client, while the server recomputes before saving.
  const [nowKey, setNowKey] = useState(() => Date.now());
  const now = useMemo(() => new Date(nowKey), [nowKey]);
  const dueAtDate = useMemo(() => {
    if (!dueAt) return null;
    const parsed = new Date(dueAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [dueAt]);
  const dueAtTime = useMemo(() => (dueAtDate ? dueAtDate.getTime() : null), [dueAtDate]);
  const normalizedCategory = useMemo(
    () => inferReminderCategory({ title, notes, category }),
    [title, notes, category]
  );
  const options = useMemo(
    () => getSmartSnoozeOptions({ now, category: normalizedCategory, dueAt: dueAtTime ? new Date(dueAtTime) : null }),
    [now, normalizedCategory, dueAtTime]
  );
  const hasCustom = options.some((option) => option.id === 'custom');
  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) {
      setNowKey(Date.now());
    }
  };

  return (
    <details className="relative" onToggle={handleToggle}>
      <summary className="btn btn-secondary dropdown-summary h-10">
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="1.5"
            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
          />
        </svg>
        {copy.common.snooze}
      </summary>
      <div className="absolute right-0 z-20 mt-3 w-64 rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft">
        {options
          .filter((option) => option.id !== 'custom')
          .map((option) => (
            <form action={snoozeAction} key={option.id}>
              <input type="hidden" name="occurrenceId" value={occurrenceId} />
              <input type="hidden" name="option_id" value={option.id} />
              <ActionSubmitButton
                className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                type="submit"
                data-action-feedback={copy.common.actionSnoozed}
                data-highlight-id={occurrenceId}
                data-highlight-kind="snooze"
              >
                {option.label}
              </ActionSubmitButton>
            </form>
          ))}
        {hasCustom ? (
          <form action={snoozeAction} className="mt-2 border-t border-borderSubtle pt-2">
            <input type="hidden" name="occurrenceId" value={occurrenceId} />
            <input type="hidden" name="option_id" value="custom" />
            <label className="text-xs font-semibold text-muted">{copy.common.snoozeCustom}</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                name="custom_at"
                type="datetime-local"
                className="input h-9 w-full"
                aria-label={copy.common.snoozeCustom}
                required
              />
              <ActionSubmitButton
                className="btn btn-secondary h-9"
                type="submit"
                data-action-feedback={copy.common.actionSnoozed}
                data-highlight-id={occurrenceId}
                data-highlight-kind="snooze"
              >
                {copy.common.snoozeCustomButton}
              </ActionSubmitButton>
            </div>
          </form>
        ) : null}
      </div>
    </details>
  );
}
