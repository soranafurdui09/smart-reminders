"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, ListChecks, Pill, Sparkles, X } from 'lucide-react';

type ActionItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function FabMenu({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const actions: ActionItem[] = [
    { label: 'AI Reminder', href: '/app/reminders/new?mode=ai', icon: Sparkles },
    { label: 'Quick Task', href: '/app/reminders/new?mode=quick', icon: ClipboardList },
    { label: 'Medication', href: '/app/medications/new', icon: Pill },
    { label: 'List Item', href: '/app/reminders/new?mode=list', icon: ListChecks }
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#02040a]/60 px-4 pb-[calc(env(safe-area-inset-bottom)_+_16px)]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="premium-sheet w-full max-w-lg p-4"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Quick actions"
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">Quick Actions</div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300"
            onClick={onClose}
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.href}
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border border-borderSubtle bg-surface px-4 py-3 text-left text-sm font-semibold text-ink transition hover:bg-surfaceMuted"
                onClick={() => {
                  onClose();
                  router.push(action.href);
                }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-surfaceMuted text-primaryStrong">
                  <Icon className="h-5 w-5" />
                </span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
