import Link from 'next/link';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getReminderById, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
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

  return (
    <AppShell locale={locale} userEmail={user.email}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader title={copy.reminderDetail.editTitle} description={reminder.title} />
          <Link href={`/app/reminders/${reminder.id}`} className="btn btn-secondary">
            {copy.common.back}
          </Link>
        </div>

        <form action={updateReminder} className="card space-y-4 max-w-2xl">
          <input type="hidden" name="reminderId" value={reminder.id} />
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
          <div className="flex flex-wrap items-center gap-2">
            <ActionSubmitButton className="btn btn-primary" type="submit" data-action-feedback={copy.common.actionSaved}>
              {copy.common.save}
            </ActionSubmitButton>
            <Link href={`/app/reminders/${reminder.id}`} className="btn btn-secondary">
              {copy.common.back}
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
