import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getReminderById, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { parseContextSettings, type DayOfWeek } from '@/lib/reminders/context';
import type { MedicationDetails, MedicationFrequencyType } from '@/lib/reminders/medication';
import { getUserGoogleConnection } from '@/lib/google/calendar';
import { updateReminder } from '../actions';

function toLocalInputValue(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 16);
}

export default async function EditReminderPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/app/reminders/${params.id}/edit`);
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const reminder = await getReminderById(params.id);
  const googleConnection = await getUserGoogleConnection(user.id);

  if (!reminder) {
    return (
      <AppShell locale={locale} userEmail={user.email}>
        <div className="space-y-4">
          <SectionHeader title={copy.reminderDetail.editTitle} description={copy.reminderDetail.notFound} />
          <Link href="/app" className="btn btn-secondary">{copy.common.back}</Link>
        </div>
      </AppShell>
    );
  }

  const members = reminder.household_id
    ? await getHouseholdMembers(reminder.household_id)
    : [];
  const memberOptions = members.map((member: any) => ({
    id: member.id,
    label: member.profiles?.name || member.profiles?.email || member.user_id
  }));
  const contextSettings = parseContextSettings(reminder.context_settings ?? null);
  const timeWindow = contextSettings.timeWindow ?? { enabled: false, startHour: 9, endHour: 20, daysOfWeek: [] };
  const calendarBusy = contextSettings.calendarBusy ?? { enabled: false, snoozeMinutes: 15 };
  const hourOptions = Array.from({ length: 24 }, (_, index) => index);
  const dayOptions: { value: DayOfWeek; label: string }[] = [
    { value: 'monday', label: copy.remindersNew.contextDayMonday },
    { value: 'tuesday', label: copy.remindersNew.contextDayTuesday },
    { value: 'wednesday', label: copy.remindersNew.contextDayWednesday },
    { value: 'thursday', label: copy.remindersNew.contextDayThursday },
    { value: 'friday', label: copy.remindersNew.contextDayFriday },
    { value: 'saturday', label: copy.remindersNew.contextDaySaturday },
    { value: 'sunday', label: copy.remindersNew.contextDaySunday }
  ];
  const medicationDetails = (reminder.medication_details as MedicationDetails | null) ?? null;
  const medFrequency: MedicationFrequencyType = medicationDetails?.frequencyType ?? 'once_per_day';
  const medTimes = Array.isArray(medicationDetails?.timesOfDay)
    ? medicationDetails?.timesOfDay ?? []
    : [];
  const timeInputs = [...medTimes, '', '', ''].slice(0, 4);

  return (
    <AppShell locale={locale} userEmail={user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title={copy.reminderDetail.editTitle} description={reminder.title} />
          <Link href={`/app/reminders/${reminder.id}`} className="btn btn-secondary">
            {copy.common.back}
          </Link>
        </div>

        {reminder.kind === 'medication' ? (
          <form action={updateReminder} className="card space-y-4 max-w-2xl">
            <input type="hidden" name="reminderId" value={reminder.id} />
            <input type="hidden" name="context_category" value={contextSettings?.category ?? ''} />
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.medicationNameLabel}</label>
              <input
                name="med_name"
                className="input"
                defaultValue={medicationDetails?.name || reminder.title || ''}
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.medicationDoseLabel}</label>
              <input
                name="med_dose"
                className="input"
                defaultValue={medicationDetails?.dose ?? ''}
                placeholder={copy.remindersNew.medicationDosePlaceholder}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.medicationPersonLabel}</label>
              <select
                name="med_person_id"
                className="input"
                defaultValue={medicationDetails?.personId ?? reminder.assigned_member_id ?? ''}
              >
                <option value="">{copy.remindersNew.medicationPersonSelf}</option>
                {memberOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.medicationFrequencyLabel}</label>
              <select name="med_frequency_type" className="input" defaultValue={medFrequency}>
                <option value="once_per_day">{copy.remindersNew.medicationFrequencyOnce}</option>
                <option value="times_per_day">{copy.remindersNew.medicationFrequencyTimes}</option>
                <option value="every_n_hours">{copy.remindersNew.medicationFrequencyEvery}</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.medicationTimesPerDayLabel}</label>
                <input
                  name="med_times_per_day"
                  type="number"
                  min={1}
                  max={4}
                  className="input"
                  defaultValue={medicationDetails?.timesPerDay ?? (medTimes.length || 1)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.medicationEveryHoursLabel}</label>
                <input
                  name="med_every_n_hours"
                  type="number"
                  min={1}
                  max={24}
                  className="input"
                  defaultValue={medicationDetails?.everyNHours ?? 8}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {timeInputs.map((value, index) => (
                <div key={`med-time-${index}`}>
                  <label className="text-xs font-semibold text-muted">{copy.remindersNew.medicationTimeSlotLabel} {index + 1}</label>
                  <input
                    name={`med_time_${index + 1}`}
                    type="time"
                    className="input"
                    defaultValue={value || ''}
                  />
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.medicationStartLabel}</label>
                <input
                  name="med_start_date"
                  type="date"
                  className="input"
                  defaultValue={medicationDetails?.startDate || ''}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.medicationEndLabel}</label>
                <input
                  name="med_end_date"
                  type="date"
                  className="input"
                  defaultValue={medicationDetails?.endDate || ''}
                />
              </div>
            </div>
            {googleConnection ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="med_add_to_calendar"
                  value="1"
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                  defaultChecked={Boolean(medicationDetails?.addToCalendar)}
                />
                {copy.remindersNew.medicationAddCalendar}
              </label>
            ) : (
              <div className="text-xs text-muted">{copy.remindersNew.medicationCalendarHint}</div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <ActionSubmitButton className="btn btn-primary" type="submit" data-action-feedback={copy.common.actionSaved}>
                {copy.common.save}
              </ActionSubmitButton>
              <Link href={`/app/reminders/${reminder.id}`} className="btn btn-secondary">
                {copy.common.back}
              </Link>
            </div>
          </form>
        ) : (
          <form action={updateReminder} className="card space-y-4 max-w-2xl">
            <input type="hidden" name="reminderId" value={reminder.id} />
            <input type="hidden" name="context_category" value={contextSettings?.category ?? ''} />
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.titleLabel}</label>
              <input
                name="title"
                className="input"
                defaultValue={reminder.title ?? ''}
                placeholder={copy.remindersNew.titlePlaceholder}
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{copy.remindersNew.notesLabel}</label>
              <textarea
                name="notes"
                className="input"
                rows={3}
                defaultValue={reminder.notes ?? ''}
                placeholder={copy.remindersNew.notesPlaceholder}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.dateLabel}</label>
                <input
                  name="due_at"
                  type="datetime-local"
                  className="input"
                  defaultValue={toLocalInputValue(reminder.due_at)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.repeatLabel}</label>
                <select name="schedule_type" className="input" defaultValue={reminder.schedule_type ?? 'once'}>
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
                  defaultValue={reminder.pre_reminder_minutes ?? ''}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">{copy.remindersNew.assigneeLabel}</label>
                <select
                  name="assigned_member_id"
                  className="input"
                  defaultValue={reminder.assigned_member_id ?? ''}
                >
                  <option value="">{copy.remindersNew.assigneeNone}</option>
                  {memberOptions.map((member) => (
                    <option key={member.id} value={member.id}>
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
                defaultValue={reminder.recurrence_rule ?? ''}
                placeholder={copy.remindersNew.recurrenceRulePlaceholder}
              />
            </div>
            <div className="rounded-2xl border border-borderSubtle bg-surfaceMuted/60 p-4 space-y-4">
              <div>
                <div className="text-sm font-semibold text-ink">{copy.remindersNew.contextTitle}</div>
                <p className="text-xs text-muted">{copy.remindersNew.contextSubtitle}</p>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="context_time_window_enabled"
                    value="1"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    defaultChecked={timeWindow.enabled}
                  />
                  {copy.remindersNew.contextTimeWindowLabel}
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextStartLabel}</label>
                    <select
                      name="context_time_start_hour"
                      className="input"
                      defaultValue={timeWindow.startHour}
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
                      defaultValue={timeWindow.endHour}
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
                          defaultChecked={timeWindow.daysOfWeek.includes(day.value)}
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="context_calendar_busy_enabled"
                    value="1"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                    defaultChecked={calendarBusy.enabled}
                  />
                  {copy.remindersNew.contextCalendarLabel}
                </label>
                <div className="max-w-xs">
                  <label className="text-xs font-semibold text-muted">{copy.remindersNew.contextSnoozeLabel}</label>
                  <input
                    type="number"
                    name="context_calendar_snooze_minutes"
                    className="input"
                    min={5}
                    max={240}
                    defaultValue={calendarBusy.snoozeMinutes}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionSubmitButton className="btn btn-primary" type="submit" data-action-feedback={copy.common.actionSaved}>
                {copy.common.save}
              </ActionSubmitButton>
              <Link href={`/app/reminders/${reminder.id}`} className="btn btn-secondary">
                {copy.common.back}
              </Link>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
