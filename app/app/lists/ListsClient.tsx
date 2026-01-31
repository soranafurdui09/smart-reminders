"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { createTaskListAction } from './actions';
import ListShareSheet from '@/components/lists/ListShareSheet';
import type { TaskList } from '@/lib/tasks';

type Props = {
  lists: TaskList[];
  members: Array<{ id: string; label: string }>;
};

export default function ListsClient({ lists, members }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'generic' | 'shopping'>('generic');
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    const safeName = name.trim();
    if (!safeName) return;
    startTransition(async () => {
      await createTaskListAction({ name: safeName, type });
      setName('');
      setType('generic');
      setSheetOpen(false);
    });
  };

  return (
    <div className="page-wrap space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Liste</h1>
          <p className="text-sm text-muted">Listele tale de taskuri</p>
        </div>
        <button
          type="button"
          className="btn btn-primary inline-flex items-center gap-2"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Listă nouă
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {lists.length ? (
          lists.map((list) => (
            <div key={list.id} className="premium-card flex flex-col gap-2 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/app/lists/${list.id}`} className="text-sm font-semibold text-ink">
                    {list.name}
                  </Link>
                  <div className="text-xs text-muted">
                    {list.type === 'shopping' ? 'Shopping list' : 'Listă generică'}
                  </div>
                </div>
                <ListShareSheet listId={list.id} members={members} shared={Boolean(list.household_id)} />
              </div>
              {list.household_id ? (
                <div className="text-[11px] font-semibold text-[color:rgb(var(--accent-2))]">
                  Shared · {members.length}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="text-sm text-muted">Nu există liste încă.</div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} ariaLabel="New list">
        <div className="text-sm font-semibold text-text">Listă nouă</div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted">Nume</label>
            <input
              className="premium-input w-full px-3 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex: Cumpărături"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted">Tip</label>
            <select
              className="premium-input w-full px-3 text-sm"
              value={type}
              onChange={(event) => setType(event.target.value === 'shopping' ? 'shopping' : 'generic')}
            >
              <option value="generic">Generic</option>
              <option value="shopping">Shopping</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <ActionSubmitButton
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            {isPending ? 'Se salvează…' : 'Creează'}
          </ActionSubmitButton>
          <button type="button" className="text-xs font-semibold text-muted" onClick={() => setSheetOpen(false)}>
            Anulează
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
