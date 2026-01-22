"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, X } from 'lucide-react';
import { reminderCategories } from '@/lib/categories';
import { createReminder } from '@/app/app/reminders/new/actions';

type AiResult = {
  title: string;
  description: string | null;
  dueAt: string;
  recurrenceRule: string | null;
  preReminderMinutes: number | null;
  assignedMemberId: string | null;
  categoryId: string | null;
};

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [recurrenceValue, setRecurrenceValue] = useState('');
  const [remindBeforeValue, setRemindBeforeValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canContinue = trimmed.length > 0;
  const categoryLabel = reminderCategories.find((category) => category.id === categoryValue)?.label ?? '';
  const previewText = useMemo(() => {
    if (!trimmed) return 'Scrie ceva simplu, iar noi îl transformăm într-un reminder.';
    const parts = [
      trimmed,
      dateValue ? `${dateValue}${timeValue ? ` ${timeValue}` : ''}` : null,
      recurrenceValue ? recurrenceValue : null,
      remindBeforeValue ? `cu ${remindBeforeValue}` : null,
      categoryLabel ? `categorie ${categoryLabel}` : null
    ].filter(Boolean);
    return `Se va salva: ${parts.join(' · ')}`;
  }, [categoryLabel, dateValue, recurrenceValue, remindBeforeValue, timeValue, trimmed]);

  const buildFullText = () => {
    if (!trimmed) return '';
    let fullText = trimmed;
    if (dateValue) {
      fullText += ` pe ${dateValue}`;
    }
    if (timeValue) {
      fullText += ` la ${timeValue}`;
    }
    if (recurrenceValue) {
      fullText += `, ${recurrenceValue}`;
    }
    if (remindBeforeValue) {
      fullText += `, amintește-mă cu ${remindBeforeValue}`;
    }
    if (categoryLabel) {
      fullText += `, categorie ${categoryLabel}`;
    }
    return fullText;
  };

  const toLocalInputValue = (value: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  };

  const toLocalInputFromIso = (iso: string) => {
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return toLocalInputValue(parsed);
  };

  const toIsoFromLocalInput = (localInput: string) => {
    if (!localInput) return '';
    const parsed = new Date(localInput);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString();
  };

  const buildLocalFallback = () => {
    if (dateValue && timeValue) {
      return `${dateValue}T${timeValue}`;
    }
    if (dateValue) {
      return `${dateValue}T09:00`;
    }
    const fallback = new Date();
    fallback.setMinutes(fallback.getMinutes() + 60);
    return toLocalInputValue(fallback);
  };

  const buildRecurrenceRule = () => {
    if (!recurrenceValue) return '';
    if (recurrenceValue.includes('zilnic')) return 'FREQ=DAILY';
    if (recurrenceValue.includes('săptămânal')) return 'FREQ=WEEKLY';
    if (recurrenceValue.includes('lunar')) return 'FREQ=MONTHLY';
    return '';
  };

  const parsePreReminder = () => {
    if (!remindBeforeValue) return '';
    if (remindBeforeValue.includes('10')) return '10';
    if (remindBeforeValue.includes('30')) return '30';
    if (remindBeforeValue.includes('1 oră')) return '60';
    if (remindBeforeValue.includes('1 zi')) return '1440';
    return '';
  };

  const deriveScheduleType = (rule?: string | null) => {
    if (!rule) return 'once';
    const normalized = rule.toUpperCase();
    if (normalized.includes('FREQ=DAILY')) return 'daily';
    if (normalized.includes('FREQ=WEEKLY')) return 'weekly';
    if (normalized.includes('FREQ=MONTHLY')) return 'monthly';
    if (normalized.includes('FREQ=YEARLY')) return 'yearly';
    return 'once';
  };

  const handleNavigate = (mode?: 'medication') => {
    onClose();
    if (mode === 'medication') {
      router.push('/app/reminders/new?mode=medication');
      return;
    }
    const fullText = buildFullText();
    if (!fullText) {
      router.push('/app/reminders/new');
      return;
    }
    router.push(`/app/reminders/new?quick=${encodeURIComponent(fullText)}`);
  };

  const handleSave = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const householdId = typeof window !== 'undefined'
        ? window.localStorage.getItem('smart-reminder-household')
        : null;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const clientNow = new Date().toISOString();
      let parsed: AiResult | null = null;

      if (householdId) {
        const response = await fetch('/api/ai/parse-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: buildFullText(), timezone, householdId, clientNow })
        });
        if (response.ok) {
          parsed = (await response.json()) as AiResult;
        }
      }

      const formData = new FormData();
      formData.set('kind', 'generic');
      formData.set('title', parsed?.title || trimmed);
      formData.set('notes', parsed?.description || '');
      const fallbackRule = buildRecurrenceRule();
      formData.set('recurrence_rule', parsed?.recurrenceRule || fallbackRule);
      formData.set('schedule_type', deriveScheduleType(parsed?.recurrenceRule || fallbackRule));
      formData.set(
        'pre_reminder_minutes',
        parsed?.preReminderMinutes !== null && parsed?.preReminderMinutes !== undefined
          ? String(parsed.preReminderMinutes)
          : parsePreReminder()
      );
      formData.set('assigned_member_id', parsed?.assignedMemberId || '');
      formData.set('context_category', parsed?.categoryId || categoryValue || '');
      const localDueAt = parsed?.dueAt
        ? toLocalInputFromIso(parsed.dueAt)
        : buildLocalFallback();
      formData.set('due_at', localDueAt);
      formData.set('due_at_iso', toIsoFromLocalInput(localDueAt));
      formData.set('tz', timezone);

      await createReminder(formData);
      onClose();
    } catch (err) {
      const digest = (err as { digest?: string } | null)?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        return;
      }
      console.error('[quick-add] save failed', err);
      setError('Nu am reușit să salvăm reminderul.');
    } finally {
      setSaving(false);
    }
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
          <div className="relative">
            <textarea
              className="input min-h-[84px] pr-12"
              placeholder="ex: plătește chiria pe 1 la 9, lunar, cu 2 zile înainte"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
              aria-label="Dictează"
              onClick={() => {
                onClose();
                router.push('/app/reminders/new?voice=1');
              }}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
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

        <div className="mt-4">
          <button
            type="button"
            className="text-xs font-semibold text-slate-500"
            onClick={() => setDetailsOpen((prev) => !prev)}
          >
            {detailsOpen ? 'Ascunde detalii' : 'Detalii'}
          </button>
          {detailsOpen ? (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Data</label>
                  <input
                    type="date"
                    className="input h-9"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Ora</label>
                  <input
                    type="time"
                    className="input h-9"
                    value={timeValue}
                    onChange={(event) => setTimeValue(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Recurență</label>
                  <select
                    className="input h-9"
                    value={recurrenceValue}
                    onChange={(event) => setRecurrenceValue(event.target.value)}
                  >
                    <option value="">Fără recurență</option>
                    <option value="repetă zilnic">Zilnic</option>
                    <option value="repetă săptămânal">Săptămânal</option>
                    <option value="repetă lunar">Lunar</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Înainte</label>
                  <select
                    className="input h-9"
                    value={remindBeforeValue}
                    onChange={(event) => setRemindBeforeValue(event.target.value)}
                  >
                    <option value="">Fără notificare</option>
                    <option value="10 minute înainte">10 minute</option>
                    <option value="30 minute înainte">30 minute</option>
                    <option value="1 oră înainte">1 oră</option>
                    <option value="1 zi înainte">1 zi</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Categorie</label>
                <select
                  className="input h-9"
                  value={categoryValue}
                  onChange={(event) => setCategoryValue(event.target.value)}
                >
                  <option value="">Fără categorie</option>
                  {reminderCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="btn btn-primary h-11 justify-center"
            onClick={handleSave}
            disabled={!canContinue || saving}
          >
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-slate-500"
            onClick={() => {
              onClose();
              const fullText = buildFullText();
              router.push(fullText ? `/app/reminders/new?quick=${encodeURIComponent(fullText)}` : '/app/reminders/new');
            }}
          >
            Editare completă
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}
