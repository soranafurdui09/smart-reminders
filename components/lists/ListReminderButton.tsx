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

  const handlePreset = async (preset: 'today_evening' | 'tomorrow_morning') => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await createListReminderAction({ listId, preset });
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

  const handleChoose = () => {
    setOpen(false);
    const quickText = `Verifică lista: ${listTitle}`;
    router.push(`/app/reminders/new?mode=manual&quick=${encodeURIComponent(quickText)}&list_id=${encodeURIComponent(listId)}`);
  };

  return (
    <>
      <button
        type="button"
        className={`text-xs font-semibold text-[color:rgb(var(--accent-2))] hover:text-white ${className}`}
        onClick={() => setOpen(true)}
      >
        Reamintește-mi
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabel="Reamintește-mi">
        <div className="text-sm font-semibold text-text">Reamintește-mi</div>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
            onClick={() => handlePreset('today_evening')}
            disabled={pending}
          >
            Astăzi seara
          </button>
          <button
            type="button"
            className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
            onClick={() => handlePreset('tomorrow_morning')}
            disabled={pending}
          >
            Mâine dimineață
          </button>
          <button
            type="button"
            className="surface-a2 w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
            onClick={handleChoose}
            disabled={pending}
          >
            Alege data/ora…
          </button>
        </div>
        {error ? <div className="mt-3 text-xs text-rose-600">{error}</div> : null}
      </BottomSheet>
    </>
  );
}
