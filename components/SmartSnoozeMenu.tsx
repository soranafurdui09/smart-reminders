"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { getSmartSnoozeOptions, inferReminderCategory } from '@/lib/reminders/snooze';

export default function SmartSnoozeMenu({
  occurrenceId,
  dueAt,
  title,
  notes,
  category,
  copy,
  snoozeAction,
  compact = false
}: {
  occurrenceId: string;
  dueAt: string | null;
  title?: string | null;
  notes?: string | null;
  category?: string | null;
  copy: any;
  snoozeAction: (formData: FormData) => void;
  compact?: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
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

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const details = detailsRef.current;
      if (!details || !details.open) return;
      const target = event.target as Node | null;
      if (target && details.contains(target)) return;
      details.open = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return (
    <details ref={detailsRef} className="relative" onToggle={handleToggle}>
      <summary
        className={`dropdown-summary inline-flex items-center justify-center gap-2 rounded-full border border-borderSubtle bg-surface3 text-text shadow-sm transition hover:bg-surfaceMuted ${
          compact ? 'h-9 w-9' : 'h-10 px-4'
        }`}
        aria-label={copy.common.snooze}
      >
        <svg aria-hidden="true" className={compact ? 'h-4 w-4' : 'h-4 w-4'} fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeWidth="1.5"
            d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
          />
        </svg>
        <span className={compact ? 'sr-only md:not-sr-only' : ''}>{copy.common.snooze}</span>
      </summary>
      <div className="absolute right-0 z-[1000] mt-3 w-64 max-w-[calc(100vw-2rem)] max-h-[60vh] overflow-y-auto rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft">
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
