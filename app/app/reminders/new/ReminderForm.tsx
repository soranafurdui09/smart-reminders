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

function deriveScheduleType(rule: string | null) {
  const normalized = (rule || '').toUpperCase();
  if (normalized.includes('FREQ=DAILY')) return 'daily';
  if (normalized.includes('FREQ=WEEKLY')) return 'weekly';
  if (normalized.includes('FREQ=MONTHLY')) return 'monthly';
  return 'once';
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 16);
}

export default function ReminderForm({
  action,
  copy,
  householdId,
  members
}: {
  action: (formData: FormData) => void;
  copy: any;
  householdId: string | null;
  members: MemberOption[];
}) {
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
