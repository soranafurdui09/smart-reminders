"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Sparkles, X } from 'lucide-react';
import { reminderCategories } from '@/lib/categories';
import { createReminder } from '@/app/app/reminders/new/actions';
import { useSpeechToReminder } from '@/hooks/useSpeechToReminder';
import Card from '@/components/ui/Card';
import Pill from '@/components/ui/Pill';
import IconButton from '@/components/ui/IconButton';
import { classTextPrimary, classTextSecondary } from '@/styles/tokens';

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
  onClose,
  initialText = '',
  autoVoice = false,
  mode = 'ai'
}: {
  open: boolean;
  onClose: () => void;
  initialText?: string;
  autoVoice?: boolean;
  mode?: 'ai' | 'task' | 'list';
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [recurrenceValue, setRecurrenceValue] = useState('');
  const [remindBeforeValue, setRemindBeforeValue] = useState('');
  const [endDateValue, setEndDateValue] = useState('');
  const [categoryValue, setCategoryValue] = useState('');
  const [parsedResult, setParsedResult] = useState<AiResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [activeMode, setActiveMode] = useState<'ai' | 'task' | 'list'>(mode);

  const trimmed = text.trim();
  const canContinue = trimmed.length > 0;
  const categoryLabel = reminderCategories.find((category) => category.id === categoryValue)?.label ?? '';
  const parsedCategoryLabel = parsedResult?.categoryId
    ? reminderCategories.find((category) => category.id === parsedResult.categoryId)?.label ?? ''
    : '';

  const toLocalInputValue = useCallback((value: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }, []);

  const toLocalInputFromIso = useCallback(
    (iso: string) => {
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return '';
      return toLocalInputValue(parsed);
    },
    [toLocalInputValue]
  );
  const previewText = useMemo(() => {
    if (parsedResult) {
      const parts = [
        parsedResult.title,
        parsedResult.dueAt ? toLocalInputFromIso(parsedResult.dueAt).replace('T', ' ') : null,
        parsedResult.recurrenceRule ? 'recurent' : null,
        parsedResult.preReminderMinutes ? `cu ${parsedResult.preReminderMinutes} min înainte` : null,
        parsedCategoryLabel ? `categorie ${parsedCategoryLabel}` : null
      ].filter(Boolean);
      return `Se va salva: ${parts.join(' · ')}`;
    }
    if (!trimmed) return 'Scrie ceva simplu, iar noi îl transformăm într-un reminder.';
    const parts = [
      trimmed,
      dateValue ? `${dateValue}${timeValue ? ` ${timeValue}` : ''}` : null,
      recurrenceValue ? recurrenceValue : null,
      remindBeforeValue ? `cu ${remindBeforeValue}` : null,
      categoryLabel ? `categorie ${categoryLabel}` : null
    ].filter(Boolean);
    return `Se va salva: ${parts.join(' · ')}`;
  }, [
    categoryLabel,
    dateValue,
    parsedCategoryLabel,
    parsedResult,
    recurrenceValue,
    remindBeforeValue,
    timeValue,
    trimmed,
    toLocalInputFromIso
  ]);

  const previewTitle = parsedResult?.title || trimmed || 'Titlul reminderului';
  const parsedDate = parsedResult?.dueAt ? toLocalInputFromIso(parsedResult.dueAt) : '';
  const previewDate = parsedDate
    ? parsedDate.replace('T', ' · ')
    : dateValue
      ? `${dateValue}${timeValue ? ` · ${timeValue}` : ''}`
      : 'Data și ora';
  const previewCategory = parsedCategoryLabel || categoryLabel || 'Fără categorie';

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

  const parseReminderText = useCallback(
    async (inputText: string) => {
      const trimmedText = inputText.trim();
      if (!trimmedText) return null;
      const householdId = typeof window !== 'undefined'
        ? window.localStorage.getItem('smart-reminder-household')
        : null;
      if (!householdId) return null;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const clientNow = new Date().toISOString();
      const response = await fetch('/api/ai/parse-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText, timezone, householdId, clientNow })
      });
      if (!response.ok) return null;
      return (await response.json()) as AiResult;
    },
    []
  );

  const normalizeTranscript = (input: string) => {
    const words = input.trim().split(/\s+/);
    const normalized: string[] = [];
    for (const word of words) {
      const last = normalized[normalized.length - 1];
      if (last && last.toLowerCase() === word.toLowerCase()) {
        continue;
      }
      normalized.push(word);
    }
    while (normalized.length > 1 && normalized[0].toLowerCase() === 'reminder') {
      normalized.shift();
    }
    return normalized.join(' ');
  };

  const voice = useSpeechToReminder<AiResult>({
    useAi: activeMode === 'ai',
    parseText: activeMode === 'ai'
      ? async (inputText) => {
          const cleaned = normalizeTranscript(inputText);
          setText(cleaned);
          setParsedResult(null);
          return await parseReminderText(cleaned);
        }
      : undefined,
    onParsed: activeMode === 'ai'
      ? (parsed) => {
          setParsedResult(parsed);
        }
      : undefined,
    onFallback: (inputText) => {
      setText(normalizeTranscript(inputText));
    },
    onError: () => {
      setError('Nu am putut porni dictarea.');
    }
  });

  const { start: startVoice, reset: resetVoice, status: voiceStatus } = voice;
  const voiceActive = ['starting', 'listening', 'transcribing', 'processing', 'parsing'].includes(voiceStatus);

  useEffect(() => {
    if (!open) return;
    setActiveMode(mode);
    if (initialText) {
      setText(initialText);
    }
    if (autoVoice && voiceStatus === 'idle') {
      startVoice();
    }
  }, [autoVoice, initialText, mode, open, startVoice, voiceStatus]);

  useEffect(() => {
    if (open) return;
    resetVoice();
  }, [open, resetVoice]);

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
      router.push('/app/medications/new');
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
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      let parsed: AiResult | null = null;
      if (activeMode === 'ai') {
        parsed = await parseReminderText(buildFullText());
      }

      const formData = new FormData();
      formData.set('kind', 'generic');
      formData.set('title', parsed?.title || trimmed);
      const baseNotes = parsed?.description || '';
      const listSuffix = activeMode === 'list' && listName
        ? `${baseNotes ? `${baseNotes}\n` : ''}Listă: ${listName}`
        : baseNotes;
      formData.set('notes', listSuffix);
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

  const isAiMode = activeMode === 'ai';
  const sheetTitle = activeMode === 'task'
    ? 'Task rapid'
    : activeMode === 'list'
      ? 'Adaugă în listă'
      : 'Adaugă rapid';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[#02040a]/70 px-4 pb-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="premium-sheet w-full max-w-lg max-h-[85vh] p-4 overflow-y-auto overscroll-contain"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Adaugă reminder"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`text-sm font-semibold ${classTextPrimary}`}>{sheetTitle}</div>
            <p className={`mt-1 text-xs ${classTextSecondary}`}>
              {activeMode === 'ai'
                ? 'Scrie sau dictează un reminder scurt.'
                : activeMode === 'task'
                  ? 'Adaugă un task rapid și opțional o dată.'
                  : 'Adaugă un element într-o listă simplă.'}
            </p>
          </div>
          <IconButton aria-label="Închide" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ai', label: 'AI Reminder', mode: 'ai' as const },
              { id: 'task', label: 'Quick Task', mode: 'task' as const },
              { id: 'list', label: 'List Item', mode: 'list' as const },
              { id: 'meds', label: 'Medication', mode: 'medication' as const }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`premium-chip ${activeMode === item.mode ? 'border-[color:var(--accent)] text-ink bg-[color:var(--accent-soft-bg)]' : ''}`}
                onClick={() => {
                  if (item.mode === 'medication') {
                    handleNavigate('medication');
                    return;
                  }
                  setActiveMode(item.mode);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Card className="p-3 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              Preview
              {parsedResult ? (
                <Pill className="ml-auto bg-white/10 text-slate-200">AI completat</Pill>
              ) : null}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-100">{previewTitle}</div>
            <div className="mt-1 text-xs text-slate-400">{previewDate}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill className="border border-white/10 bg-white/5 text-slate-300">Activ · Reminder nou</Pill>
              <Pill className="bg-cyan-500/15 text-cyan-200">{previewCategory}</Pill>
            </div>
            <div className="mt-2">{previewText}</div>
          </Card>
          {voiceActive ? (
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" aria-hidden="true" />
                Ascult…
              </div>
              <button
                type="button"
                className="premium-chip border-cyan-400/30 text-cyan-200"
                onClick={voice.stop}
              >
                Oprește
              </button>
            </div>
          ) : null}
          {voice.status === 'processing' || voice.status === 'parsing' ? (
            <div className="text-xs text-slate-300">Procesez dictarea…</div>
          ) : null}
          <div className="relative">
            <textarea
              className="premium-input min-h-[84px] w-full px-3 py-3 pr-12 text-sm placeholder:text-slate-400"
              placeholder={
                activeMode === 'task'
                  ? 'ex: trimite email către bancă'
                  : activeMode === 'list'
                    ? 'ex: cumpără lapte'
                    : 'ex: plătește chiria pe 1 la 9, lunar, cu 2 zile înainte'
              }
              value={text}
              onChange={(event) => {
                setParsedResult(null);
                setText(event.target.value);
              }}
            />
            <IconButton
              className="absolute right-2 top-2"
              aria-label={voiceActive ? 'Oprește dictarea' : 'Dictează'}
              onClick={voice.toggle}
            >
              <Mic className="h-4 w-4" />
            </IconButton>
          </div>
          {activeMode === 'list' ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Listă</label>
              <input
                className="premium-input w-full px-3 text-sm"
                value={listName}
                onChange={(event) => setListName(event.target.value)}
                placeholder="ex: Cumpărături"
              />
            </div>
          ) : null}
          {isAiMode ? (
            <>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="premium-chip"
                    onClick={() => {
                      if (item.mode === 'medication') {
                        handleNavigate('medication');
                        return;
                      }
                      setParsedResult(null);
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
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                    onClick={() => {
                      if (template.mode === 'medication') {
                        handleNavigate('medication');
                        return;
                      }
                      setParsedResult(null);
                      setText(template.text ?? '');
                    }}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="text-xs font-semibold text-slate-300"
            onClick={() => setDetailsOpen((prev) => !prev)}
          >
            {detailsOpen ? 'Ascunde detalii avansate' : 'Detalii avansate'}
          </button>
            {detailsOpen ? (
            <div className="mt-3 space-y-3">
              {activeMode === 'list' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Listă</label>
                  <input
                    className="premium-input w-full px-3 text-sm"
                    value={listName}
                    onChange={(event) => setListName(event.target.value)}
                    placeholder="Ex: Cumpărături"
                  />
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Data</label>
                  <input
                    type="date"
                    className="premium-input w-full px-3 text-sm"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Ora</label>
                  <input
                    type="time"
                    className="premium-input w-full px-3 text-sm"
                    value={timeValue}
                    onChange={(event) => setTimeValue(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Recurență</label>
                  <select
                    className="premium-input w-full px-3 text-sm"
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
                  <label className="text-xs font-semibold text-slate-300">Înainte</label>
                  <select
                    className="premium-input w-full px-3 text-sm"
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
                <label className="text-xs font-semibold text-slate-300">Dată final</label>
                <input
                  type="date"
                  className="premium-input w-full px-3 text-sm"
                  value={endDateValue}
                  onChange={(event) => setEndDateValue(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Categorie</label>
                <select
                  className="premium-input w-full px-3 text-sm"
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
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Familie</label>
                <select className="premium-input w-full px-3 text-sm text-slate-400" disabled>
                  <option>Disponibil în editare completă</option>
                </select>
              </div>
            </div>
          ) : null}
        </div>

      <div className="mt-4 grid gap-2 sticky bottom-0 bg-sheet pt-2 pb-[calc(env(safe-area-inset-bottom)_+_12px)]">
          <button
            type="button"
            className="premium-btn-primary inline-flex items-center justify-center px-4 text-sm"
            onClick={handleSave}
            disabled={!canContinue || saving}
          >
            {saving ? 'Se salvează...' : 'Salvează'}
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-slate-300"
            onClick={() => {
              onClose();
              const fullText = buildFullText();
              router.push(fullText ? `/app/reminders/new?quick=${encodeURIComponent(fullText)}` : '/app/reminders/new');
            }}
          >
            Editare completă
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
