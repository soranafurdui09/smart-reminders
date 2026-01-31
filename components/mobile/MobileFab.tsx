"use client";

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QuickAddSheet from '@/components/mobile/QuickAddSheet';
import QuickActionsSheet from '@/components/mobile/QuickActionsSheet';

export default function MobileFab() {
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);
  const [open, setOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [initialText, setInitialText] = useState<string | undefined>(undefined);
  const [autoVoice, setAutoVoice] = useState(false);
  const [mode, setMode] = useState<'ai' | 'task' | 'list'>('ai');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNative(Capacitor.isNativePlatform());
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string; voice?: boolean; mode?: 'ai' | 'task' | 'list' }>).detail;
      if (detail?.text) {
        setInitialText(detail.text);
      } else {
        setInitialText(undefined);
      }
      setAutoVoice(Boolean(detail?.voice));
      setMode(detail?.mode ?? 'ai');
      setOpen(true);
    };
    window.addEventListener('quickadd:open', handleOpen as EventListener);
    return () => window.removeEventListener('quickadd:open', handleOpen as EventListener);
  }, []);

  return (
    <>
      <button
        type="button"
        className="mobile-fab fixed bottom-[calc(var(--bottom-nav-h)_+_env(safe-area-inset-bottom)_+_10px)] left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-accent text-white shadow-float transition active:scale-95"
        aria-label="Adaugă reminder"
        onClick={(event) => {
          event.preventDefault();
          if (process.env.NODE_ENV !== 'production') {
            console.log('FAB clicked');
          }
          setActionsOpen(true);
        }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
      <QuickActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onSelect={(key) => {
          if (key === 'medication') {
            router.push('/app/medications/new');
            return;
          }
          if (key === 'task' && isNative) {
            router.push('/app/tasks');
            return;
          }
          if (key === 'tasks') {
            router.push('/app/tasks');
            return;
          }
          setMode(key === 'task' ? 'task' : key === 'list' ? 'list' : 'ai');
          setInitialText(undefined);
          setAutoVoice(false);
          setOpen(true);
        }}
      />
      <QuickAddSheet
        open={open}
        onClose={() => setOpen(false)}
        initialText={initialText}
        autoVoice={autoVoice}
        mode={mode}
      />
    </>
  );
}
