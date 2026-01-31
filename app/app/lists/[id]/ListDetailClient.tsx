"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { createTaskItemAction, toggleTaskDoneAction } from '@/app/app/tasks/actions';
import type { TaskItem, TaskList } from '@/lib/tasks';

type Props = {
  list: TaskList;
  items: TaskItem[];
};

export default function ListDetailClient({ list, items: initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<TaskItem[]>(initialItems);
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleToggle = (item: TaskItem) => {
    startTransition(async () => {
      const nextDone = !item.done;
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, done: nextDone } : row)));
      await toggleTaskDoneAction(item.id, nextDone);
      router.refresh();
    });
  };

  const handleAdd = () => {
    const safeTitle = title.trim();
    if (!safeTitle) return;
    startTransition(async () => {
      await createTaskItemAction({
        listId: list.id,
        title: safeTitle,
        qty: list.type === 'shopping' ? qty || null : null
      });
      setTitle('');
      setQty('');
      router.refresh();
    });
  };

  return (
    <div className="page-wrap space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{list.name}</h1>
        <p className="text-sm text-muted">{list.type === 'shopping' ? 'Shopping list' : 'Listă generică'}</p>
      </div>

      <div className="premium-card space-y-3 px-4 py-4">
        <div className="text-sm font-semibold text-ink">Adaugă element</div>
        <div className="space-y-2">
          <input
            className="premium-input w-full px-3 text-sm"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="ex: lapte"
          />
          {list.type === 'shopping' ? (
            <input
              className="premium-input w-full px-3 text-sm"
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              placeholder="cantitate (opțional)"
            />
          ) : null}
          <ActionSubmitButton
            type="button"
            className="btn btn-primary inline-flex items-center gap-2"
            onClick={handleAdd}
            disabled={!title.trim()}
          >
            <Plus className="h-4 w-4" />
            {isPending ? 'Se salvează…' : 'Adaugă'}
          </ActionSubmitButton>
        </div>
      </div>

      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="premium-card flex items-start gap-3 px-4 py-3">
              <button
                type="button"
                className="mt-0.5 text-[color:rgb(var(--accent))]"
                aria-pressed={item.done}
                aria-label={item.done ? 'Marchează ca nefinalizat' : 'Marchează ca finalizat'}
                onClick={() => handleToggle(item)}
                disabled={isPending}
              >
                {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${item.done ? 'text-muted line-through' : 'text-ink'}`}>
                  {item.title}
                </div>
                {item.qty ? <div className="mt-1 text-xs text-muted">Cantitate: {item.qty}</div> : null}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted">Lista este goală.</div>
        )}
      </div>
    </div>
  );
}
