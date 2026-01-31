"use client";

import { useMemo, useState } from 'react';
import BottomSheet from '@/components/ui/BottomSheet';
import IconButton from '@/components/ui/IconButton';
import { MoreHorizontal, X } from 'lucide-react';
import { shareTaskListAction } from '@/app/app/lists/actions';

type MemberOption = { id: string; label: string };

export default function ListShareSheet({
  listId,
  members,
  shared,
  className = ''
}: {
  listId: string;
  members: MemberOption[];
  shared: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberLabels = useMemo(() => members.map((member) => member.label), [members]);

  const handleShare = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await shareTaskListAction(listId);
      if (!result?.ok) {
        setError('Nu am putut partaja lista.');
        return;
      }
      setOpen(false);
    } catch (err) {
      console.error('[lists] share failed', err);
      setError('Nu am putut partaja lista.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`icon-btn inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 ${className}`}
        aria-label="Meniu listă"
        onClick={() => setOpen(true)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabel="Partajează lista">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-text">Partajează</div>
          <IconButton aria-label="Închide" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="mt-4 space-y-3">
          <div className="text-xs text-muted">
            {shared ? 'Lista este deja partajată cu familia ta.' : 'Trimite lista către familia ta.'}
          </div>
          <div className="rounded-2xl border border-borderSubtle bg-surface p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-tertiary">Membri</div>
            <div className="mt-2 space-y-1 text-sm text-text">
              {memberLabels.length ? (
                memberLabels.map((label) => <div key={label}>• {label}</div>)
              ) : (
                <div className="text-xs text-tertiary">Nu există membri în familie.</div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleShare}
            disabled={pending || shared}
          >
            {pending ? 'Se partajează…' : shared ? 'Deja partajat' : 'Partajează cu familia'}
          </button>
          <button type="button" className="text-xs font-semibold text-muted" onClick={() => setOpen(false)}>
            Anulează
          </button>
        </div>
        {error ? <div className="mt-3 text-xs text-rose-600">{error}</div> : null}
      </BottomSheet>
    </>
  );
}
