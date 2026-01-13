import Link from 'next/link';
import { format } from 'date-fns';
import AppShell from '@/components/AppShell';
import SectionHeader from '@/components/SectionHeader';
import { requireUser } from '@/lib/auth';
import { getHouseholdMembers, getReminderById, getUserLocale } from '@/lib/data';
import { messages } from '@/lib/i18n';
import { cloneReminder } from './actions';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { getUserGoogleConnection } from '@/lib/google/calendar';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';

export default async function ReminderDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/app/reminders/${params.id}`);
  const locale = await getUserLocale(user.id);
  const copy = messages[locale];
  const reminder = await getReminderById(params.id);
  const googleConnection = await getUserGoogleConnection(user.id);
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

  const members = reminder.household_id
    ? await getHouseholdMembers(reminder.household_id)
    : [];
  const memberMap = new Map(
    members.map((member: any) => [
      member.id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const memberUserMap = new Map(
    members.map((member: any) => [
      member.user_id,
      member.profiles?.name || member.profiles?.email || member.user_id
    ])
  );
  const assigneeLabel = reminder.assigned_member_id
    ? memberMap.get(reminder.assigned_member_id) || copy.common.assigneeUnassigned
    : copy.common.assigneeUnassigned;

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
              <ActionSubmitButton className="btn btn-secondary" type="submit" data-action-feedback={copy.common.actionCloned}>
                {copy.reminderDetail.clone}
              </ActionSubmitButton>
            </form>
            <GoogleCalendarDeleteDialog
              reminderId={reminder.id}
              hasGoogleEvent={Boolean(reminder.google_event_id)}
              copy={{
                label: copy.common.delete,
                dialogTitle: copy.reminderDetail.googleCalendarDeleteTitle,
                dialogHint: copy.reminderDetail.googleCalendarDeleteHint,
                justReminder: copy.reminderDetail.googleCalendarDeleteOnly,
                reminderAndCalendar: copy.reminderDetail.googleCalendarDeleteBoth,
                cancel: copy.reminderDetail.googleCalendarDeleteCancel
              }}
            />
            <Link href={`/app/reminders/${reminder.id}/edit`} className="btn btn-secondary">
              {copy.common.edit}
            </Link>
            <GoogleCalendarSyncButton
              reminderId={reminder.id}
              connected={Boolean(googleConnection)}
              copy={{
                syncLabel: copy.reminderDetail.googleCalendarSync,
                syncLoading: copy.reminderDetail.googleCalendarSyncing,
                syncSuccess: copy.reminderDetail.googleCalendarSyncSuccess,
                syncError: copy.reminderDetail.googleCalendarSyncError,
                connectFirst: copy.reminderDetail.googleCalendarConnectFirst,
                connectLink: copy.reminderDetail.googleCalendarConnectLink
              }}
            />
            <GoogleCalendarAutoBlockButton
              reminderId={reminder.id}
              connected={Boolean(googleConnection)}
              hasDueDate={Boolean(reminder.due_at)}
              copy={{
                label: copy.reminderDetail.googleCalendarAutoBlock,
                loading: copy.reminderDetail.googleCalendarAutoBlocking,
                success: copy.reminderDetail.googleCalendarAutoBlockSuccess,
                error: copy.reminderDetail.googleCalendarAutoBlockError,
                connectHint: copy.reminderDetail.googleCalendarConnectFirst,
                connectLink: copy.reminderDetail.googleCalendarConnectLink,
                missingDueDate: copy.reminderDetail.googleCalendarAutoBlockMissingDueDate
              }}
            />
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
            <div className="text-sm text-muted">
              {copy.common.assigneeLabel}: {assigneeLabel}
            </div>
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
                {occurrence.performed_by && (occurrence.status === 'done' || occurrence.status === 'snoozed') ? (
                  <div className="text-xs text-muted">
                    {occurrence.status === 'done'
                      ? copy.common.doneBy
                      : occurrence.status === 'snoozed'
                        ? copy.common.snoozedBy
                        : null}{' '}
                    {memberUserMap.get(occurrence.performed_by) || copy.history.performerUnknown}
                  </div>
                ) : null}
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
