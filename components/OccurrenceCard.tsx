import Link from 'next/link';
import { format } from 'date-fns';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
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
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{format(new Date(occurrence.occur_at), 'dd MMM yyyy HH:mm')}</div>
          <div className="text-lg font-semibold">{reminder?.title}</div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <form action={markDone} className="flex flex-col items-end gap-2">
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="reminderId" value={reminderId} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at} />
          <details className="self-stretch">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500 dropdown-summary">
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
          <button className="btn btn-primary" type="submit">{copy.common.done}</button>
        </form>

        <details className="relative">
          <summary className="btn btn-secondary dropdown-summary px-3 text-lg leading-none" aria-label={copy.common.moreActions}>
            <span aria-hidden="true">...</span>
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {reminderId ? (
              <div className="space-y-1">
                <Link className="block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100" href={`/app/reminders/${reminderId}`}>
                  {copy.common.details}
                </Link>
                <form action={cloneReminder}>
                  <input type="hidden" name="reminderId" value={reminderId} />
                  <button className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100" type="submit">
                    {copy.reminderDetail.clone}
                  </button>
                </form>
              </div>
            ) : null}
            <div className="my-2 h-px bg-slate-100" />
            <div className="space-y-1">
              <div className="px-2 pt-1 text-xs font-semibold uppercase text-slate-400">{copy.common.snooze}</div>
              <form action={snoozeOccurrence}>
                <input type="hidden" name="occurrenceId" value={occurrence.id} />
                <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                <input type="hidden" name="mode" value="10" />
                <button className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100" type="submit">
                  {copy.common.snooze10}
                </button>
              </form>
              <form action={snoozeOccurrence}>
                <input type="hidden" name="occurrenceId" value={occurrence.id} />
                <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                <input type="hidden" name="mode" value="60" />
                <button className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100" type="submit">
                  {copy.common.snooze60}
                </button>
              </form>
              <form action={snoozeOccurrence}>
                <input type="hidden" name="occurrenceId" value={occurrence.id} />
                <input type="hidden" name="occurAt" value={occurrence.occur_at} />
                <input type="hidden" name="mode" value="tomorrow" />
                <button className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100" type="submit">
                  {copy.common.snoozeTomorrow}
                </button>
              </form>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
