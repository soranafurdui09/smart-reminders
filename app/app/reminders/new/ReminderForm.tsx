"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { useSpeechToReminder, type SpeechStatus } from '@/hooks/useSpeechToReminder';
import { getDefaultContextSettings, isDefaultContextSettings, type ContextSettings, type DayOfWeek } from '@/lib/reminders/context';
import type { MedicationDetails, MedicationFrequencyType } from '@/lib/reminders/medication';
import { reminderCategories, type ReminderCategoryId } from '@/lib/categories';

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
  categoryId?: ReminderCategoryId | null;
};

type AiStatus = 'idle' | 'transcribing' | 'parsing' | 'ready' | 'creating' | 'created' | 'error';

export type ReminderFormVoiceHandle = {
  startVoice: () => void;
  stopVoice: () => void;
  toggleVoice: () => void;
  supported: boolean;
  status: SpeechStatus;
};

type TemplateLocale = 'ro' | 'en' | 'de';

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
    title: { ro: 'Zi de nastere', en: 'Birthday', de: 'Geburtstag' },
    description: { ro: 'Anual, cu timp pentru cadou.', en: 'Yearly, with time for a gift.', de: 'Jährlich, mit Zeit für ein Geschenk.' },
    notes: { ro: 'Nume, cadou, locatie, mesaj.', en: 'Name, gift, venue, message.', de: 'Name, Geschenk, Ort, Nachricht.' },
    tags: { ro: ['aniversare', 'familie', 'cadou'], en: ['birthday', 'family', 'gift'], de: ['geburtstag', 'familie', 'geschenk'] },
    searchTerms: ['zi de nastere', 'aniversare', 'birthday', 'cadou', 'geburtstag', 'geschenk']
  },
  {
    id: 'loan-payment',
    icon: 'bank',
    scheduleType: 'monthly',
    preReminderMinutes: 4320,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Plata rata banca', en: 'Loan payment', de: 'Kreditrate' },
    description: { ro: 'Lunar, in jurul scadentei.', en: 'Monthly, around the due date.', de: 'Monatlich, rund um das Fälligkeitsdatum.' },
    notes: { ro: 'Banca, suma, data scadenta, cont.', en: 'Bank, amount, due date, account.', de: 'Bank, Betrag, Fälligkeit, Konto.' },
    tags: { ro: ['rata', 'banca', 'scadenta'], en: ['loan', 'bank', 'due date'], de: ['kredit', 'bank', 'fälligkeit'] },
    searchTerms: ['rata', 'banca', 'imprumut', 'loan', 'installment', 'kredit', 'rate', 'fälligkeit']
  },
  {
    id: 'rent',
    icon: 'rent',
    scheduleType: 'monthly',
    preReminderMinutes: 4320,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Plata chirie', en: 'Rent payment', de: 'Mietzahlung' },
    description: { ro: 'Lunar, inainte de data scadenta.', en: 'Monthly, before the due date.', de: 'Monatlich, vor dem Fälligkeitsdatum.' },
    notes: { ro: 'Proprietar, suma, cont.', en: 'Landlord, amount, account.', de: 'Vermieter, Betrag, Konto.' },
    tags: { ro: ['chirie', 'locuinta', 'plata'], en: ['rent', 'housing', 'payment'], de: ['miete', 'wohnung', 'zahlung'] },
    searchTerms: ['chirie', 'rent', 'locuinta', 'housing', 'miete', 'mietzahlung']
  },
  {
    id: 'utilities',
    icon: 'utilities',
    scheduleType: 'monthly',
    preReminderMinutes: 2880,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Facturi utilitati', en: 'Utilities bills', de: 'Nebenkosten' },
    description: { ro: 'Electricitate, gaz, apa, salubritate.', en: 'Electricity, gas, water, waste.', de: 'Strom, Gas, Wasser, Müll.' },
    notes: { ro: 'Provider, perioada, link de plata.', en: 'Provider, period, payment link.', de: 'Anbieter, Zeitraum, Zahlungslink.' },
    tags: { ro: ['facturi', 'utilitati', 'plata'], en: ['bills', 'utilities', 'payment'], de: ['nebenkosten', 'rechnungen', 'zahlung'] },
    searchTerms: ['utilitati', 'facturi', 'bills', 'utilities', 'nebenkosten', 'rechnung', 'strom', 'gas']
  },
  {
    id: 'credit-card',
    icon: 'credit',
    scheduleType: 'monthly',
    preReminderMinutes: 4320,
    recurrenceRule: 'FREQ=MONTHLY',
    title: { ro: 'Scadenta card credit', en: 'Credit card due', de: 'Kreditkartenfälligkeit' },
    description: { ro: 'Plata minima sau integrala.', en: 'Minimum or full payment.', de: 'Mindest- oder Gesamtzahlung.' },
    notes: { ro: 'Data scadenta, suma minima.', en: 'Due date, minimum amount.', de: 'Fälligkeit, Mindestbetrag.' },
    tags: { ro: ['card', 'credit', 'scadenta'], en: ['card', 'credit', 'due date'], de: ['kreditkarte', 'fälligkeit', 'zahlung'] },
    searchTerms: ['card', 'credit', 'scadenta', 'due', 'kreditkarte', 'fälligkeit']
  },
  {
    id: 'itp',
    icon: 'itp',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'ITP masina', en: 'Car inspection', de: 'TÜV Auto' },
    description: { ro: 'Inspectie tehnica periodica.', en: 'Periodic technical inspection.', de: 'Periodische technische Untersuchung.' },
    notes: { ro: 'Service, seria CIV, interval 1-2 ani.', en: 'Service, car ID, interval 1-2 years.', de: 'Werkstatt, Fahrzeug-ID, Intervall 1–2 Jahre.' },
    tags: { ro: ['auto', 'inspectie', 'itp'], en: ['car', 'inspection', 'itp'], de: ['auto', 'tüv', 'inspektion'] },
    searchTerms: ['itp', 'inspectie', 'car inspection', 'auto', 'tüv', 'hu', 'inspektion']
  },
  {
    id: 'car-insurance',
    icon: 'carInsurance',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Asigurare auto (RCA/CASCO)', en: 'Car insurance (RCA/CASCO)', de: 'Kfz-Versicherung (Haftpflicht/Vollkasko)' },
    description: { ro: 'Reinnoire polita auto.', en: 'Renew your car policy.', de: 'Autopolice erneuern.' },
    notes: { ro: 'Asigurator, numar polita.', en: 'Insurer, policy number.', de: 'Versicherer, Policennummer.' },
    tags: { ro: ['asigurare', 'auto', 'rca'], en: ['insurance', 'car', 'rca'], de: ['versicherung', 'auto', 'police'] },
    searchTerms: ['asigurare', 'rca', 'casco', 'insurance', 'auto', 'kfz', 'versicherung']
  },
  {
    id: 'home-insurance',
    icon: 'homeInsurance',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Asigurare locuinta', en: 'Home insurance', de: 'Hausratversicherung' },
    description: { ro: 'Reinnoire polita locuinta.', en: 'Renew your home policy.', de: 'Wohnungsversicherung erneuern.' },
    notes: { ro: 'Asigurator, numar polita.', en: 'Insurer, policy number.', de: 'Versicherer, Policennummer.' },
    tags: { ro: ['asigurare', 'locuinta', 'polita'], en: ['insurance', 'home', 'policy'], de: ['versicherung', 'zuhause', 'police'] },
    searchTerms: ['asigurare', 'locuinta', 'home', 'insurance', 'hausrat', 'versicherung']
  },
  {
    id: 'boiler-service',
    icon: 'boiler',
    scheduleType: 'yearly',
    preReminderMinutes: 43200,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Revizie centrala', en: 'Boiler service', de: 'Heizungswartung' },
    description: { ro: 'Verificare tehnica anuala.', en: 'Annual technical check.', de: 'Jährliche technische Prüfung.' },
    notes: { ro: 'Firma service, contract, data.', en: 'Service company, contract, date.', de: 'Servicefirma, Vertrag, Datum.' },
    tags: { ro: ['revizie', 'centrala', 'service'], en: ['service', 'boiler', 'maintenance'], de: ['wartung', 'heizung', 'service'] },
    searchTerms: ['centrala', 'revizie', 'service', 'boiler', 'maintenance', 'heizung', 'wartung']
  },
  {
    id: 'local-taxes',
    icon: 'taxes',
    scheduleType: 'yearly',
    preReminderMinutes: 20160,
    recurrenceRule: 'FREQ=YEARLY',
    title: { ro: 'Taxe locale', en: 'Local taxes', de: 'Kommunale Steuern' },
    description: { ro: 'Impozit auto si locuinta.', en: 'Car and property taxes.', de: 'Kfz- und Grundsteuer.' },
    notes: { ro: 'Primarie, ghiseu, termene.', en: 'City hall, portal, deadlines.', de: 'Rathaus, Portal, Fristen.' },
    tags: { ro: ['taxe', 'impozit', 'primarie'], en: ['taxes', 'property', 'city hall'], de: ['steuern', 'grundsteuer', 'rathaus'] },
    searchTerms: ['taxe', 'impozit', 'taxes', 'primarie', 'steuern', 'grundsteuer']
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

function hasTimezoneOffset(value: string) {
  return /[zZ]$/.test(value) || /[+-]\d{2}:?\d{2}$/.test(value);
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

function toLocalInputValueFromAi(iso: string) {
  if (!iso) return '';
  const normalized = hasTimezoneOffset(iso) ? iso : `${iso}Z`;
  return toLocalInputValue(normalized);
}

function toLocalIsoWithOffset(date: Date) {
  const pad = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetMins = pad(Math.abs(offsetMinutes) % 60);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

function toIsoFromLocalInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toLocalIsoWithOffset(date);
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
    if (locale === 'de') {
      return `in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    }
    return `${days} day${days === 1 ? '' : 's'} before`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (locale === 'ro') {
      return `cu ${hours} ${hours === 1 ? 'ora' : 'ore'} inainte`;
    }
    if (locale === 'de') {
      return `in ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    }
    return `${hours} hour${hours === 1 ? '' : 's'} before`;
  }
  if (locale === 'ro') {
    return `cu ${minutes} min inainte`;
  }
  if (locale === 'de') {
    return `in ${minutes} Min`;
  }
  return `${minutes} min before`;
}

type ReminderFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  copy: any;
  householdId: string | null;
  members: MemberOption[];
  locale: string;
  googleConnected: boolean;
  autoVoice?: boolean;
  contextDefaults?: ContextSettings;
  onVoiceStateChange?: (payload: { status: SpeechStatus; supported: boolean }) => void;
};

const ReminderForm = forwardRef<ReminderFormVoiceHandle, ReminderFormProps>(function ReminderForm({
  action,
  copy,
  householdId,
  members,
  locale,
  googleConnected,
  autoVoice = false,
  contextDefaults,
  onVoiceStateChange
}, ref) {
  const activeLocale: TemplateLocale = locale === 'en' ? 'en' : locale === 'de' ? 'de' : 'ro';
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [lastParsedResult, setLastParsedResult] = useState<AiResult | null>(null);
  const [aiCreateError, setAiCreateError] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<ReminderCategoryId | ''>('');
  const [createMode, setCreateMode] = useState<'ai' | 'manual' | 'medication'>('ai');

  const [templateQuery, setTemplateQuery] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('once');
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [preReminderMinutes, setPreReminderMinutes] = useState('');
  const [assignedMemberId, setAssignedMemberId] = useState('');
  const [kind, setKind] = useState<'generic' | 'medication'>('generic');
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medFrequencyType, setMedFrequencyType] = useState<MedicationFrequencyType>('once_per_day');
  const [medTimesPerDay, setMedTimesPerDay] = useState(2);
  const [medTimesOfDay, setMedTimesOfDay] = useState<string[]>(['08:00']);
  const [medEveryNHours, setMedEveryNHours] = useState(8);
  const [medStartDate, setMedStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [medEndDate, setMedEndDate] = useState('');
  const [medPersonId, setMedPersonId] = useState('');
  const [medAddToCalendar, setMedAddToCalendar] = useState(false);
  const [aiHighlight, setAiHighlight] = useState(false);
  const [autoCreateSource, setAutoCreateSource] = useState<'voice' | 'ai' | null>(null);
  const [voiceUseAi, setVoiceUseAi] = useState(true);
  const [voiceCreateMode, setVoiceCreateMode] = useState<'review' | 'auto'>('review');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [voiceMissingMessage, setVoiceMissingMessage] = useState<string | null>(null);
  const [voiceErrorCode, setVoiceErrorCode] = useState<string | null>(null);
  const defaultContext = useMemo(
    () => (contextDefaults ? contextDefaults : getDefaultContextSettings()),
    [contextDefaults]
  );
  const contextDefaultsActive = useMemo(
    () => (contextDefaults ? !isDefaultContextSettings(contextDefaults) : false),
    [contextDefaults]
  );
  const [timeWindowEnabled, setTimeWindowEnabled] = useState(defaultContext.timeWindow?.enabled ?? false);
  const [timeWindowStartHour, setTimeWindowStartHour] = useState(defaultContext.timeWindow?.startHour ?? 9);
  const [timeWindowEndHour, setTimeWindowEndHour] = useState(defaultContext.timeWindow?.endHour ?? 20);
  const [timeWindowDays, setTimeWindowDays] = useState<DayOfWeek[]>(defaultContext.timeWindow?.daysOfWeek ?? []);
  const [calendarBusyEnabled, setCalendarBusyEnabled] = useState(defaultContext.calendarBusy?.enabled ?? false);
  const [calendarSnoozeMinutes, setCalendarSnoozeMinutes] = useState(
    defaultContext.calendarBusy?.snoozeMinutes ?? 15
  );
  const setCreateModeAndKind = useCallback((nextMode: 'ai' | 'manual' | 'medication') => {
    setCreateMode(nextMode);
    setKind(nextMode === 'medication' ? 'medication' : 'generic');
  }, []);
  const formRef = useRef<HTMLFormElement | null>(null);
  const mainCardRef = useRef<HTMLDivElement | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);
  const medicationRef = useRef<HTMLDivElement | null>(null);
  const autoCreateInFlightRef = useRef(false);
  const lastAutoCreateKeyRef = useRef<string | null>(null);
  const lastAiTextRef = useRef('');
  const titleRef = useRef<HTMLInputElement | null>(null);
  const dueAtRef = useRef<HTMLInputElement | null>(null);
  const aiCharCount = aiText.length;

  const memberOptions = useMemo(
    () => [{ id: '', label: copy.remindersNew.assigneeNone }, ...members],
    [members, copy.remindersNew.assigneeNone]
  );
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const dayOptions = useMemo(
    () => ([
      { value: 'monday', label: copy.remindersNew.contextDayMonday },
      { value: 'tuesday', label: copy.remindersNew.contextDayTuesday },
      { value: 'wednesday', label: copy.remindersNew.contextDayWednesday },
      { value: 'thursday', label: copy.remindersNew.contextDayThursday },
      { value: 'friday', label: copy.remindersNew.contextDayFriday },
      { value: 'saturday', label: copy.remindersNew.contextDaySaturday },
      { value: 'sunday', label: copy.remindersNew.contextDaySunday }
    ] as const),
    [
      copy.remindersNew.contextDayFriday,
      copy.remindersNew.contextDayMonday,
      copy.remindersNew.contextDaySaturday,
      copy.remindersNew.contextDaySunday,
      copy.remindersNew.contextDayThursday,
      copy.remindersNew.contextDayTuesday,
      copy.remindersNew.contextDayWednesday
    ]
  );
  const scheduleLabels = useMemo<Record<ScheduleType, string>>(() => ({
    once: copy.remindersNew.once,
    daily: copy.remindersNew.daily,
    weekly: copy.remindersNew.weekly,
    monthly: copy.remindersNew.monthly,
    yearly: copy.remindersNew.yearly
  }), [
    copy.remindersNew.daily,
    copy.remindersNew.monthly,
    copy.remindersNew.once,
    copy.remindersNew.weekly,
    copy.remindersNew.yearly
  ]);

  useEffect(() => {
    if (medFrequencyType !== 'times_per_day') return;
    const count = Math.min(4, Math.max(1, medTimesPerDay));
    setMedTimesOfDay((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) {
        next.push(['08:00', '12:00', '18:00', '22:00'][next.length] || '08:00');
      }
      return next;
    });
  }, [medFrequencyType, medTimesPerDay]);

  useEffect(() => {
    if (medFrequencyType === 'once_per_day' || medFrequencyType === 'every_n_hours') {
      setMedTimesOfDay((prev) => [prev[0] || '08:00']);
    }
  }, [medFrequencyType]);

  useEffect(() => {
    if (!googleConnected) {
      setMedAddToCalendar(false);
    }
  }, [googleConnected]);

  const medicationDetails = useMemo<MedicationDetails | null>(() => {
    if (kind !== 'medication') return null;
    const times =
      medFrequencyType === 'times_per_day'
        ? medTimesOfDay.slice(0, Math.min(4, Math.max(1, medTimesPerDay)))
        : medTimesOfDay.slice(0, 1);
    return {
      name: medName.trim(),
      dose: medDose.trim(),
      personId: medPersonId || null,
      frequencyType: medFrequencyType,
      timesPerDay: medFrequencyType === 'times_per_day' ? medTimesPerDay : undefined,
      everyNHours: medFrequencyType === 'every_n_hours' ? medEveryNHours : undefined,
      timesOfDay: times,
      startDate: medStartDate,
      endDate: medEndDate ? medEndDate : null,
      addToCalendar: medAddToCalendar
    };
  }, [
    kind,
    medAddToCalendar,
    medDose,
    medEveryNHours,
    medFrequencyType,
    medName,
    medPersonId,
    medStartDate,
    medEndDate,
    medTimesOfDay,
    medTimesPerDay
  ]);

  const medicationDetailsJson = useMemo(
    () => (medicationDetails ? JSON.stringify(medicationDetails) : ''),
    [medicationDetails]
  );
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
  const quickTemplates = useMemo(() => ([
    { id: 'rent', label: copy.remindersNew.quickTemplateRent, mode: 'ai' as const, text: copy.remindersNew.quickTemplateRentText },
    { id: 'utilities', label: copy.remindersNew.quickTemplateUtilities, mode: 'ai' as const, text: copy.remindersNew.quickTemplateUtilitiesText },
    { id: 'itp', label: copy.remindersNew.quickTemplateItp, mode: 'ai' as const, text: copy.remindersNew.quickTemplateItpText },
    { id: 'medication', label: copy.remindersNew.quickTemplateMedication, mode: 'medication' as const },
    { id: 'task', label: copy.remindersNew.quickTemplateTask, mode: 'ai' as const, text: copy.remindersNew.quickTemplateTaskText }
  ]), [
    copy.remindersNew.quickTemplateItp,
    copy.remindersNew.quickTemplateItpText,
    copy.remindersNew.quickTemplateMedication,
    copy.remindersNew.quickTemplateRent,
    copy.remindersNew.quickTemplateRentText,
    copy.remindersNew.quickTemplateTask,
    copy.remindersNew.quickTemplateTaskText,
    copy.remindersNew.quickTemplateUtilities,
    copy.remindersNew.quickTemplateUtilitiesText
  ]);
  const handleQuickTemplateSelect = useCallback((template: (typeof quickTemplates)[number]) => {
    setCreateModeAndKind(template.mode);
    setAiError(null);
    setVoiceMissingMessage(null);
    setVoiceErrorCode(null);
    if (template.mode === 'ai') {
      setAiText(template.text ?? '');
    }
    if (template.mode === 'medication') {
      setMedName(copy.remindersNew.quickTemplateMedicationName);
    }
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        mainCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [
    copy.remindersNew.quickTemplateMedicationName,
    mainCardRef,
    setCreateModeAndKind,
    setAiError,
    setAiText,
    setMedName,
    setVoiceErrorCode,
    setVoiceMissingMessage
  ]);

  const triggerHighlight = useCallback(() => {
    setAiHighlight(true);
    if (highlightTimer.current) {
      window.clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = window.setTimeout(() => setAiHighlight(false), 1500);
  }, []);
  const openAdvancedOptions = useCallback(() => {
    setAdvancedOpen(true);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [detailsRef]);

  const parseReminderText = useCallback(async (textToParse: string, showErrors: boolean) => {
    const normalizedText = textToParse.trim();
    if (!normalizedText) {
      if (showErrors) {
        setAiError(copy.remindersNew.aiMissingText);
      }
      return null;
    }
    if (!householdId) {
      if (showErrors) {
        setAiError(copy.remindersNew.aiMissingHousehold);
      }
      return null;
    }
    setAiLoading(true);
    setAutoCreateSource(null);
    setAiStatus('parsing');
    setLastParsedResult(null);
    setAiCreateError(null);
    autoCreateInFlightRef.current = false;
    lastAutoCreateKeyRef.current = null;
    if (showErrors) {
      setAiError(null);
    }
    setAiText(normalizedText);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const response = await fetch('/api/ai/parse-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: normalizedText,
          timezone,
          householdId,
          clientNow: toLocalIsoWithOffset(new Date())
        })
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        if (showErrors) {
          setAiError(errorBody.error || copy.remindersNew.aiFailed);
        }
        setAiStatus('error');
        return null;
      }
      return (await response.json()) as AiResult;
    } catch (error) {
      console.error('[ai] parse reminder failed', error);
      if (showErrors) {
        setAiError(copy.remindersNew.aiFailed);
      }
      setAiStatus('error');
      return null;
    } finally {
      setAiLoading(false);
    }
  }, [
    copy.remindersNew.aiFailed,
    copy.remindersNew.aiMissingHousehold,
    copy.remindersNew.aiMissingText,
    householdId
  ]);

  const applyParsedReminder = useCallback((data: AiResult) => {
    setTitle(data.title || '');
    setNotes(data.description || '');
    setDueAt(data.dueAt ? toLocalInputValueFromAi(data.dueAt) : '');
    setRecurrenceRule(data.recurrenceRule || '');
    setPreReminderMinutes(
      data.preReminderMinutes !== null && data.preReminderMinutes !== undefined
        ? String(data.preReminderMinutes)
        : ''
    );
    setAssignedMemberId(data.assignedMemberId || '');
    setScheduleType(deriveScheduleType(data.recurrenceRule));
    setCategoryId(data.categoryId || '');
    setLastParsedResult(data);
    setAiStatus('ready');
    setAiCreateError(null);
    triggerHighlight();
  }, [triggerHighlight]);

  const getCompleteness = useCallback((data: AiResult) => {
    const missing: string[] = [];
    if (!data.title) {
      missing.push('title');
    }
    if (!data.dueAt && !data.recurrenceRule) {
      missing.push('due_at');
    }
    return { complete: missing.length === 0, missing };
  }, []);

  const buildFormDataFromParsed = useCallback((data: AiResult, source: 'voice' | 'ai') => {
    const formData = new FormData();
    const localDueAt = data.dueAt ? toLocalInputValueFromAi(data.dueAt) : '';
    const preReminderValue =
      data.preReminderMinutes !== null && data.preReminderMinutes !== undefined
        ? String(data.preReminderMinutes)
        : preReminderMinutes;
    const resolvedCategory = data.categoryId || categoryId;

    formData.set('voice_auto', source === 'voice' ? '1' : '');
    formData.set('kind', kind);
    formData.set('title', data.title || title);
    formData.set('notes', data.description || notes);
    formData.set('schedule_type', deriveScheduleType(data.recurrenceRule));
    formData.set('recurrence_rule', data.recurrenceRule || '');
    formData.set('pre_reminder_minutes', preReminderValue || '');
    formData.set('assigned_member_id', data.assignedMemberId || assignedMemberId);
    formData.set('medication_details', medicationDetailsJson);
    formData.set('medication_add_to_calendar', medAddToCalendar ? '1' : '');
    formData.set('context_category', resolvedCategory && resolvedCategory !== 'default' ? resolvedCategory : '');
    formData.set('due_at', localDueAt);
    formData.set('due_at_iso', localDueAt ? toIsoFromLocalInput(localDueAt) : '');
    formData.set('tz', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

    if (timeWindowEnabled) {
      formData.set('context_time_window_enabled', '1');
      formData.set('context_time_start_hour', String(timeWindowStartHour));
      formData.set('context_time_end_hour', String(timeWindowEndHour));
      timeWindowDays.forEach((day) => formData.append('context_time_days', day));
    }
    if (calendarBusyEnabled) {
      formData.set('context_calendar_busy_enabled', '1');
      formData.set('context_calendar_snooze_minutes', String(calendarSnoozeMinutes));
    }
    return formData;
  }, [
    assignedMemberId,
    calendarBusyEnabled,
    calendarSnoozeMinutes,
    categoryId,
    kind,
    medAddToCalendar,
    medicationDetailsJson,
    notes,
    preReminderMinutes,
    timeWindowDays,
    timeWindowEnabled,
    timeWindowEndHour,
    timeWindowStartHour,
    title
  ]);

  const runAutoCreate = useCallback(async (data: AiResult, source: 'voice' | 'ai') => {
    if (autoCreateInFlightRef.current) return;
    const signature = JSON.stringify({
      title: data.title,
      dueAt: data.dueAt,
      recurrenceRule: data.recurrenceRule,
      preReminderMinutes: data.preReminderMinutes,
      assignedMemberId: data.assignedMemberId,
      categoryId: data.categoryId
    });
    if (lastAutoCreateKeyRef.current === signature) return;
    autoCreateInFlightRef.current = true;
    lastAutoCreateKeyRef.current = signature;
    setAiStatus('creating');
    setAiCreateError(null);
    setAutoCreateSource(source);
    if (source === 'voice' && typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        'voice-create-summary',
        JSON.stringify({ title: data.title, dueAt: data.dueAt || null, source: 'voice', ts: Date.now() })
      );
    }
    try {
      const payload = buildFormDataFromParsed(data, source);
      await action(payload);
      setAiStatus('created');
    } catch (error) {
      const digest = (error as { digest?: string } | null)?.digest;
      if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
        return;
      }
      const errorMessage = copy.remindersNew.aiAutoCreateFailed;
      setAiStatus('error');
      setAiCreateError(errorMessage);
      setAutoCreateSource(null);
      console.error('[ai] auto-create failed', error);
    } finally {
      autoCreateInFlightRef.current = false;
    }
  }, [action, buildFormDataFromParsed, copy.remindersNew.aiAutoCreateFailed]);

  const handleVoiceFallback = useCallback((text: string) => {
    setTitle(text);
    setAiText(text);
    setVoiceMissingMessage(null);
    setVoiceErrorCode(null);
    setAiStatus('idle');
    setLastParsedResult(null);
    titleRef.current?.focus();
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleVoiceIncomplete = useCallback((data: AiResult, missing: string[]) => {
    applyParsedReminder(data);
    setVoiceMissingMessage(copy.remindersNew.voiceMissingDate);
    setVoiceErrorCode(null);
    if (missing.includes('due_at')) {
      dueAtRef.current?.focus();
    } else if (missing.includes('title')) {
      titleRef.current?.focus();
    }
    detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [applyParsedReminder, copy.remindersNew.voiceMissingDate]);

  const voice = useSpeechToReminder<AiResult>({
    lang: activeLocale === 'en' ? 'en-US' : activeLocale === 'de' ? 'de-DE' : 'ro-RO',
    autoStart: autoVoice,
    useAi: voiceUseAi,
    parseText: (text) => parseReminderText(text, false),
    isComplete: getCompleteness,
    onParsed: (data) => {
      applyParsedReminder(data);
      setVoiceMissingMessage(null);
      setVoiceErrorCode(null);
      if (voiceCreateMode === 'auto') {
        const { complete } = getCompleteness(data);
        if (complete) {
          void runAutoCreate(data, 'voice');
        }
      }
    },
    onIncomplete: handleVoiceIncomplete,
    onCreate: () => undefined,
    onFallback: handleVoiceFallback,
    onError: (message) => setVoiceErrorCode(message)
  });

  const voiceStatus = voice.status;
  const voiceSupported = voice.supported;
  const voiceTranscript = voice.transcript;
  const voiceStart = voice.start;
  const voiceStop = voice.stop;
  const voiceToggle = voice.toggle;
  const voiceReset = voice.reset;

  const voiceIsReady = voiceStatus === 'listening' || voiceStatus === 'transcribing';
  const voiceIsActive = voiceIsReady || voiceStatus === 'starting';
  const voiceIsProcessing =
    voiceStatus === 'starting' ||
    voiceStatus === 'processing' ||
    voiceStatus === 'parsing' ||
    voiceStatus === 'creating';

  useEffect(() => {
    if (voiceStatus === 'starting' || voiceStatus === 'listening' || voiceStatus === 'transcribing') {
      setAiStatus('transcribing');
      return;
    }
    if (voiceStatus === 'processing' || voiceStatus === 'parsing') {
      setAiStatus('parsing');
      return;
    }
    if (voiceStatus === 'creating') {
      setAiStatus('creating');
    }
  }, [voiceStatus]);

  useImperativeHandle(ref, () => ({
    startVoice: voiceStart,
    stopVoice: voiceStop,
    toggleVoice: voiceToggle,
    supported: voiceSupported,
    status: voiceStatus
  }), [voiceStart, voiceStop, voiceToggle, voiceSupported, voiceStatus]);

  useEffect(() => {
    onVoiceStateChange?.({ status: voiceStatus, supported: voiceSupported });
  }, [onVoiceStateChange, voiceStatus, voiceSupported]);

  useEffect(() => {
    if (voiceStatus === 'creating') {
      voiceReset();
    }
  }, [voiceReset, voiceStatus]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) {
        window.clearTimeout(highlightTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (lastAiTextRef.current === aiText) return;
    lastAiTextRef.current = aiText;
    if (!aiText.trim()) {
      setAiStatus('idle');
      setLastParsedResult(null);
      setAiCreateError(null);
      return;
    }
    if (aiStatus === 'ready' || aiStatus === 'error' || aiStatus === 'created') {
      setAiStatus('idle');
      setLastParsedResult(null);
      setAiCreateError(null);
    }
  }, [aiStatus, aiText]);

  const handleParse = useCallback(async () => {
    const data = await parseReminderText(aiText, true);
    if (!data) {
      return;
    }
    applyParsedReminder(data);
    setVoiceMissingMessage(null);
    setVoiceErrorCode(null);
    if (voiceCreateMode === 'auto') {
      const { complete } = getCompleteness(data);
      if (complete) {
        void runAutoCreate(data, 'ai');
      }
    }
  }, [
    aiText,
    applyParsedReminder,
    getCompleteness,
    parseReminderText,
    runAutoCreate,
    voiceCreateMode
  ]);

  const voiceStatusLabel = useMemo(() => {
    if (voiceStatus === 'starting') return copy.remindersNew.voiceStarting;
    if (voiceStatus === 'processing') return copy.remindersNew.voiceProcessing;
    if (voiceStatus === 'parsing') return copy.remindersNew.voiceParsing;
    if (voiceStatus === 'creating') return copy.remindersNew.voiceProcessing;
    if (voiceStatus === 'transcribing') return copy.remindersNew.voiceTranscribing;
    if (voiceStatus === 'listening') return copy.remindersNew.voiceListening;
    return '';
  }, [
    copy.remindersNew.voiceListening,
    copy.remindersNew.voiceParsing,
    copy.remindersNew.voiceProcessing,
    copy.remindersNew.voiceStarting,
    copy.remindersNew.voiceTranscribing,
    voiceStatus
  ]);

  const voiceErrorMessage = useMemo(() => {
    if (!voiceErrorCode) return null;
    if (voiceErrorCode === 'parse-failed') {
      return copy.remindersNew.voiceParseFailed;
    }
    if (voiceErrorCode === 'not-allowed' || voiceErrorCode === 'service-not-allowed') {
      return copy.remindersNew.voicePermission;
    }
    if (voiceErrorCode === 'no-speech') {
      return copy.remindersNew.voiceNoSpeech;
    }
    if (voiceErrorCode === 'too-short') {
      return copy.remindersNew.voiceTooShort;
    }
    if (voiceErrorCode === 'not-supported') {
      return copy.remindersNew.voiceNotSupported;
    }
    return copy.remindersNew.voiceError;
  }, [
    copy.remindersNew.voiceError,
    copy.remindersNew.voiceNoSpeech,
    copy.remindersNew.voiceNotSupported,
    copy.remindersNew.voiceParseFailed,
    copy.remindersNew.voicePermission,
    copy.remindersNew.voiceTooShort,
    voiceErrorCode
  ]);

  const voiceTranscriptClean = voiceTranscript.trim();
  const previewLocale = activeLocale === 'en' ? 'en-US' : activeLocale === 'de' ? 'de-DE' : 'ro-RO';
  const previewDateValue =
    createMode === 'medication'
      ? medStartDate
        ? `${medStartDate}T${medTimesOfDay[0] || '08:00'}`
        : ''
      : dueAt;
  const previewDateLabel = (() => {
    if (!previewDateValue) return copy.remindersNew.previewDatePlaceholder;
    const date = new Date(previewDateValue);
    if (Number.isNaN(date.getTime())) return copy.remindersNew.previewDatePlaceholder;
    return new Intl.DateTimeFormat(previewLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  })();
  const previewTitleValue = (createMode === 'medication' ? medName : title).trim();
  const previewTitleLabel = previewTitleValue || copy.remindersNew.previewTitlePlaceholder;
  const previewCategory = reminderCategories.find((category) => category.id === categoryId);
  const previewCategoryLabel = previewCategory
    ? previewCategory.label
    : copy.remindersNew.previewCategoryPlaceholder;
  const previewStatusLabel = copy.remindersNew.previewStatus;
  const showPreviewHint = !previewTitleValue && !previewDateValue && !categoryId;
  const modeDescription =
    createMode === 'ai'
      ? copy.remindersNew.modeAiHint
      : createMode === 'manual'
        ? copy.remindersNew.modeManualHint
        : copy.remindersNew.modeMedicationHint;
  const aiReady = aiStatus === 'ready' || aiStatus === 'created';
  const aiBusy = aiStatus === 'parsing' || aiStatus === 'transcribing' || aiStatus === 'creating';
  const aiHasResult = Boolean(lastParsedResult);
  const aiMissingTitle = kind !== 'medication' && !title.trim();
  const aiMissingDate = kind !== 'medication' && !dueAt && !recurrenceRule;
  const aiCompleteness = {
    complete: !(aiMissingTitle || aiMissingDate),
    missing: [aiMissingTitle ? 'title' : null, aiMissingDate ? 'due_at' : null].filter(Boolean)
  } as { complete: boolean; missing: string[] };
  const aiMissingLabels = [
    aiMissingTitle ? copy.remindersNew.titleLabel : null,
    aiMissingDate ? copy.remindersNew.dateLabel : null
  ].filter(Boolean) as string[];
  const aiMissingJoiner = activeLocale === 'de' ? ' und ' : activeLocale === 'en' ? ' and ' : ' și ';
  const aiMissingMessage = aiMissingLabels.length
    ? copy.remindersNew.aiMissingFields.replace('{fields}', aiMissingLabels.join(aiMissingJoiner))
    : '';
  const aiBadgeLabel =
    createMode === 'ai'
      ? aiStatus === 'created'
        ? copy.remindersNew.aiBadgeCreated
        : aiStatus === 'error'
          ? copy.remindersNew.aiBadgeError
          : aiReady
            ? aiMissingMessage || copy.remindersNew.aiBadgeReady
            : ''
      : '';
  const aiSummaryRows = useMemo(() => ([
    { label: copy.remindersNew.titleLabel, value: previewTitleValue || '—' },
    { label: copy.remindersNew.dateLabel, value: previewDateValue ? previewDateLabel : '—' },
    { label: copy.remindersNew.categoryLabel, value: categoryId ? previewCategoryLabel : '—' },
    {
      label: copy.remindersNew.repeatLabel,
      value: recurrenceRule ? recurrenceRule : scheduleLabels[scheduleType] || '—'
    },
    {
      label: copy.remindersNew.preReminderLabel,
      value: preReminderMinutes ? `${preReminderMinutes} ${copy.remindersNew.aiMinutesLabel}` : '—'
    },
    {
      label: copy.remindersNew.assigneeLabel,
      value: memberOptions.find((member) => member.id === assignedMemberId)?.label || '—'
    }
  ]), [
    assignedMemberId,
    categoryId,
    copy.remindersNew.aiMinutesLabel,
    copy.remindersNew.assigneeLabel,
    copy.remindersNew.categoryLabel,
    copy.remindersNew.dateLabel,
    copy.remindersNew.preReminderLabel,
    copy.remindersNew.repeatLabel,
    copy.remindersNew.titleLabel,
    memberOptions,
    preReminderMinutes,
    previewCategoryLabel,
    previewDateLabel,
    previewDateValue,
    previewTitleValue,
    recurrenceRule,
    scheduleLabels,
    scheduleType
  ]);

  return (
    <form ref={formRef} action={action} className="space-y-8">
      <input type="hidden" name="voice_auto" value={autoCreateSource === 'voice' ? '1' : ''} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="due_at" value={dueAt} />
      <input type="hidden" name="medication_details" value={medicationDetailsJson} />
      <input type="hidden" name="medication_add_to_calendar" value={medAddToCalendar ? '1' : ''} />
      <input
        type="hidden"
        name="context_category"
        value={categoryId && categoryId !== 'default' ? categoryId : ''}
      />
      <input
        type="hidden"
        name="due_at_iso"
        value={dueAt ? toIsoFromLocalInput(dueAt) : ''}
      />
      <input
        type="hidden"
        name="tz"
        value={Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-600">{copy.remindersNew.quickTemplatesLabel}</p>
        <div className="flex flex-wrap gap-2">
          {quickTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-50"
              onClick={() => handleQuickTemplateSelect(template)}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <section ref={mainCardRef} className="rounded-2xl border border-borderSubtle bg-white/90 p-6 shadow-soft">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-ink">{copy.remindersNew.createCardTitle}</h2>
          <p className="text-sm text-muted">{copy.remindersNew.createCardSubtitle}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-1">
          {(['ai', 'manual', 'medication'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                createMode === mode
                  ? 'border-sky-300 bg-white text-slate-900 shadow-sm'
                  : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setCreateModeAndKind(mode)}
            >
              {mode === 'ai'
                ? copy.remindersNew.modeAi
                : mode === 'manual'
                  ? copy.remindersNew.modeManual
                  : copy.remindersNew.modeMedication}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{modeDescription}</p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            {createMode === 'ai' ? (
              <div className="space-y-4">
                <textarea
                  className="input"
                  rows={3}
                  placeholder={copy.remindersNew.aiPlaceholder}
                  value={aiText}
                  onChange={(event) => setAiText(event.target.value)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {aiReady ? (
                    <>
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => formRef.current?.requestSubmit()}
                        disabled={!aiCompleteness.complete || aiBusy || aiStatus === 'created'}
                      >
                        {aiBusy ? copy.remindersNew.aiLoading : copy.remindersNew.create}
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={openAdvancedOptions}
                      >
                        {copy.remindersNew.aiEditDetails}
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                        onClick={handleParse}
                        disabled={aiBusy}
                      >
                        {copy.remindersNew.aiRegenerate}
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={handleParse}
                      disabled={aiBusy}
                    >
                      {aiBusy ? copy.remindersNew.aiLoading : copy.remindersNew.aiButton}
                    </button>
                  )}
                  <button
                    className={`btn btn-secondary relative inline-flex items-center gap-2 ${
                      voiceIsActive ? 'border-primary/40 text-primaryStrong' : ''
                    }`}
                    type="button"
                    onClick={() => {
                      if (voiceIsProcessing) return;
                      voiceToggle();
                    }}
                    disabled={!voiceSupported || voiceIsProcessing}
                    aria-label={copy.remindersNew.voiceNavLabel}
                    aria-pressed={voiceIsActive}
                    aria-busy={voiceIsProcessing}
                    title={!voiceSupported ? copy.remindersNew.voiceNotSupported : copy.remindersNew.voiceNavLabel}
                  >
                    {voiceIsReady ? (
                      <span className="absolute -inset-1 rounded-full bg-sky-300/30 animate-ping" aria-hidden="true" />
                    ) : null}
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        strokeWidth="1.5"
                        d="M12 3a3 3 0 013 3v6a3 3 0 11-6 0V6a3 3 0 013-3zm0 14a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7zm0 0v4"
                      />
                    </svg>
                    {copy.remindersNew.voiceQuickCta}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>{copy.remindersNew.aiHint}</span>
                  <span>{aiCharCount} {copy.remindersNew.aiCounterLabel}</span>
                </div>
                <p className="text-xs text-muted">{copy.remindersNew.aiExample}</p>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    checked={voiceUseAi}
                    onChange={(event) => setVoiceUseAi(event.target.checked)}
                  />
                  {copy.remindersNew.voiceUseAi}
                </label>
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {copy.remindersNew.voiceModeLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['review', 'auto'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          voiceCreateMode === mode
                            ? 'border-sky-400 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                        onClick={() => setVoiceCreateMode(mode)}
                      >
                        {mode === 'review'
                          ? copy.remindersNew.voiceModeReview
                          : copy.remindersNew.voiceModeAuto}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted">{copy.remindersNew.voiceModeHint}</p>
                </div>
                {voiceIsReady ? (
                  <div className="text-xs text-muted">{copy.remindersNew.voicePrompt}</div>
                ) : null}
                {voiceSupported ? (
                  <div className="text-xs text-muted">{copy.remindersNew.voiceReadyHint}</div>
                ) : null}
                {voiceStatusLabel ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{voiceStatusLabel}</span>
                    {voiceIsProcessing ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-borderSubtle bg-surfaceMuted px-2 py-0.5 text-[11px]">
                        <span className="h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-slate-600" />
                        <span className="sr-only">{copy.remindersNew.voiceProcessing}</span>
                      </span>
                    ) : null}
                    {voiceStatus === 'transcribing' && voiceTranscriptClean ? (
                      <span className="rounded-full border border-borderSubtle bg-surfaceMuted px-2 py-0.5 text-[11px]">
                        {voiceTranscriptClean}
                      </span>
                    ) : null}
                    {voiceIsReady ? (
                      <button className="btn btn-secondary h-7 px-3 text-xs" type="button" onClick={voiceStop}>
                        {copy.remindersNew.voiceStop}
                      </button>
                    ) : null}
                  </div>
                ) : autoVoice ? (
                  <div className="text-xs text-muted">{copy.remindersNew.voiceAutoActive}</div>
                ) : null}
                {!voiceSupported ? (
                  <div className="text-xs text-muted">{copy.remindersNew.voiceNotSupported}</div>
                ) : null}
                {voiceErrorMessage ? (
                  <div className="text-xs text-rose-600">{voiceErrorMessage}</div>
                ) : null}
                {aiError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{aiError}</div>
                ) : null}
              </div>
            ) : null}

            {createMode === 'manual' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold">{copy.remindersNew.titleLabel}</label>
                  <input
                    className="input"
                    placeholder={copy.remindersNew.titlePlaceholder}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    ref={titleRef}
                    required={kind === 'generic'}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">{copy.remindersNew.dateLabel}</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    ref={dueAtRef}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">{copy.remindersNew.categoryLabel}</label>
                  <select
                    className="input"
                    value={categoryId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCategoryId(value ? (value as ReminderCategoryId) : '');
                    }}
                  >
                    <option value="">{copy.remindersNew.categoryDefault}</option>
                    {reminderCategories.filter((category) => category.id !== 'default').map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                  onClick={openAdvancedOptions}
                >
                  {copy.remindersNew.moreDetailsLink}
                </button>
              </div>
            ) : null}

            {createMode === 'medication' ? (
              <div ref={medicationRef} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">{copy.remindersNew.medicationNameLabel}</label>
                    <input
                      className="input"
                      required={kind === 'medication'}
                      value={medName}
                      onChange={(event) => setMedName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">{copy.remindersNew.medicationDoseLabel}</label>
                    <input
                      className="input"
                      placeholder={copy.remindersNew.medicationDosePlaceholder}
                      value={medDose}
                      onChange={(event) => setMedDose(event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">{copy.remindersNew.medicationFrequencyLabel}</label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {(['once_per_day', 'times_per_day', 'every_n_hours'] as MedicationFrequencyType[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          medFrequencyType === value
                            ? 'border-sky-400 bg-sky-50 text-sky-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                        onClick={() => setMedFrequencyType(value)}
                      >
                        {value === 'once_per_day'
                          ? copy.remindersNew.medicationFrequencyOnce
                          : value === 'times_per_day'
                            ? copy.remindersNew.medicationFrequencyTimes
                            : copy.remindersNew.medicationFrequencyEvery}
                      </button>
                    ))}
                  </div>
                </div>
                {medFrequencyType === 'once_per_day' ? (
                  <div>
                    <label className="text-sm font-semibold">{copy.remindersNew.medicationTimeLabel}</label>
                    <input
                      type="time"
                      className="input"
                      value={medTimesOfDay[0] || '08:00'}
                      onChange={(event) => setMedTimesOfDay([event.target.value])}
                    />
                  </div>
                ) : null}
                {medFrequencyType === 'times_per_day' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-semibold">{copy.remindersNew.medicationTimesPerDayLabel}</label>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        value={medTimesPerDay}
                        onChange={(event) => setMedTimesPerDay(Number(event.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-muted">{medTimesPerDay} {copy.remindersNew.medicationTimesPerDayHint}</div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Array.from({ length: medTimesPerDay }).map((_, index) => (
                        <div key={`time-${index}`}>
                          <label className="text-xs font-semibold text-muted">{copy.remindersNew.medicationTimeSlotLabel} {index + 1}</label>
                          <input
                            type="time"
                            className="input"
                            value={medTimesOfDay[index] || '08:00'}
                            onChange={(event) => {
                              const next = [...medTimesOfDay];
                              next[index] = event.target.value;
                              setMedTimesOfDay(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {medFrequencyType === 'every_n_hours' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-semibold">{copy.remindersNew.medicationEveryHoursLabel}</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        className="input"
                        value={medEveryNHours}
                        onChange={(event) => setMedEveryNHours(Number(event.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">{copy.remindersNew.medicationFirstDoseLabel}</label>
                      <input
                        type="time"
                        className="input"
                        value={medTimesOfDay[0] || '08:00'}
                        onChange={(event) => setMedTimesOfDay([event.target.value])}
                      />
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">{copy.remindersNew.medicationStartLabel}</label>
                    <input
                      type="date"
                      className="input"
                      required={kind === 'medication'}
                      value={medStartDate}
                      onChange={(event) => setMedStartDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">{copy.remindersNew.medicationEndLabel}</label>
                    <input
                      type="date"
                      className="input"
                      value={medEndDate}
                      onChange={(event) => setMedEndDate(event.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
                  onClick={openAdvancedOptions}
                >
                  {copy.remindersNew.moreDetailsLink}
                </button>
              </div>
            ) : null}
          </div>

          <div
            className={`rounded-xl border border-borderSubtle bg-white p-4 shadow-sm transition ${
              aiHighlight ? 'ring-2 ring-sky-200 bg-sky-50/40' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <span>{copy.remindersNew.previewTitle}</span>
              {aiBadgeLabel ? (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                  {aiBadgeLabel}
                </span>
              ) : null}
            </div>
            <div className={`mt-2 text-base font-semibold ${previewTitleValue ? 'text-ink' : 'text-muted'}`}>
              {previewTitleLabel}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{previewDateLabel}</span>
              <span className="rounded-full border border-borderSubtle bg-surfaceMuted px-2 py-0.5 text-[11px] text-muted">
                {previewStatusLabel}
              </span>
            </div>
            <div className="mt-2">
              {categoryId ? (
                <span className="chip">{previewCategoryLabel}</span>
              ) : (
                <span className="text-xs text-muted">{previewCategoryLabel}</span>
              )}
            </div>
            {createMode === 'ai' && aiHasResult ? (
              <div className="mt-4 space-y-2 text-xs text-muted">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {copy.remindersNew.aiSummaryTitle}
                </div>
                <ul className="space-y-1">
                  {aiSummaryRows.map((row) => (
                    <li key={row.label} className="flex items-start justify-between gap-3">
                      <span className="text-muted">{row.label}</span>
                      <span className="font-medium text-slate-700">{row.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {showPreviewHint ? (
              <p className="mt-3 text-xs text-muted">{copy.remindersNew.previewHint}</p>
            ) : null}
            {createMode === 'ai' && aiCreateError ? (
              <p className="mt-3 text-xs text-rose-600">{aiCreateError}</p>
            ) : null}
          </div>
        </div>
        <div
          ref={detailsRef}
          className="mt-6 rounded-2xl border border-borderSubtle bg-surface p-4 shadow-soft"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-ink">{copy.remindersNew.advancedTitle}</div>
              <p className="text-xs text-muted">{copy.remindersNew.detailsSubtitle}</p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-slate-800"
              onClick={() => setAdvancedOpen((prev) => !prev)}
              aria-expanded={advancedOpen}
            >
              <span>{advancedOpen ? copy.remindersNew.advancedToggleClose : copy.remindersNew.advancedToggleOpen}</span>
              <span className={`transition ${advancedOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
          </div>

          {voiceMissingMessage ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {voiceMissingMessage}
            </div>
          ) : null}

          <div className={`mt-4 space-y-4 ${advancedOpen ? '' : 'hidden'}`}>
          <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.recurrenceTitle}</div>
                <p className="text-xs text-muted">{copy.remindersNew.recurrenceSubtitle}</p>
              </div>
              <span className="text-muted">⌄</span>
            </summary>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
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
              <div className="md:col-span-2">
                <label className="text-sm font-semibold">{copy.remindersNew.recurrenceRuleLabel}</label>
                <input
                  name="recurrence_rule"
                  className="input"
                  placeholder={copy.remindersNew.recurrenceRulePlaceholder}
                  value={recurrenceRule}
                  onChange={(event) => setRecurrenceRule(event.target.value)}
                />
              </div>
            </div>
          </details>

          <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.notificationsTitle}</div>
                <p className="text-xs text-muted">{copy.remindersNew.notificationsSubtitle}</p>
              </div>
              <span className="text-muted">⌄</span>
            </summary>
            <div className="mt-4 space-y-4">
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
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                  <span>{copy.remindersNew.contextTitle}</span>
                  {contextDefaultsActive ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                      {copy.remindersNew.contextDefaultsActive}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted">{copy.remindersNew.contextOverrideHint}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="context_time_window_enabled"
                    value="1"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    checked={timeWindowEnabled}
                    onChange={(event) => setTimeWindowEnabled(event.target.checked)}
                  />
                  {copy.remindersNew.contextTimeWindowLabel}
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextStartLabel}</label>
                    <select
                      name="context_time_start_hour"
                      className="input"
                      value={timeWindowStartHour}
                      onChange={(event) => setTimeWindowStartHour(Number(event.target.value))}
                      disabled={!timeWindowEnabled}
                    >
                      {hourOptions.map((hour) => (
                        <option key={`start-${hour}`} value={hour}>
                          {String(hour).padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextEndLabel}</label>
                    <select
                      name="context_time_end_hour"
                      className="input"
                      value={timeWindowEndHour}
                      onChange={(event) => setTimeWindowEndHour(Number(event.target.value))}
                      disabled={!timeWindowEnabled}
                    >
                      {hourOptions.map((hour) => (
                        <option key={`end-${hour}`} value={hour}>
                          {String(hour).padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted">{copy.remindersNew.contextDaysLabel}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dayOptions.map((day) => (
                      <label key={day.value} className="flex items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          name="context_time_days"
                          value={day.value}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                          checked={timeWindowDays.includes(day.value)}
                          onChange={(event) => {
                            setTimeWindowDays((prev) => {
                              if (event.target.checked) {
                                return [...prev, day.value];
                              }
                              return prev.filter((item) => item !== day.value);
                            });
                          }}
                          disabled={!timeWindowEnabled}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.householdTitle}</div>
                <p className="text-xs text-muted">{copy.remindersNew.householdSubtitle}</p>
              </div>
              <span className="text-muted">⌄</span>
            </summary>
            <div className="mt-4">
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
              <p className="mt-2 text-xs text-muted">{copy.remindersNew.householdHint}</p>
            </div>
          </details>

          <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.calendarTitle}</div>
                <p className="text-xs text-muted">{copy.remindersNew.calendarSubtitle}</p>
              </div>
              <span className="text-muted">⌄</span>
            </summary>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="context_calendar_busy_enabled"
                  value="1"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  checked={calendarBusyEnabled}
                  onChange={(event) => setCalendarBusyEnabled(event.target.checked)}
                />
                {copy.remindersNew.contextCalendarLabel}
              </label>
              <p className="text-xs text-muted">{copy.remindersNew.contextCalendarHint}</p>
              <div className="max-w-xs">
                <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextSnoozeLabel}</label>
                <input
                  type="number"
                  name="context_calendar_snooze_minutes"
                  className="input"
                  min={5}
                  max={240}
                  value={calendarSnoozeMinutes}
                  onChange={(event) => setCalendarSnoozeMinutes(Number(event.target.value))}
                  disabled={!calendarBusyEnabled}
                />
              </div>
            </div>
          </details>

          <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.notesLabel}</div>
                <p className="text-xs text-muted">{copy.remindersNew.notesSubtitle}</p>
              </div>
              <span className="text-muted">⌄</span>
            </summary>
            <div className="mt-4">
              <textarea
                name="notes"
                className="input"
                rows={3}
                placeholder={copy.remindersNew.notesPlaceholder}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </details>

          {kind === 'medication' ? (
            <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-ink">{copy.remindersNew.medicationOptionsTitle}</div>
                  <p className="text-xs text-muted">{copy.remindersNew.medicationOptionsSubtitle}</p>
                </div>
                <span className="text-muted">⌄</span>
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-semibold">{copy.remindersNew.medicationPersonLabel}</label>
                  <select
                    className="input"
                    value={medPersonId}
                    onChange={(event) => setMedPersonId(event.target.value)}
                  >
                    <option value="">{copy.remindersNew.medicationPersonSelf}</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>{member.label}</option>
                    ))}
                  </select>
                </div>
                {googleConnected ? (
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                      checked={medAddToCalendar}
                      onChange={(event) => setMedAddToCalendar(event.target.checked)}
                    />
                    {copy.remindersNew.medicationAddCalendar}
                  </label>
                ) : (
                  <div className="text-xs text-muted">{copy.remindersNew.medicationCalendarHint}</div>
                )}
              </div>
            </details>
          ) : null}

          {kind === 'generic' ? (
            <details className="rounded-2xl border border-borderSubtle bg-surface p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.templatesTitle}</div>
                <p className="text-xs text-muted">{copy.remindersNew.templatesSubtitle}</p>
              </div>
                <span className="text-muted">⌄</span>
              </summary>
              <div className="space-y-4 pt-4">
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
                {filteredTemplates.length ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      className="card flex flex-col gap-3 border-dashed border-slate-200 text-left transition hover:border-sky-300 hover:bg-sky-50"
                      onClick={() => {
                        setCreateModeAndKind('medication');
                        setTimeout(() => medicationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                          💊
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink">{copy.remindersNew.modeMedication}</div>
                          <div className="text-xs text-muted">{copy.remindersNew.typeMedicationSubtitle}</div>
                        </div>
                      </div>
                      <div className="text-xs text-muted">{copy.remindersNew.typeMedicationHint}</div>
                    </button>
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
              </div>
            </details>
          ) : null}
          </div>
        </div>

        <ActionSubmitButton
          className="btn btn-primary mt-6 w-full sm:w-auto sm:ml-auto"
          type="submit"
          data-action-feedback={copy.common.actionCreated}
        >
          {copy.remindersNew.create}
        </ActionSubmitButton>
      </section>
    </form>
  );
});

export default ReminderForm;
