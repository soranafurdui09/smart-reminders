"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { useSpeechToText } from '@/hooks/useSpeechToText';

type MemberOption = {
  id: string;
  label: string;
};

type AiResult = {
  title: string;
  description: string | null;
  dueAt: string;
  recurrenceRule: string | null;
  preReminderMinutes: number | null;
  assignedMemberId: string | null;
};

type TemplateLocale = 'ro' | 'en';

type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';

type TemplateIcon =
  | 'birthday'
  | 'bank'
  | 'rent'
  | 'utilities'
  | 'credit'
  | 'itp'
  | 'carInsurance'
  | 'homeInsurance'
  | 'boiler'
  | 'taxes';

type ReminderTemplate = {
  id: string;
  icon: TemplateIcon;
  scheduleType: ScheduleType;
  preReminderMinutes?: number;
  recurrenceRule?: string;
  title: Record<TemplateLocale, string>;
  description: Record<TemplateLocale, string>;
  notes?: Record<TemplateLocale, string>;
  tags: Record<TemplateLocale, string[]>;
  searchTerms?: string[];
};

const TEMPLATE_ICONS: Record<TemplateIcon, JSX.Element> = {
  birthday: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M6 10h12M7 10V7a5 5 0 0110 0v3M5 10h14l-1.2 8.4a2 2 0 01-2 1.6H8.2a2 2 0 01-2-1.6L5 10z"
      />
    </svg>
  ),
  bank: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3 9l9-4 9 4M4 10h16v8H4zM8 10v8M12 10v8M16 10v8"
      />
    </svg>
  ),
  rent: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M4 10l8-6 8 6v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8z"
      />
    </svg>
  ),
  utilities: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"
      />
    </svg>
  ),
  credit: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M3 7h18v10H3zM3 10h18"
      />
    </svg>
  ),
  itp: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M4 13l2-5a2 2 0 012-1h8a2 2 0 012 1l2 5M6 13v5a1 1 0 001 1h1m10-6v5a1 1 0 01-1 1h-1M7 13h10"
      />
    </svg>
  ),
  carInsurance: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M12 3l7 4v6c0 4.4-3 7.2-7 8-4-0.8-7-3.6-7-8V7l7-4z"
      />
    </svg>
  ),
  homeInsurance: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M12 3l7 4v6c0 4.4-3 7.2-7 8-4-0.8-7-3.6-7-8V7l7-4z"
      />
    </svg>
  ),
  boiler: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M6 5h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2zM9 9h6M9 13h6"
      />
    </svg>
  ),
  taxes: (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M7 7h7a3 3 0 013 3v7H10a3 3 0 01-3-3V7zM9 9h6M9 12h6"
      />
    </svg>
  )
};

const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    id: 'birthday',
    icon: 'birthday',
    scheduleType: 'yearly',
    preReminderMinutes: 10080,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Zi de nastere', en: 'Birthday' },
    description: { ro: 'Anual, cu timp pentru cadou.', en: 'Yearly, with time for a gift.' },
    notes: { ro: 'Nume, cadou, locatie, mesaj.', en: 'Name, gift, venue, message.' },
    tags: { ro: ['aniversare', 'familie', 'cadou'], en: ['birthday', 'family', 'gift'] },
    searchTerms: ['zi de nastere', 'aniversare', 'birthday', 'cadou']
  },
  {
    id: 'loan-payment',
    icon: 'bank',
    scheduleType: 'monthly',
    preReminderMinutes: 4320,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Plata rata banca', en: 'Loan payment' },
    description: { ro: 'Lunar, in jurul scadentei.', en: 'Monthly, around the due date.' },
    notes: { ro: 'Banca, suma, data scadenta, cont.', en: 'Bank, amount, due date, account.' },
    tags: { ro: ['rata', 'banca', 'scadenta'], en: ['loan', 'bank', 'due date'] },
    searchTerms: ['rata', 'banca', 'imprumut', 'loan', 'installment']
  },
  {
    id: 'rent',
    icon: 'rent',
    scheduleType: 'monthly',
    preReminderMinutes: 4320,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Plata chirie', en: 'Rent payment' },
    description: { ro: 'Lunar, inainte de data scadenta.', en: 'Monthly, before the due date.' },
    notes: { ro: 'Proprietar, suma, cont.', en: 'Landlord, amount, account.' },
    tags: { ro: ['chirie', 'locuinta', 'plata'], en: ['rent', 'housing', 'payment'] },
    searchTerms: ['chirie', 'rent', 'locuinta', 'housing']
  },
  {
    id: 'utilities',
    icon: 'utilities',
    scheduleType: 'monthly',
    preReminderMinutes: 2880,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Facturi utilitati', en: 'Utilities bills' },
    description: { ro: 'Electricitate, gaz, apa, salubritate.', en: 'Electricity, gas, water, waste.' },
    notes: { ro: 'Provider, perioada, link de plata.', en: 'Provider, period, payment link.' },
    tags: { ro: ['facturi', 'utilitati', 'plata'], en: ['bills', 'utilities', 'payment'] },
    searchTerms: ['utilitati', 'facturi', 'bills', 'utilities']
  },
  {
    id: 'credit-card',
    icon: 'credit',
    scheduleType: 'monthly',
    preReminderMinutes: 4320,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Scadenta card credit', en: 'Credit card due' },
    description: { ro: 'Plata minima sau integrala.', en: 'Minimum or full payment.' },
    notes: { ro: 'Data scadenta, suma minima.', en: 'Due date, minimum amount.' },
    tags: { ro: ['card', 'credit', 'scadenta'], en: ['card', 'credit', 'due date'] },
    searchTerms: ['card', 'credit', 'scadenta', 'due']
  },
  {
    id: 'itp',
    icon: 'itp',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'ITP masina', en: 'Car inspection' },
    description: { ro: 'Inspectie tehnica periodica.', en: 'Periodic technical inspection.' },
    notes: { ro: 'Service, seria CIV, interval 1-2 ani.', en: 'Service, car ID, interval 1-2 years.' },
    tags: { ro: ['auto', 'inspectie', 'itp'], en: ['car', 'inspection', 'itp'] },
    searchTerms: ['itp', 'inspectie', 'car inspection', 'auto']
  },
  {
    id: 'car-insurance',
    icon: 'carInsurance',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Asigurare auto (RCA/CASCO)', en: 'Car insurance (RCA/CASCO)' },
    description: { ro: 'Reinnoire polita auto.', en: 'Renew your car policy.' },
    notes: { ro: 'Asigurator, numar polita.', en: 'Insurer, policy number.' },
    tags: { ro: ['asigurare', 'auto', 'rca'], en: ['insurance', 'car', 'rca'] },
    searchTerms: ['asigurare', 'rca', 'casco', 'insurance', 'auto']
  },
  {
    id: 'home-insurance',
    icon: 'homeInsurance',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Asigurare locuinta', en: 'Home insurance' },
    description: { ro: 'Reinnoire polita locuinta.', en: 'Renew your home policy.' },
    notes: { ro: 'Asigurator, numar polita.', en: 'Insurer, policy number.' },
    tags: { ro: ['asigurare', 'locuinta', 'polita'], en: ['insurance', 'home', 'policy'] },
    searchTerms: ['asigurare', 'locuinta', 'home', 'insurance']
  },
  {
    id: 'boiler-service',
    icon: 'boiler',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Revizie centrala', en: 'Boiler service' },
    description: { ro: 'Verificare tehnica anuala.', en: 'Annual technical check.' },
    notes: { ro: 'Firma service, contract, data.', en: 'Service company, contract, date.' },
    tags: { ro: ['revizie', 'centrala', 'service'], en: ['service', 'boiler', 'maintenance'] },
    searchTerms: ['centrala', 'revizie', 'service', 'boiler', 'maintenance']
  },
  {
    id: 'local-taxes',
    icon: 'taxes',
    scheduleType: 'yearly',
    preReminderMinutes: 20160,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Taxe locale', en: 'Local taxes' },
    description: { ro: 'Impozit auto si locuinta.', en: 'Car and property taxes.' },
    notes: { ro: 'Primarie, ghiseu, termene.', en: 'City hall, portal, deadlines.' },
    tags: { ro: ['taxe', 'impozit', 'primarie'], en: ['taxes', 'property', 'city hall'] },
    searchTerms: ['taxe', 'impozit', 'taxes', 'primarie']
  }
];

function deriveScheduleType(rule: string | null) {
  const normalized = (rule || '').toUpperCase();
  if (normalized.includes('FREQ=DAILY')) return 'daily';
  if (normalized.includes('FREQ=WEEKLY')) return 'weekly';
  if (normalized.includes('FREQ=MONTHLY')) return 'monthly';
  if (normalized.includes('FREQ=YEARLY')) return 'yearly';
  return 'once';
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offsetMs = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function formatPreReminder(locale: TemplateLocale, minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '';
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    if (locale === 'ro') {
      return `cu ${days} ${days === 1 ? 'zi' : 'zile'} inainte`;
    }
    return `${days} day${days === 1 ? '' : 's'} before`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (locale === 'ro') {
      return `cu ${hours} ${hours === 1 ? 'ora' : 'ore'} inainte`;
    }
    return `${hours} hour${hours === 1 ? '' : 's'} before`;
  }
  if (locale === 'ro') {
    return `cu ${minutes} min inainte`;
  }
  return `${minutes} min before`;
}

export default function ReminderForm({
  action,
  copy,
  householdId,
  members,
  locale,
  autoVoice = false
}: {
  action: (formData: FormData) => void;
  copy: any;
  householdId: string | null;
  members: MemberOption[];
  locale: string;
  autoVoice?: boolean;
}) {
  const activeLocale: TemplateLocale = locale === 'en' ? 'en' : 'ro';
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [templateQuery, setTemplateQuery] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [scheduleType, setScheduleType] = useState('once');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [preReminderMinutes, setPreReminderMinutes] = useState('');
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [aiHighlight, setAiHighlight] = useState(false);
  const [pendingAutoCreate, setPendingAutoCreate] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const voiceStartRef = useRef(false);
  const highlightTimer = useRef<number | null>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const aiCharCount = aiText.length;
  const {
    supported: speechSupported,
    listening: speechListening,
    transcript: speechTranscript,
    error: speechError,
    start: startSpeech,
    stop: stopSpeech,
    reset: resetSpeech
  } = useSpeechToText(activeLocale === 'en' ? 'en-US' : 'ro-RO');

  const memberOptions = useMemo(
    () => [{ id: '', label: copy.remindersNew.assigneeNone }, ...members],
    [members, copy.remindersNew.assigneeNone]
  );
  const scheduleLabels: Record<ScheduleType, string> = {
    once: copy.remindersNew.once,
    daily: copy.remindersNew.daily,
    weekly: copy.remindersNew.weekly,
    monthly: copy.remindersNew.monthly,
    yearly: copy.remindersNew.yearly
  };
  const filteredTemplates = useMemo(() => {
    const terms = templateQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) {
      return REMINDER_TEMPLATES;
    }
    return REMINDER_TEMPLATES.filter((template) => {
      const haystack = [
        template.title[activeLocale],
        template.description[activeLocale],
        template.notes?.[activeLocale],
        ...template.tags[activeLocale],
        ...(template.searchTerms ?? [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [activeLocale, templateQuery]);
  const applyTemplate = (template: ReminderTemplate) => {
    setTitle(template.title[activeLocale]);
    setNotes(template.notes?.[activeLocale] || '');
    setScheduleType(template.scheduleType);
    setRecurrenceRule(template.recurrenceRule || '');
    setPreReminderMinutes(template.preReminderMinutes ? String(template.preReminderMinutes) : '');
    setAiError(null);
    triggerHighlight();
  };

  const triggerHighlight = () => {
    setAiHighlight(true);
    if (highlightTimer.current) {
      window.clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = window.setTimeout(() => setAiHighlight(false), 2200);
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const parseReminder = useCallback(async (textToParse: string, autoCreate: boolean) => {
    const normalizedText = textToParse.trim();
    if (!normalizedText) {
      setAiError(copy.remindersNew.aiMissingText);
      return;
    }
    if (!householdId) {
      setAiError(copy.remindersNew.aiMissingHousehold);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiText(normalizedText);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const response = await fetch('/api/ai/parse-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: normalizedText, timezone, householdId })
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        setAiError(errorBody.error || copy.remindersNew.aiFailed);
        return;
      }
      const data = (await response.json()) as AiResult;
      setTitle(data.title || '');
      setNotes(data.description || '');
      setDueAt(data.dueAt ? toLocalInputValue(data.dueAt) : '');
      setRecurrenceRule(data.recurrenceRule || '');
      setPreReminderMinutes(
        data.preReminderMinutes !== null && data.preReminderMinutes !== undefined
          ? String(data.preReminderMinutes)
          : ''
      );
      setAssignedMemberId(data.assignedMemberId || '');
      setScheduleType(deriveScheduleType(data.recurrenceRule));
      triggerHighlight();
      if (autoCreate) {
        setPendingAutoCreate(true);
      }
    } catch (error) {
      console.error('[ai] parse reminder failed', error);
      setAiError(copy.remindersNew.aiFailed);
    } finally {
      setAiLoading(false);
    }
  }, [
    copy.remindersNew.aiFailed,
    copy.remindersNew.aiMissingHousehold,
    copy.remindersNew.aiMissingText,
    householdId
  ]);

  useEffect(() => {
    if (!autoVoice || voiceStartRef.current || !speechSupported) {
      return;
    }
    voiceStartRef.current = true;
    resetSpeech();
    setAiError(null);
    startSpeech();
  }, [autoVoice, resetSpeech, speechSupported, startSpeech]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const transcript = speechTranscript.trim();
    if (!speechListening && transcript) {
      setAiText(transcript);
      setAiError(null);
      if (autoVoice) {
        void parseReminder(transcript, true);
      }
    }
  }, [autoVoice, parseReminder, speechListening, speechTranscript]);

  useEffect(() => {
    if (!pendingAutoCreate) return;
    const frame = window.requestAnimationFrame(() => {
      formRef.current?.requestSubmit();
      setPendingAutoCreate(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingAutoCreate]);

  const speechErrorMessage = useMemo(() => {
    if (!speechError) return null;
    if (speechError === 'not-allowed' || speechError === 'service-not-allowed') {
      return copy.remindersNew.voicePermission;
    }
    if (speechError === 'no-speech') {
      return copy.remindersNew.voiceNoSpeech;
    }
    if (speechError === 'not-supported') {
      return copy.remindersNew.voiceNotSupported;
    }
    return copy.remindersNew.voiceError;
  }, [
    copy.remindersNew.voiceError,
    copy.remindersNew.voiceNoSpeech,
    copy.remindersNew.voiceNotSupported,
    copy.remindersNew.voicePermission,
    speechError
  ]);

  const handleVoiceStop = () => {
    if (speechListening) {
      stopSpeech();
    }
  };

  return (
    <form ref={formRef} action={action} className="space-y-8">
      <section className="card space-y-4">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-ink">{copy.remindersNew.aiTitle}</div>
          <p className="text-sm text-muted">{copy.remindersNew.aiSubtitle}</p>
        </div>
        <div className="space-y-2">
          <textarea
            className="input min-h-[120px] resize-y"
            rows={4}
            placeholder={copy.remindersNew.aiPlaceholder}
            value={aiText}
            onChange={(event) => setAiText(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>{copy.remindersNew.aiHint}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span>{aiCharCount} {copy.remindersNew.aiCounterLabel}</span>
            </div>
          </div>
          {speechListening ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{copy.remindersNew.voiceListening}</span>
              <button className="btn btn-secondary h-7 px-3 text-xs" type="button" onClick={handleVoiceStop}>
                {copy.remindersNew.voiceStop}
              </button>
            </div>
          ) : autoVoice ? (
            <div className="text-xs text-muted">{copy.remindersNew.voiceAutoActive}</div>
          ) : null}
          {autoVoice && !speechSupported ? (
            <div className="text-xs text-muted">{copy.remindersNew.voiceNotSupported}</div>
          ) : null}
          {speechErrorMessage ? (
            <div className="text-xs text-rose-600">{speechErrorMessage}</div>
          ) : null}
        </div>
        {aiError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{aiError}</div>
        ) : null}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted">{copy.remindersNew.aiExample}</p>
          <div className="flex flex-col gap-2 md:flex-row">
            <button
              className="btn btn-secondary w-full md:w-auto"
              type="button"
              onClick={() => parseReminder(aiText, true)}
              disabled={aiLoading}
            >
              {copy.remindersNew.aiButtonCreate}
            </button>
            <button
              className="btn btn-primary w-full md:w-auto"
              type="button"
              onClick={() => parseReminder(aiText, false)}
              disabled={aiLoading}
            >
              {aiLoading ? copy.remindersNew.aiLoading : copy.remindersNew.aiButton}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{copy.remindersNew.templatesTitle}</h2>
              <p className="text-sm text-muted">{copy.remindersNew.templatesSubtitle}</p>
            </div>
            <div className="relative w-full md:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeWidth="1.5"
                    d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                className="input pl-9"
                aria-label={copy.remindersNew.templatesSearchPlaceholder}
                placeholder={copy.remindersNew.templatesSearchPlaceholder}
                value={templateQuery}
                onChange={(event) => setTemplateQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                  }
                }}
              />
            </div>
          </div>
          {filteredTemplates.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTemplates.map((template) => {
                const preReminder = template.preReminderMinutes
                  ? formatPreReminder(activeLocale, template.preReminderMinutes)
                  : '';
                return (
                  <div
                    key={template.id}
                    className="flex flex-col gap-3 rounded-2xl border border-borderSubtle bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primarySoft text-primaryStrong">
                        {TEMPLATE_ICONS[template.icon]}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-sm font-semibold text-ink">{template.title[activeLocale]}</div>
                        <div className="text-xs text-muted">{template.description[activeLocale]}</div>
                      </div>
                    </div>
                    {template.tags[activeLocale].length ? (
                      <div className="flex flex-wrap gap-2">
                        {template.tags[activeLocale].map((tag) => (
                          <span key={tag} className="chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2 text-xs text-muted">
                      <span className="chip">
                        {copy.remindersNew.repeatLabel}: {scheduleLabels[template.scheduleType]}
                      </span>
                      {preReminder ? (
                        <span className="chip">
                          {copy.remindersNew.templatesPreReminderLabel}: {preReminder}
                        </span>
                      ) : null}
                    </div>
                    {template.notes?.[activeLocale] ? (
                      <div className="text-xs text-muted">{template.notes[activeLocale]}</div>
                    ) : null}
                    <button
                      className="btn btn-secondary mt-1 w-full"
                      type="button"
                      onClick={() => applyTemplate(template)}
                    >
                      {copy.remindersNew.templatesApply}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted">{copy.remindersNew.templatesEmpty}</div>
          )}
        </section>

        <section
          ref={detailsRef}
          className={`card space-y-4 ${aiHighlight ? 'flash-outline flash-bg' : ''}`}
        >
          <div>
            <h3 className="text-lg font-semibold text-ink">{copy.remindersNew.details}</h3>
            <p className="text-sm text-muted">{copy.remindersNew.detailsSubtitle}</p>
          </div>
          <div>
            <label className="text-sm font-semibold">{copy.remindersNew.titleLabel}</label>
            <input
              name="title"
              className="input"
              placeholder={copy.remindersNew.titlePlaceholder}
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold">{copy.remindersNew.notesLabel}</label>
            <textarea
              name="notes"
              className="input"
              rows={3}
              placeholder={copy.remindersNew.notesPlaceholder}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.dateLabel}</label>
              <input
                name="due_at"
                type="datetime-local"
                className="input"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.repeatLabel}</label>
              <select
                name="schedule_type"
                className="input"
                value={scheduleType}
                onChange={(event) => setScheduleType(event.target.value)}
              >
                <option value="once">{copy.remindersNew.once}</option>
                <option value="daily">{copy.remindersNew.daily}</option>
                <option value="weekly">{copy.remindersNew.weekly}</option>
                <option value="monthly">{copy.remindersNew.monthly}</option>
                <option value="yearly">{copy.remindersNew.yearly}</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.preReminderLabel}</label>
              <input
                name="pre_reminder_minutes"
                type="number"
                className="input"
                value={preReminderMinutes}
                onChange={(event) => setPreReminderMinutes(event.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.assigneeLabel}</label>
              <select
                name="assigned_member_id"
                className="input"
                value={assignedMemberId}
                onChange={(event) => setAssignedMemberId(event.target.value)}
              >
                {memberOptions.map((member) => (
                  <option key={member.id || 'none'} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">{copy.remindersNew.recurrenceRuleLabel}</label>
            <input
              name="recurrence_rule"
              className="input"
              placeholder={copy.remindersNew.recurrenceRulePlaceholder}
              value={recurrenceRule}
              onChange={(event) => setRecurrenceRule(event.target.value)}
            />
          </div>
          <ActionSubmitButton
            className="btn btn-primary"
            type="submit"
            data-action-feedback={copy.common.actionCreated}
          >
            {copy.remindersNew.create}
          </ActionSubmitButton>
        </section>
      </div>
    </form>
  );
}
