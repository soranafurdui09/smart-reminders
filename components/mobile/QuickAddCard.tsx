"use client";

import { useState } from 'react';
import { Mic, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

const chips = [
  { id: 'today', label: 'Azi', text: 'azi' },
  { id: 'tomorrow', label: 'Mâine', text: 'mâine' },
  { id: 'in1h', label: 'În 1h', text: 'peste o oră' },
  { id: 'weekly', label: 'Săptămânal', text: 'săptămânal' },
  { id: 'meds', label: 'Medicamente', text: 'medicament' }
];

export default function QuickAddCard() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  const handleAdd = () => {
    if (!trimmed) {
      router.push('/app/reminders/new');
      return;
    }
    router.push(`/app/reminders/new?quick=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">Adaugă rapid</div>
      <p className="mt-1 text-xs text-slate-500">
        Scrie un reminder simplu. Exemplu: „mâine la 9 plătește chiria”.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder="Scrie un reminder…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
            aria-label="Dictează"
            onClick={() => router.push('/app/reminders/new?voice=1')}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-sky-500 px-3 text-xs font-semibold text-white shadow-sm"
          onClick={handleAdd}
          disabled={!trimmed}
        >
          <Plus className="h-4 w-4" />
          Adaugă
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold text-slate-600">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-slate-600"
            onClick={() => setValue((current) => (current ? `${current} ${chip.text}` : chip.text))}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
