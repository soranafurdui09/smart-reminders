"use client";

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { createTaskItemAction, toggleTaskDoneAction } from './actions';
import type { TaskItem, TaskList } from '@/lib/tasks';

type Props = {
  inbox: TaskList;
  lists: TaskList[];
  items: TaskItem[];
};

export default function TasksClient({ inbox, lists, items: initialItems }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');
  const [items, setItems] = useState<TaskItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [listId, setListId] = useState(inbox.id);

  const filteredItems = useMemo(() => {
    if (filter === 'open') return items.filter((item) => !item.done);
    if (filter === 'done') return items.filter((item) => item.done);
    return items;
  }, [filter, items]);

  const handleToggle = (item: TaskItem) => {
    startTransition(async () => {
      const nextDone = !item.done;
      setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, done: nextDone } : row)));
      await toggleTaskDoneAction(item.id, nextDone);
      router.refresh();
    });
  };

  const handleCreate = () => {
    const safeTitle = title.trim();
    if (!safeTitle) return;
    startTransition(async () => {
      await createTaskItemAction({
        listId,
        title: safeTitle,
        dueDate: dueDate || null
      });
      setTitle('');
      setDueDate('');
      setSheetOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="page-wrap space-y-6 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Tasks</h1>
          <p className="text-sm text-muted">Inbox</p>
        </div>
        <button
          type="button"
          className="btn btn-primary inline-flex items-center gap-2"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'open', 'done'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`premium-chip ${filter === key ? 'border-[color:rgba(59,130,246,0.4)] text-[color:rgb(var(--accent-2))]' : ''}`}
            onClick={() => setFilter(key)}
          >
            {key === 'all' ? 'Toate' : key === 'open' ? 'Deschise' : 'Finalizate'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredItems.length ? (
          filteredItems.map((item) => (
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
                {item.due_date ? (
                  <div className="mt-1 text-xs text-muted">Scadență: {item.due_date}</div>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted">Nu ai taskuri încă.</div>
        )}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} ariaLabel="Add task">
        <div className="text-sm font-semibold text-text">Add task</div>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted">Titlu</label>
            <input
              className="premium-input w-full px-3 text-sm"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="ex: cumpără lapte"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted">Dată</label>
            <input
              type="date"
              className="premium-input w-full px-3 text-sm"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted">Listă</label>
            <select
              className="premium-input w-full px-3 text-sm"
              value={listId}
              onChange={(event) => setListId(event.target.value)}
            >
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <ActionSubmitButton
            type="button"
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={!title.trim()}
          >
            {isPending ? 'Se salvează…' : 'Salvează'}
          </ActionSubmitButton>
          <button type="button" className="text-xs font-semibold text-muted" onClick={() => setSheetOpen(false)}>
            Anulează
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
