"use client";

import { useState } from 'react';
import { Mic, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import { classTextPrimary, classTextSecondary } from '@/styles/tokens';

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
    <Card className="p-4">
      <div className={`text-sm font-semibold ${classTextPrimary}`}>Adaugă rapid</div>
      <p className={`mt-1 text-xs ${classTextSecondary}`}>
        Scrie un reminder simplu. Exemplu: „mâine la 9 plătește chiria”.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 pr-11 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            placeholder="Scrie un reminder…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200"
            aria-label="Dictează"
            onClick={() => router.push('/app/reminders/new?voice=1')}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-cyan-400/90 px-3 text-xs font-semibold text-slate-950 shadow-sm shadow-cyan-500/30 transition hover:bg-cyan-300"
          onClick={handleAdd}
          disabled={!trimmed}
        >
          <Plus className="h-4 w-4" />
          Adaugă
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs font-semibold text-slate-300">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-200"
            onClick={() => setValue((current) => (current ? `${current} ${chip.text}` : chip.text))}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
