"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Sparkles, X } from 'lucide-react';
import { reminderCategories } from '@/lib/categories';
import { createReminder } from '@/app/app/reminders/new/actions';
import { createTaskItemAction } from '@/app/app/tasks/actions';
import { createTaskListAction } from '@/app/app/lists/actions';
import { useSpeechToReminder } from '@/hooks/useSpeechToReminder';
import useKeyboardInset from '@/hooks/useKeyboardInset';
import Card from '@/components/ui/Card';
import Pill from '@/components/ui/Pill';
import IconButton from '@/components/ui/IconButton';
import BottomSheet from '@/components/ui/BottomSheet';
import { classTextPrimary, classTextSecondary } from '@/styles/tokens';
import { inferAiDatetimeMeta } from '@/lib/ai/datetime';

type AiResult = {
  title: string;
  description: string | null;
  dueAt: string;
  recurrenceRule: string | null;
  preReminderMinutes: number | null;
  assignedMemberId: string | null;
  categoryId: string | null;
  hasExplicitDatetime?: boolean;
  parsedDatetime?: string | null;
  parsedDatetimeConfidence?: number | null;
};

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
  const [aiStatus, setAiStatus] = useState<'idle' | 'parsing' | 'ready'>('idle');
  const [highlightPreview, setHighlightPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listName, setListName] = useState('');
  const [activeMode, setActiveMode] = useState<'ai' | 'task' | 'list'>(mode);
  const [parsingVisible, setParsingVisible] = useState(false);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const autoStartOnceRef = useRef(false);
  const autoStartDisabledRef = useRef(false);
  const userStoppedRef = useRef(false);
  const categorySelectRef = useRef<HTMLSelectElement | null>(null);
  const parsingTimerRef = useRef<number | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const keyboardInset = useKeyboardInset();

  const trimmed = text.trim();
  const canContinue = activeMode === 'list'
    ? listName.trim().length > 0 || trimmed.length > 0
    : trimmed.length > 0;
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
  const previewTitle = parsedResult?.title || trimmed || 'Titlul reminderului';
  const parsedDate = parsedResult?.parsedDatetime ? toLocalInputFromIso(parsedResult.parsedDatetime) : '';
  const previewDate = parsedDate
    ? parsedDate.replace('T', ' · ')
    : dateValue
      ? `${dateValue}${timeValue ? ` · ${timeValue}` : ''}`
      : 'Data și ora';
  const previewCategory = parsedCategoryLabel || categoryLabel || 'Fără categorie';
  const previewBefore = parsedResult?.preReminderMinutes
    ? `cu ${parsedResult.preReminderMinutes} min înainte`
    : remindBeforeValue
      ? `cu ${remindBeforeValue}`
      : '';
  const previewLine = [previewDate, previewBefore].filter(Boolean).join(' · ');

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

  const getUserOrAiLocalDueAt = (data?: AiResult | null) => {
    if (data?.hasExplicitDatetime && data?.parsedDatetime) {
      return toLocalInputFromIso(data.parsedDatetime);
    }
    if (dateValue && timeValue) {
      return `${dateValue}T${timeValue}`;
    }
    return null;
  };

  const buildRecurrenceRule = () => {
    if (!recurrenceValue) return '';
    if (recurrenceValue.includes('zilnic')) return 'FREQ=DAILY';
    if (recurrenceValue.includes('săptămânal')) return 'FREQ=WEEKLY';
    if (recurrenceValue.includes('lunar')) return 'FREQ=MONTHLY';
    return '';
  };

  const parseReminderText = useCallback(
    async (inputText: string, options?: { silent?: boolean }) => {
      const trimmedText = inputText.trim();
      if (!trimmedText) return null;
      const householdId = typeof window !== 'undefined'
        ? window.localStorage.getItem('smart-reminder-household')
        : null;
      if (!householdId) return null;
      if (!options?.silent) {
        setAiStatus('parsing');
      }
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const clientNow = new Date().toISOString();
      let parsed: AiResult | null = null;
      try {
        const response = await fetch('/api/ai/parse-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmedText, timezone, householdId, clientNow })
        });
        if (!response.ok) {
          parsed = null;
          return null;
        }
        parsed = (await response.json()) as AiResult;
        if (!parsed) return null;
        const meta = inferAiDatetimeMeta({
          text: trimmedText,
          dueAt: parsed.dueAt,
          hasExplicitDatetime: parsed.hasExplicitDatetime,
          parsedDatetime: parsed.parsedDatetime,
          parsedDatetimeConfidence: parsed.parsedDatetimeConfidence
        });
        return { ...parsed, ...meta, dueAt: meta.parsedDatetime ?? '' };
      } finally {
        if (!options?.silent) {
          setAiStatus(parsed ? 'ready' : 'idle');
        }
      }
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

  const resolveVoiceError = (code: string) => {
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Permite accesul la microfon pentru dictare vocală.';
      case 'plugin-missing':
        return 'Plugin-ul de dictare lipsește. Rulează: npx cap sync android.';
      case 'not-supported':
        return 'Dictarea vocală nu este disponibilă pe acest dispozitiv.';
      case 'no-speech':
        return 'Nu s-a detectat niciun sunet. Încearcă din nou.';
      case 'too-short':
        return 'Dictarea este prea scurtă. Încearcă din nou.';
      case 'parse-failed':
        return 'Nu am putut interpreta dictarea. Încearcă din nou.';
      case 'start-failed':
      default:
        return 'Nu am putut porni dictarea.';
    }
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
    onError: (code) => {
      setError(resolveVoiceError(code));
    }
  });

  const { start: startVoice, reset: resetVoice, status: voiceStatus } = voice;
  const voiceTranscript = voice.transcript;
  const voiceTranscriptClean = voiceTranscript.trim();
  const voiceActive = ['starting', 'listening', 'transcribing', 'processing', 'parsing'].includes(voiceStatus);
  const showParsing = aiStatus === 'parsing' || voice.status === 'processing' || voice.status === 'parsing';
  // Preview visibility: show only when user starts typing, voice is active/processing,
  // transcript has content, or a parsed result exists.
  const showPreview = useMemo(() => {
    if (trimmed.length > 0) return true;
    if (voiceActive) return true;
    if (voiceTranscriptClean.length > 0) return true;
    return Boolean(parsedResult);
  }, [parsedResult, trimmed.length, voiceActive, voiceTranscriptClean.length]);
  const hasStructuredPreview = Boolean(
    parsedResult
    || dateValue
    || timeValue
    || remindBeforeValue
    || categoryValue
    || voiceTranscriptClean.length
  );
  const previewStatus = showParsing
    ? 'Analizez…'
    : hasStructuredPreview
      ? 'Previzualizare'
      : 'Ciornă';

  useEffect(() => {
    if (!open) return;
    setActiveMode(mode);
    if (initialText) {
      setText(initialText);
    }
    setAiStatus('idle');
    if (
      autoVoice
      && voiceStatus === 'idle'
      && !autoStartOnceRef.current
      && !autoStartDisabledRef.current
      && !userStoppedRef.current
    ) {
      autoStartOnceRef.current = true;
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[voice][quickadd] autoStart', {
          autoVoice,
          autoStarted: autoStartOnceRef.current,
          userStopped: userStoppedRef.current
        });
      }
      startVoice();
    }
  }, [autoVoice, initialText, mode, open, startVoice, voiceStatus]);

  useEffect(() => {
    if (open) {
      autoStartOnceRef.current = false;
      autoStartDisabledRef.current = false;
      userStoppedRef.current = false;
      return;
    }
    resetVoice();
    setAiStatus('idle');
  }, [open, resetVoice]);

  useEffect(() => {
    if (!parsedResult) return;
    setHighlightPreview(true);
    const timer = window.setTimeout(() => setHighlightPreview(false), 1100);
    return () => window.clearTimeout(timer);
  }, [parsedResult]);

  useEffect(() => {
    if (!open) return;
    if (showParsing) {
      setParsingVisible(true);
      if (parsingTimerRef.current) {
        window.clearTimeout(parsingTimerRef.current);
      }
      return;
    }
    if (parsingTimerRef.current) {
      window.clearTimeout(parsingTimerRef.current);
    }
    parsingTimerRef.current = window.setTimeout(() => {
      setParsingVisible(false);
    }, 280);
    return () => {
      if (parsingTimerRef.current) {
        window.clearTimeout(parsingTimerRef.current);
      }
    };
  }, [open, showParsing]);

  useEffect(() => {
    if (!open || keyboardInset <= 0 || !showPreview) return;
    const previewNode = previewRef.current;
    if (!previewNode) return;
    window.requestAnimationFrame(() => {
      previewNode.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [keyboardInset, open, parsedResult, showPreview, trimmed]);

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

  const handleSaveTask = async (data?: AiResult | null) => {
    if (saving) return;
    if (activeMode === 'list') {
      const name = (listName || trimmed).trim();
      if (!name) {
        setError('Introdu un nume pentru listă.');
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await createTaskListAction({ name, type: 'generic' });
        autoStartDisabledRef.current = true;
        autoStartOnceRef.current = true;
        userStoppedRef.current = true;
        resetVoice();
        onClose();
        router.refresh();
      } catch (err) {
        console.error('[quick-add] list save failed', err);
        setError('Nu am reușit să salvăm lista.');
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const parsed = data ?? (activeMode === 'ai' ? await parseReminderText(buildFullText(), { silent: true }) : null);
      await createTaskItemAction({
        title: parsed?.title || trimmed,
        notes: parsed?.description || '',
        dueDate: activeMode === 'task' && dateValue ? dateValue : null
      });
      autoStartDisabledRef.current = true;
      autoStartOnceRef.current = true;
      userStoppedRef.current = true;
      resetVoice();
      onClose();
      router.refresh();
    } catch (err) {
      const digest = (err as { digest?: string } | null)?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        return;
      }
      console.error('[quick-add] save task failed', err);
      setError('Nu am reușit să salvăm taskul.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReminder = async (data?: AiResult | null) => {
    if (saving) return;
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const startedAt = Date.now();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const parsed = data ?? (activeMode === 'ai' ? await parseReminderText(buildFullText(), { silent: true }) : null);
      const localDueAt = getUserOrAiLocalDueAt(parsed);
      if (!localDueAt) {
        setDetailsOpen(true);
        window.requestAnimationFrame(() => dateInputRef.current?.focus());
        return;
      }

      const formData = new FormData();
      formData.set('kind', 'generic');
      formData.set('title', parsed?.title || trimmed);
      const baseNotes = parsed?.description || '';
      formData.set('notes', baseNotes);
      const fallbackRule = buildRecurrenceRule();
      formData.set('assigned_member_id', parsed?.assignedMemberId || '');
      formData.set('context_category', parsed?.categoryId || categoryValue || '');
      formData.set('recurrence_rule', parsed?.recurrenceRule || fallbackRule);
      formData.set('schedule_type', deriveScheduleType(parsed?.recurrenceRule || fallbackRule));
      formData.set(
        'pre_reminder_minutes',
        parsed?.preReminderMinutes !== null && parsed?.preReminderMinutes !== undefined
          ? String(parsed.preReminderMinutes)
          : parsePreReminder()
      );
      formData.set('due_at', localDueAt);
      formData.set('due_at_iso', toIsoFromLocalInput(localDueAt));
      formData.set('tz', timezone);

      await createReminder(formData);
      autoStartDisabledRef.current = true;
      autoStartOnceRef.current = true;
      userStoppedRef.current = true;
      resetVoice();
      onClose();
      const elapsed = Date.now() - startedAt;
      if (elapsed < 350) {
        await new Promise((resolve) => window.setTimeout(resolve, 350 - elapsed));
      }
    } catch (err) {
      const digest = (err as { digest?: string } | null)?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        return;
      }
      console.error('[quick-add] save reminder failed', err);
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
  const previewDateLabel = parsedDate
    ? parsedDate.replace('T', ' · ')
    : dateValue
      ? `${dateValue}${timeValue ? ` · ${timeValue}` : ''}`
      : '';
  const saveDateLabel = previewDateLabel ? previewDateLabel.replace(' · ', ' ') : '';
  const aiHasExplicitDatetime = Boolean(parsedResult?.hasExplicitDatetime);
  const aiCanSaveReminder = Boolean(parsedResult?.parsedDatetime || (dateValue && timeValue));
  const previewValid = canContinue && !showParsing;

  return (
    <BottomSheet open={open} onClose={onClose} className="pb-[calc(env(safe-area-inset-bottom)_+_6px)]" ariaLabel="Adaugă reminder">
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

      <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
        <div className="space-y-[var(--space-2)]">
          {voiceActive ? (
            <div className="flex items-center justify-between text-xs text-[color:rgb(var(--accent-2))]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[color:rgb(var(--accent-2))]" aria-hidden="true" />
                Ascult…
              </div>
              <button
                type="button"
                className="premium-chip border-[color:rgba(14,165,233,0.3)] text-[color:rgb(var(--accent-2))]"
                onClick={() => {
                  userStoppedRef.current = true;
                  autoStartDisabledRef.current = true;
                  voice.stop();
                }}
              >
                Oprește
              </button>
            </div>
          ) : null}
          {voice.status === 'processing' || voice.status === 'parsing' ? (
            <div className="text-xs text-muted">Procesez dictarea…</div>
          ) : null}
          {!voiceActive && voiceTranscriptClean ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                className="premium-chip border-[color:rgba(14,165,233,0.3)] text-[color:rgb(var(--accent-2))]"
                onClick={() => {
                  setText(normalizeTranscript(voiceTranscriptClean));
                  autoStartDisabledRef.current = true;
                  resetVoice();
                }}
              >
                Folosește dictarea
              </button>
              <button
                type="button"
                className="premium-chip"
                onClick={() => {
                  autoStartDisabledRef.current = true;
                  resetVoice();
                  setParsedResult(null);
                  setText('');
                }}
              >
                Renunță
              </button>
            </div>
          ) : null}
          <div className="relative">
            <textarea
              className="premium-input min-h-[88px] w-full px-[var(--space-2)] py-[var(--space-2)] pr-12 text-sm placeholder:text-muted"
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
                setAiStatus('idle');
                setText(event.target.value);
              }}
            />
            <IconButton
              className="absolute right-2 top-2"
              aria-label={voiceActive ? 'Oprește dictarea' : 'Dictează'}
              onClick={() => {
                if (!voiceActive) {
                  userStoppedRef.current = false;
                  autoStartDisabledRef.current = true;
                } else {
                  userStoppedRef.current = true;
                  autoStartDisabledRef.current = true;
                }
                voice.toggle();
              }}
            >
              <Mic className="h-4 w-4" />
            </IconButton>
          </div>
          {activeMode === 'list' ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted">Listă</label>
              <input
                className="premium-input w-full px-3 text-sm"
                value={listName}
                onChange={(event) => setListName(event.target.value)}
                placeholder="ex: Cumpărături"
              />
            </div>
          ) : null}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:filter-none ${
            showPreview
              ? 'max-h-[360px] translate-y-0 opacity-100 blur-0'
              : 'max-h-0 translate-y-2 opacity-0 blur-[2px] pointer-events-none'
          }`}
          aria-hidden={!showPreview}
        >
          <div
            ref={previewRef}
            className={keyboardInset > 0 ? 'sticky z-10' : ''}
            style={keyboardInset > 0 ? { bottom: `calc(${keyboardInset}px + var(--space-2))` } : undefined}
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:rgb(var(--accent-2))]">
              Previzualizare
            </div>
            <Card
              className={`surface-accent relative overflow-hidden px-[var(--space-3)] py-[var(--space-3)] text-white/85 ${highlightPreview ? 'ai-highlight' : ''}`}
            >
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-[color:rgb(var(--accent-2))]" />
                <span>{previewStatus}</span>
              </div>
              {parsingVisible ? (
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/10" />
                </div>
              ) : (
                <>
                  <div className="mt-2 text-base font-semibold text-white/95 truncate">{previewTitle}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80 transition active:scale-[0.98]">
                      📅 {previewDateLabel || 'Data și ora'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/80 transition active:scale-[0.98]">
                      🔔 {previewBefore || 'Fără reminder'}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(59,130,246,0.35)] bg-[color:rgba(59,130,246,0.18)] px-2.5 py-1 text-[color:rgb(var(--accent-2))] transition active:scale-[0.98]"
                      onClick={() => {
                        setDetailsOpen(true);
                        window.requestAnimationFrame(() => categorySelectRef.current?.focus());
                      }}
                    >
                      🏷️ {previewCategory}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-white/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{previewLine}</span>
                      {isAiMode && parsedResult && !parsedResult.parsedDatetime && !(dateValue && timeValue) ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                          Task
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      {isAiMode && parsedResult && !parsedResult.parsedDatetime && !(dateValue && timeValue) ? (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-[color:rgb(var(--accent-2))] hover:text-white"
                          onClick={() => {
                            setDetailsOpen(true);
                            window.requestAnimationFrame(() => dateInputRef.current?.focus());
                          }}
                        >
                          Setează ora (opțional)
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-[color:rgb(var(--accent-2))] hover:text-white"
                        onClick={() => setDetailsOpen(true)}
                      >
                        Editează detalii
                      </button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>

        {isAiMode ? (
          <div className="space-y-[var(--space-2)]">
            <div className="grid gap-2 sm:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="surface-a1 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-text transition active:scale-[0.98]"
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
          </div>
        ) : null}
      </div>

      <div className="mt-[var(--space-4)]">
        <button
          type="button"
          className="text-xs font-semibold text-muted"
          onClick={() => setDetailsOpen((prev) => !prev)}
        >
          {detailsOpen ? 'Ascunde detalii avansate' : 'Detalii avansate'}
        </button>
        {detailsOpen ? (
          <div className="mt-[var(--space-2)] space-y-[var(--space-2)]">
            {activeMode === 'list' ? (
              <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Listă</label>
                  <input
                    className="premium-input w-full px-3 text-sm"
                    value={listName}
                    onChange={(event) => setListName(event.target.value)}
                    placeholder="Ex: Cumpărături"
                  />
                </div>
              ) : null}
              <div className="grid gap-[var(--space-2)] sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Data</label>
                  <input
                    type="date"
                    className="premium-input w-full px-3 text-sm"
                    value={dateValue}
                    onChange={(event) => setDateValue(event.target.value)}
                    ref={dateInputRef}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Ora</label>
                  <input
                    type="time"
                    className="premium-input w-full px-3 text-sm"
                    value={timeValue}
                    onChange={(event) => setTimeValue(event.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-[var(--space-2)] sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Recurență</label>
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
                  <label className="text-xs font-semibold text-muted">Înainte</label>
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
                <label className="text-xs font-semibold text-muted">Dată final</label>
                <input
                  type="date"
                  className="premium-input w-full px-3 text-sm"
                  value={endDateValue}
                  onChange={(event) => setEndDateValue(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted">Categorie</label>
                <select
                  ref={categorySelectRef}
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
                <label className="text-xs font-semibold text-muted">Familie</label>
                <select className="premium-input w-full px-3 text-sm text-muted" disabled>
                  <option>Disponibil în editare completă</option>
                </select>
              </div>
            </div>
          ) : null}
      </div>

      <div className="mt-[var(--space-3)] grid gap-[var(--space-2)] sticky bottom-0 bg-[color:var(--surface-2)] pt-[var(--space-2)] pb-[calc(env(safe-area-inset-bottom)_+_14px)]">
          {activeMode === 'ai' && aiHasExplicitDatetime ? (
            <>
              <button
                type="button"
                className="premium-btn-primary inline-flex items-center justify-center px-4 text-sm"
                onClick={() => handleSaveReminder(parsedResult)}
                disabled={!previewValid || saving || !aiCanSaveReminder}
              >
                {saving
                  ? 'Se salvează...'
                  : previewValid && saveDateLabel
                    ? `Confirmă reminder • ${saveDateLabel}`
                    : 'Confirmă reminder'}
              </button>
              <button
                type="button"
                className="premium-btn-secondary inline-flex items-center justify-center px-4 text-sm"
                onClick={() => handleSaveTask(parsedResult)}
                disabled={!previewValid || saving}
              >
                Salvează ca task
              </button>
            </>
          ) : activeMode === 'ai' ? (
            <>
              <button
                type="button"
                className="premium-btn-primary inline-flex items-center justify-center px-4 text-sm"
                onClick={() => handleSaveTask(parsedResult)}
                disabled={!previewValid || saving}
              >
                {saving ? 'Se salvează...' : 'Salvează'}
              </button>
              <button
                type="button"
                className="premium-btn-secondary inline-flex items-center justify-center px-4 text-sm"
                onClick={() => handleSaveReminder(parsedResult)}
                disabled={!previewValid || saving}
              >
                Adaugă reminder
              </button>
            </>
          ) : (
            <button
              type="button"
              className="premium-btn-primary inline-flex items-center justify-center px-4 text-sm"
              onClick={() => handleSaveTask(null)}
              disabled={!previewValid || saving}
            >
              {saving ? 'Se salvează...' : 'Salvează'}
            </button>
          )}
          <button
            type="button"
            className="text-xs font-semibold text-muted"
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
    </BottomSheet>
  );
}
