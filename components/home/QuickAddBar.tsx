"use client";

import { useState } from 'react';
import { Mic, Sparkles, Plus } from 'lucide-react';

const chips = [
  { id: 'today', label: 'Azi', text: 'azi la 18:00' },
  { id: 'tomorrow', label: 'Mâine', text: 'mâine la 09:00' },
  { id: 'in1h', label: '1h', text: 'peste o oră' },
  { id: 'recurring', label: 'Recurent', text: 'în fiecare săptămână' }
];

export default function QuickAddBar() {
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  const openQuickAdd = (payload: { text?: string; voice?: boolean }) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('quickadd:open', { detail: { mode: 'ai', ...payload } }));
  };

  return (
    <div className="surface-a1 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center rounded-[14px] input-surface px-3">
          <input
            className="h-full w-full bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
            placeholder="Adaugă sau caută… (ex: chirie pe 1 la 9)"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (trimmed) openQuickAdd({ text: trimmed });
              }
            }}
          />
        </div>
        <button
          type="button"
          className="icon-btn h-11 w-11 text-[color:rgb(var(--accent))]"
          aria-label="Dictează"
          onClick={() => openQuickAdd({ voice: true })}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="icon-btn h-11 w-11 text-[color:rgb(var(--accent))]"
          aria-label="AI"
          onClick={() => openQuickAdd({ text: trimmed || undefined })}
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="primary-btn h-11 px-3 text-xs"
          onClick={() => openQuickAdd({ text: trimmed || undefined })}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="chip whitespace-nowrap text-[12px] px-2.5 py-1.5"
            onClick={() => setValue((current) => (current ? `${current} ${chip.text}` : chip.text))}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
