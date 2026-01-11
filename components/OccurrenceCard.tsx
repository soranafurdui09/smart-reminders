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
    <div className="card flex flex-col gap-3">
      <div>
        <div className="text-sm text-slate-500">{format(new Date(occurrence.occur_at), 'dd MMM yyyy HH:mm')}</div>
        <div className="text-lg font-semibold">{reminder?.title}</div>
        <div className="text-xs text-slate-500">{statusLabel}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {reminderId ? (
          <Link className="btn btn-secondary" href={`/app/reminders/${reminderId}`}>{copy.common.details}</Link>
        ) : null}
        {reminderId ? (
          <form action={cloneReminder}>
            <input type="hidden" name="reminderId" value={reminderId} />
            <button className="btn btn-secondary" type="submit">{copy.reminderDetail.clone}</button>
          </form>
        ) : null}
        <form action={markDone}>
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="reminderId" value={reminderId} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at} />
          <button className="btn btn-primary" type="submit">{copy.common.done}</button>
        </form>
        <form action={snoozeOccurrence}>
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at} />
          <input type="hidden" name="mode" value="10" />
          <button className="btn btn-secondary" type="submit">{copy.common.snooze10}</button>
        </form>
        <form action={snoozeOccurrence}>
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at} />
          <input type="hidden" name="mode" value="60" />
          <button className="btn btn-secondary" type="submit">{copy.common.snooze60}</button>
        </form>
        <form action={snoozeOccurrence}>
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at} />
          <input type="hidden" name="mode" value="tomorrow" />
          <button className="btn btn-secondary" type="submit">{copy.common.snoozeTomorrow}</button>
        </form>
      </div>
    </div>
  );
}
