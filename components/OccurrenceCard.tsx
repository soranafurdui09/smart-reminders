import Link from 'next/link';
import { format } from 'date-fns';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder, deleteReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';

export default function OccurrenceCard({ occurrence, locale = defaultLocale }: { occurrence: any; locale?: Locale }) {
  const copy = messages[locale];
  const reminder = occurrence.reminder;
  const reminderId = reminder?.id;
  const statusLabel = occurrence.status === 'done'
    ? copy.common.done
    : occurrence.status === 'snoozed'
      ? copy.common.statusSnoozed
      : copy.common.statusOpen;
  const statusClass = occurrence.status === 'done'
    ? 'border-success/20 bg-success/10 text-success'
    : occurrence.status === 'snoozed'
      ? 'border-warning/20 bg-warning/10 text-warning'
      : 'border-primary/20 bg-primarySoft text-primaryStrong';
  const commentText = occurrence.done_comment || copy.common.commentEmpty;
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <span className="chip">
            {format(new Date(occurrence.occur_at), 'dd MMM yyyy HH:mm')}
          </span>
          <div className="text-lg font-semibold text-ink">{reminder?.title}</div>
          <div className="text-sm text-muted">{commentText}</div>
        </div>
        <span className={`pill border ${statusClass}`}>{statusLabel}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <details className="relative">
          <summary className="btn btn-secondary dropdown-summary px-3 text-lg leading-none" aria-label={copy.common.moreActions}>
            <span aria-hidden="true">...</span>
          </summary>
          <div className="absolute left-0 z-20 mt-3 w-56 rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft">
            {reminderId ? (
              <div className="space-y-1">
                <Link className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted" href={`/app/reminders/${reminderId}`}>
                  {copy.common.details}
                </Link>
                <form action={cloneReminder}>
                  <input type="hidden" name="reminderId" value={reminderId} />
                  <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted" type="submit">
                    {copy.reminderDetail.clone}
                  </button>
                </form>
                <form action={deleteReminder}>
                  <input type="hidden" name="reminderId" value={reminderId} />
                  <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" type="submit">
                    {copy.common.delete}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="btn btn-secondary dropdown-summary">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                />
              </svg>
              {copy.common.snooze}
            </summary>
            <div className="absolute right-0 z-20 mt-3 w-48 rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft">
              <form action={snoozeOccurrence}>
                <input type="hidden" name="occurrenceId" value={occurrence.id} />
                <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                <input type="hidden" name="mode" value="10" />
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted" type="submit">
                  {copy.common.snooze10}
                </button>
              </form>
              <form action={snoozeOccurrence}>
                <input type="hidden" name="occurrenceId" value={occurrence.id} />
                <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                <input type="hidden" name="mode" value="60" />
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted" type="submit">
                  {copy.common.snooze60}
                </button>
              </form>
              <form action={snoozeOccurrence}>
                <input type="hidden" name="occurrenceId" value={occurrence.id} />
                <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                <input type="hidden" name="mode" value="tomorrow" />
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted" type="submit">
                  {copy.common.snoozeTomorrow}
                </button>
              </form>
            </div>
          </details>

          <form action={markDone} className="flex flex-col items-end gap-2">
            <input type="hidden" name="occurrenceId" value={occurrence.id} />
            <input type="hidden" name="reminderId" value={reminderId} />
            <input type="hidden" name="occurAt" value={occurrence.occur_at} />
            <details className="self-stretch">
              <summary className="cursor-pointer text-xs font-semibold text-muted dropdown-summary">
                {copy.common.commentOptional}
              </summary>
              <textarea
                name="done_comment"
                rows={2}
                className="input mt-2 w-64 max-w-full"
                placeholder={copy.common.commentPlaceholder}
                aria-label={copy.common.commentLabel}
              />
            </details>
            <button className="btn btn-primary" type="submit">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {copy.common.done}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
