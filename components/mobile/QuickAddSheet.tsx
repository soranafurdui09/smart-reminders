"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, X } from 'lucide-react';

const suggestions = [
  { id: 'today', label: 'Azi', text: 'Azi la 18:00' },
  { id: 'tomorrow', label: 'Mâine', text: 'Mâine la 09:00' },
  { id: 'in1h', label: 'În 1h', text: 'Peste o oră' },
  { id: 'weekly', label: 'Săptămânal', text: 'În fiecare săptămână' },
  { id: 'monthly', label: 'Lunar', text: 'Pe 1 ale lunii la 09:00' },
  { id: 'medication', label: 'Medicație', mode: 'medication' as const }
];

const templates = [
  { id: 'rent', label: 'Plată chirie', text: 'Plata chiriei pe 1 ale lunii la 9:00, cu 2 zile înainte' },
  { id: 'bills', label: 'Factură utilități', text: 'Factura utilități pe 15 la 10:00' },
  { id: 'meds', label: 'Medicație zilnică', mode: 'medication' as const },
  { id: 'car', label: 'RCA / ITP', text: 'ITP mașină pe 1 iunie la 10:00' }
];

export default function QuickAddSheet({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState('');

  const trimmed = text.trim();
  const canContinue = trimmed.length > 0;
  const previewText = useMemo(() => trimmed || 'Scrie ceva simplu, iar noi îl transformăm într-un reminder.', [trimmed]);

  const handleNavigate = (mode?: 'medication') => {
    onClose();
    if (mode === 'medication') {
      router.push('/app/reminders/new?mode=medication');
      return;
    }
    if (!trimmed) {
      router.push('/app/reminders/new');
      return;
    }
    router.push(`/app/reminders/new?quick=${encodeURIComponent(trimmed)}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 px-4 pb-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-float"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Adaugă reminder"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Adaugă rapid</div>
            <p className="mt-1 text-xs text-slate-500">Scrie sau dictează un reminder scurt.</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500"
            onClick={onClose}
            aria-label="Închide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <textarea
            className="input min-h-[96px]"
            placeholder="ex: plătește chiria pe 1 la 9, lunar, cu 2 zile înainte"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="chip px-3 py-1 text-xs"
                onClick={() => {
                  if (item.mode === 'medication') {
                    handleNavigate('medication');
                    return;
                  }
                  setText(item.text ?? '');
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700"
                onClick={() => {
                  if (template.mode === 'medication') {
                    handleNavigate('medication');
                    return;
                  }
                  setText(template.text ?? '');
                }}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
          {previewText}
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="btn btn-primary h-11 justify-center"
            onClick={() => handleNavigate()}
            disabled={!canContinue}
          >
            Creează reminder
          </button>
          <button
            type="button"
            className="btn btn-secondary h-11 justify-center"
            onClick={() => {
              onClose();
              router.push('/app/reminders/new?voice=1');
            }}
          >
            <Mic className="h-4 w-4" />
            Creează cu voce
          </button>
        </div>
      </div>
    </div>
  );
}
