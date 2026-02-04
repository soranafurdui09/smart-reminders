"use client";

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';

type Mode = 'family' | 'focus';

type Props = {
  value: Mode;
  onChange: (mode: Mode) => void;
};

const MODE_OPTIONS: Array<{ id: Mode; emoji: string; title: string; description: string }> = [
  {
    id: 'family',
    emoji: '👨‍👩‍👧',
    title: 'Family',
    description: 'Shared reminders, groups & household tasks'
  },
  {
    id: 'focus',
    emoji: '🎯',
    title: 'Focus',
    description: 'Only what matters. Minimal noise'
  }
];

export default function ModeSwitcher({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (mode: Mode) => {
    onChange(mode);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="home-chip inline-flex items-center gap-1.5 normal-case"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{value === 'family' ? 'Family' : 'Focus'}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabel="Selectează modul">
        <div className="space-y-3">
          {MODE_OPTIONS.map((option) => {
            const isActive = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                className={`w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition ${
                  isActive ? 'border-white/20 bg-white/10' : ''
                }`}
                onClick={() => handleSelect(option.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-lg" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{option.title}</div>
                      <div className="mt-1 text-xs text-white/60">{option.description}</div>
                    </div>
                  </div>
                  {isActive ? <Check className="h-4 w-4 text-white/80" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
