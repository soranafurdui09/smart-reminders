'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Plus } from 'lucide-react';
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
            className="premium-input w-full px-3 pr-11 text-sm placeholder:text-[color:var(--text-3)]"
            placeholder="Scrie un reminder…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
            <button
            type="button"
            className="premium-icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"
            aria-label="Dictează"
            onClick={() => {
              router.push('/app/reminders/new?voice=1');
            }}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="premium-btn-primary inline-flex items-center justify-center gap-1 px-4 text-xs"
          onClick={handleAdd}
          disabled={!trimmed}
        >
          <Plus className="h-4 w-4" />
          Adaugă
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="premium-chip whitespace-nowrap"
            onClick={() => setValue((current) => (current ? `${current} ${chip.text}` : chip.text))}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
