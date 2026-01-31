"use client";

import { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ClipboardList, ListChecks, Pill, Sparkles, X } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import IconButton from '@/components/ui/IconButton';

type ActionKey = 'ai' | 'task' | 'list' | 'medication' | 'tasks';

export default function QuickActionsSheet({
  open,
  onClose,
  onSelect
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (key: ActionKey) => void;
}) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const actions = useMemo(() => {
    const base: {
      key: ActionKey;
      label: string;
      description: string;
      icon: React.ComponentType<{ className?: string }>;
    }[] = [
      { key: 'ai', label: 'AI Reminder', description: 'Descrie rapid și generează cu AI.', icon: Sparkles },
      { key: 'task', label: 'Quick Task', description: 'Un task simplu, fără pași complicați.', icon: ClipboardList },
      { key: 'medication', label: 'Medication', description: 'Setează o schemă de medicație.', icon: Pill },
      { key: 'list', label: 'List Item', description: 'Adaugă un element într-o listă.', icon: ListChecks }
    ];
    if (isNative) {
      base.splice(2, 0, {
        key: 'tasks',
        label: 'Tasks',
        description: 'Vezi și gestionează taskurile tale.',
        icon: ClipboardList
      });
    }
    return base;
  }, [isNative]);

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel="Quick Actions">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-text">Acțiuni rapide</div>
        <IconButton aria-label="Închide" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="mt-4 space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              className="surface-a2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-text transition"
              onClick={() => {
                onSelect(action.key);
                onClose();
              }}
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface3 text-[color:rgb(var(--accent))]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex flex-col">
                <span>{action.label}</span>
                <span className="text-xs font-medium text-muted">{action.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
