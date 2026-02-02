"use client";

import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { snoozeOccurrence } from '@/app/app/actions';

type Props = {
  occurrenceId: string;
  labels: {
    title: string;
    laterToday: string;
    tomorrowMorning: string;
    inOneHour: string;
    pick: string;
  };
  iconClassName?: string;
  buttonClassName?: string;
};

function notifySnoozeHighlight(occurrenceId: string) {
  if (typeof window === 'undefined') return;
  const payload = { id: occurrenceId, kind: 'snooze', ts: Date.now() };
  window.sessionStorage.setItem('action-highlight', JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('reminder:changed'));
}

export default function SmartSnoozeSheet({
  occurrenceId,
  labels,
  iconClassName,
  buttonClassName
}: Props) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [pending, setPending] = useState(false);
  const isCustomValid = useMemo(() => Boolean(customValue), [customValue]);

  const runSnooze = async (payload: { optionId?: string; mode?: string; customAt?: string }) => {
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData();
      formData.set('occurrenceId', occurrenceId);
      if (payload.optionId) {
        formData.set('option_id', payload.optionId);
      }
      if (payload.mode) {
        formData.set('mode', payload.mode);
      }
      if (payload.customAt) {
        formData.set('option_id', 'custom');
        formData.set('custom_at', payload.customAt);
      }
      await snoozeOccurrence(formData);
      notifySnoozeHighlight(occurrenceId);
      setOpen(false);
      setShowCustom(false);
      setCustomValue('');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={buttonClassName ?? 'icon-btn flex h-11 w-11 items-center justify-center text-secondary'}
        aria-label={labels.title}
        onClick={() => setOpen(true)}
      >
        <Clock className={iconClassName ?? 'h-4 w-4'} />
      </button>
      <BottomSheet
        open={open}
        onClose={() => {
          setOpen(false);
          setShowCustom(false);
          setCustomValue('');
        }}
        ariaLabel={labels.title}
      >
        <div className="space-y-3 pb-1 text-text">
          <div className="text-sm font-semibold text-text">{labels.title}</div>
          <div className="grid gap-2">
            <button
              type="button"
              className="btn btn-secondary w-full justify-between"
              onClick={() => void runSnooze({ optionId: 'later-today' })}
              disabled={pending}
            >
              {labels.laterToday}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full justify-between"
              onClick={() => void runSnooze({ optionId: 'tomorrow' })}
              disabled={pending}
            >
              {labels.tomorrowMorning}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full justify-between"
              onClick={() => void runSnooze({ mode: '60' })}
              disabled={pending}
            >
              {labels.inOneHour}
            </button>
            <button
              type="button"
              className="btn btn-secondary w-full justify-between"
              onClick={() => setShowCustom(true)}
              disabled={pending}
            >
              {labels.pick}
            </button>
          </div>
          {showCustom ? (
            <div className="space-y-2 rounded-xl border border-borderSubtle bg-surface px-3 py-3">
              <label className="text-xs font-semibold text-muted">{labels.pick}</label>
              <input
                type="datetime-local"
                className="input h-10"
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
              />
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => void runSnooze({ customAt: customValue })}
                disabled={!isCustomValid || pending}
              >
                {labels.pick}
              </button>
            </div>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}
