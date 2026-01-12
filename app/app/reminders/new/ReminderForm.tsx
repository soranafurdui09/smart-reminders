"use client";

import { useMemo, useState } from 'react';

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

type ReminderTemplate = {
  id: string;
  scheduleType: ScheduleType;
  preReminderMinutes?: number;
  recurrenceRule?: string;
  title: Record<TemplateLocale, string>;
  description: Record<TemplateLocale, string>;
  notes?: Record<TemplateLocale, string>;
  tags: Record<TemplateLocale, string[]>;
  searchTerms?: string[];
};

const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    id: 'birthday',
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
  return date.toISOString().slice(0, 16);
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
  locale
}: {
  action: (formData: FormData) => void;
  copy: any;
  householdId: string | null;
  members: MemberOption[];
  locale: string;
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
  };

  const handleParse = async () => {
    if (!aiText.trim()) {
      setAiError(copy.remindersNew.aiMissingText);
      return;
    }
    if (!householdId) {
      setAiError(copy.remindersNew.aiMissingHousehold);
      return;
    }
    setAiLoading(true);
    setAiError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const response = await fetch('/api/ai/parse-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, timezone, householdId })
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
    } catch (error) {
      console.error('[ai] parse reminder failed', error);
      setAiError(copy.remindersNew.aiFailed);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <form action={action} className="space-y-6">
      <div className="card space-y-3">
        <div>
          <label className="text-sm font-semibold">{copy.remindersNew.aiTitle}</label>
          <textarea
            className="input"
            rows={2}
            placeholder={copy.remindersNew.aiPlaceholder}
            value={aiText}
            onChange={(event) => setAiText(event.target.value)}
          />
        </div>
        {aiError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{aiError}</div>
        ) : null}
        <button className="btn btn-secondary" type="button" onClick={handleParse} disabled={aiLoading}>
          {aiLoading ? copy.remindersNew.aiLoading : copy.remindersNew.aiButton}
        </button>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{copy.remindersNew.templatesTitle}</h2>
            <p className="text-sm text-slate-500">{copy.remindersNew.templatesSubtitle}</p>
          </div>
          <input
            className="input md:w-72"
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
          <div className="grid gap-3 md:grid-cols-2">
            {filteredTemplates.map((template) => {
              const preReminder = template.preReminderMinutes
                ? formatPreReminder(activeLocale, template.preReminderMinutes)
                : '';
              return (
                <div key={template.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{template.title[activeLocale]}</div>
                      <div className="text-xs text-slate-500">{template.description[activeLocale]}</div>
                    </div>
                    <button
                      className="btn btn-secondary whitespace-nowrap"
                      type="button"
                      onClick={() => applyTemplate(template)}
                    >
                      {copy.remindersNew.templatesApply}
                    </button>
                  </div>
                  {template.tags[activeLocale].length ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {template.tags[activeLocale].map((tag) => (
                        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{copy.remindersNew.repeatLabel}: {scheduleLabels[template.scheduleType]}</span>
                    {preReminder ? (
                      <span>{copy.remindersNew.templatesPreReminderLabel}: {preReminder}</span>
                    ) : null}
                  </div>
                  {template.notes?.[activeLocale] ? (
                    <div className="mt-2 text-xs text-slate-400">{template.notes[activeLocale]}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-500">{copy.remindersNew.templatesEmpty}</div>
        )}
      </div>

      <div className="card space-y-4">
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
        <button className="btn btn-primary" type="submit">
          {copy.remindersNew.create}
        </button>
      </div>
    </form>
  );
}
