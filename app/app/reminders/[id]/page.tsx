import Link from 'next/link';
import { format } from 'date-fns';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getReminderById, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { cloneReminder, deleteReminder } from './actions';

export default async function ReminderDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/app/reminders/${params.id}`);
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const reminder = await getReminderById(params.id);
  if (!reminder) {
    return (
      <AppShell locale={locale} userEmail={user.email}>
        <div className="space-y-4">
          <SectionHeader title={copy.reminderDetail.title} description={copy.reminderDetail.notFound} />
          <Link href="/app" className="btn btn-secondary">{copy.common.back}</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell locale={locale} userEmail={user.email}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>{copy.reminderDetail.title}</h1>
            <p className="text-sm text-muted">{reminder.title}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={cloneReminder}>
              <input type="hidden" name="reminderId" value={reminder.id} />
              <button className="btn btn-secondary" type="submit">{copy.reminderDetail.clone}</button>
            </form>
            <form action={deleteReminder}>
              <input type="hidden" name="reminderId" value={reminder.id} />
              <button className="btn btn-secondary" type="submit">{copy.common.delete}</button>
            </form>
            <Link href="/app" className="btn btn-secondary">{copy.common.back}</Link>
          </div>
        </div>

        <section>
          <SectionHeader title={copy.reminderDetail.details} />
          <div className="card space-y-3">
            <div className="text-sm text-muted">{copy.reminderDetail.schedule}</div>
            <div className="text-sm font-semibold text-ink">
              {reminder.schedule_type === 'once'
                ? copy.remindersNew.once
                : reminder.schedule_type === 'daily'
                  ? copy.remindersNew.daily
                  : reminder.schedule_type === 'weekly'
                    ? copy.remindersNew.weekly
                    : reminder.schedule_type === 'monthly'
                      ? copy.remindersNew.monthly
                      : reminder.schedule_type === 'yearly'
                        ? copy.remindersNew.yearly
                        : reminder.schedule_type}
            </div>
            {reminder.due_at ? (
              <div className="text-sm text-muted">
                {copy.reminderDetail.firstDate}: {format(new Date(reminder.due_at), 'dd MMM yyyy HH:mm')}
              </div>
            ) : null}
            {reminder.notes ? <p className="text-sm text-muted">{reminder.notes}</p> : null}
          </div>
        </section>

        <section>
          <SectionHeader title={copy.reminderDetail.occurrences} />
          <div className="grid gap-3 md:grid-cols-2">
            {(reminder.reminder_occurrences || []).map((occurrence: any) => (
              <div key={occurrence.id} className="card space-y-2">
                <div className="text-sm text-muted">{format(new Date(occurrence.occur_at), 'dd MMM yyyy HH:mm')}</div>
                <div className="text-sm font-semibold text-ink">
                  {occurrence.status === 'done'
                    ? copy.common.done
                    : occurrence.status === 'snoozed'
                      ? copy.common.statusSnoozed
                      : copy.common.statusOpen}
                </div>
                {occurrence.done_comment ? (
                  <div className="text-xs text-muted">
                    {copy.common.commentLabel}: {occurrence.done_comment}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
