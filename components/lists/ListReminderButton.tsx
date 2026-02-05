"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomSheet from '@/components/ui/BottomSheet';
import { createListReminderAction } from '@/app/app/lists/actions';

export default function ListReminderButton({
  listId,
  listTitle,
  className = ''
}: {
  listId: string;
  listTitle: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAt, setCustomAt] = useState('');

  const handlePreset = async (preset: 'in_1_hour' | 'today_18' | 'tomorrow_09' | 'custom', customAtValue?: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await createListReminderAction({
        listId,
        preset,
        customAt: customAtValue
      });
      if (!result?.ok) {
        setError('Nu am reușit să creăm reminderul.');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error('[list-reminder] create failed', err);
      setError('Nu am reușit să creăm reminderul.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`text-xs font-semibold text-[color:rgb(var(--accent-2))] hover:text-white ${className}`}
        onClick={() => setOpen(true)}
        aria-label={`Amintește-mi de listă: ${listTitle}`}
      >
        Amintește-mi de listă
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabel="Reamintește-mi">
        <div className="text-sm font-semibold text-text">Amintește-mi de listă</div>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
            onClick={() => handlePreset('in_1_hour')}
            disabled={pending}
          >
            În 1 oră
          </button>
          <button
            type="button"
            className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
            onClick={() => handlePreset('today_18')}
            disabled={pending}
          >
            Astăzi 18:00
          </button>
          <button
            type="button"
            className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
            onClick={() => handlePreset('tomorrow_09')}
            disabled={pending}
          >
            Mâine 09:00
          </button>
          <details className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition">
            <summary className="cursor-pointer select-none">Alege data/ora…</summary>
            <div className="mt-3 space-y-2">
              <input
                type="datetime-local"
                value={customAt}
                onChange={(event) => setCustomAt(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text"
              />
              <button
                type="button"
                className="surface-a2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-text transition disabled:opacity-60"
                onClick={() => handlePreset('custom', customAt)}
                disabled={!customAt || pending}
              >
                Setează
              </button>
            </div>
          </details>
        </div>
        {error ? <div className="mt-3 text-xs text-rose-600">{error}</div> : null}
      </BottomSheet>
    </>
  );
}
