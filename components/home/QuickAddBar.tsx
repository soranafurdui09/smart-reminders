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
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
          placeholder="ex: mâine la 9 plătește chiria"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (trimmed) openQuickAdd({ text: trimmed });
            }
          }}
        />
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
          aria-label="Dictează"
          onClick={() => openQuickAdd({ voice: true })}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
          aria-label="AI"
          onClick={() => openQuickAdd({ text: trimmed || undefined })}
        >
          <Sparkles className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm"
          aria-label="Adaugă"
          onClick={() => {
            if (trimmed) openQuickAdd({ text: trimmed });
          }}
          disabled={!trimmed}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className="whitespace-nowrap rounded-full border border-slate-200 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-700"
              onClick={() => setValue((current) => (current ? `${current} ${chip.text}` : chip.text))}
            >
              {chip.label}
            </button>
          ))}
        </div>
    </div>
  );
}
