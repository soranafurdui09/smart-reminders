import Link from 'next/link';
import { format } from 'date-fns';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder, deleteReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import OccurrenceDateChip from '@/components/OccurrenceDateChip';
import OccurrenceHighlightCard from '@/components/OccurrenceHighlightCard';
import SmartSnoozeMenu from '@/components/SmartSnoozeMenu';

export default function OccurrenceCard({ occurrence, locale = defaultLocale }: { occurrence: any; locale?: Locale }) {
  const copy = messages[locale];
  const reminder = occurrence.reminder;
  const reminderId = reminder?.id;
  // Next due time comes from the occurrence, with snoozed_until overriding it when present.
  const displayAt = occurrence.snoozed_until ?? occurrence.occur_at;
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
  const commentText = occurrence.done_comment?.trim();
  const assigneeLabel = reminder?.assigned_member_label;
  const performedByLabel = occurrence.performed_by_label;
  const snoozedByLabel = occurrence.status === 'snoozed' ? performedByLabel : null;
  return (
    <OccurrenceHighlightCard
      className="card space-y-4"
      occurrenceId={occurrence.id}
      highlightKey={displayAt}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <OccurrenceDateChip
            occurrenceId={occurrence.id}
            label={format(new Date(displayAt), 'dd MMM yyyy HH:mm')}
            highlightKey={displayAt}
          />
          <div className="text-lg font-semibold text-ink">{reminder?.title}</div>
          {commentText ? (
            <div className="text-sm text-muted">{commentText}</div>
          ) : null}
          {snoozedByLabel ? (
            <div className="text-xs text-muted">
              {copy.common.snoozedBy} {snoozedByLabel}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {assigneeLabel ? (
            <details className="relative">
              <summary className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-borderSubtle bg-surfaceMuted text-ink shadow-sm transition hover:bg-surface dropdown-summary">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeWidth="1.5"
                    d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-max rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-soft">
                {assigneeLabel}
              </div>
            </details>
          ) : null}
          <span className={`pill border ${statusClass}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary
              className="btn btn-secondary dropdown-summary h-10 w-10 p-0 text-lg leading-none"
              aria-label={copy.common.moreActions}
            >
              <span aria-hidden="true">...</span>
            </summary>
            <div className="absolute left-0 z-20 mt-3 w-56 rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft">
              {reminderId ? (
                <div className="space-y-1">
                  <Link
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                    href={`/app/reminders/${reminderId}`}
                    data-action-close="true"
                  >
                    {copy.common.details}
                  </Link>
                  <Link
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                    href={`/app/reminders/${reminderId}/edit`}
                    data-action-close="true"
                  >
                    {copy.common.edit}
                  </Link>
                  <form action={cloneReminder}>
                    <input type="hidden" name="reminderId" value={reminderId} />
                  <ActionSubmitButton
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surfaceMuted"
                    type="submit"
                    data-action-feedback={copy.common.actionCloned}
                  >
                    {copy.reminderDetail.clone}
                  </ActionSubmitButton>
                </form>
                <form action={deleteReminder}>
                  <input type="hidden" name="reminderId" value={reminderId} />
                  <ActionSubmitButton
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    type="submit"
                    data-action-feedback={copy.common.actionDeleted}
                  >
                    {copy.common.delete}
                  </ActionSubmitButton>
                </form>
              </div>
            ) : null}
          </div>
        </details>

          <SmartSnoozeMenu
            occurrenceId={occurrence.id}
            dueAt={displayAt}
            title={reminder?.title}
            notes={reminder?.notes}
            category={reminder?.category}
            copy={copy}
            snoozeAction={snoozeOccurrence}
          />
        </div>

        <details className="group w-full sm:w-auto">
          <summary className="btn btn-primary dropdown-summary w-full sm:w-auto">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {copy.common.doneAction}
          </summary>
          <form
            action={markDone}
            className="mt-3 space-y-2 rounded-2xl border border-borderSubtle bg-surfaceMuted p-3 sm:w-72"
          >
            <input type="hidden" name="occurrenceId" value={occurrence.id} />
            <input type="hidden" name="reminderId" value={reminderId} />
            <input type="hidden" name="occurAt" value={occurrence.occur_at} />
            <label className="text-xs font-semibold text-muted">{copy.common.commentOptional}</label>
            <textarea
              name="done_comment"
              rows={2}
              className="input"
              placeholder={copy.common.commentPlaceholder}
              aria-label={copy.common.commentLabel}
            />
            <ActionSubmitButton className="btn btn-primary w-full" type="submit" data-action-feedback={copy.common.actionDone}>
              {copy.common.doneConfirm}
            </ActionSubmitButton>
          </form>
        </details>
      </div>
    </OccurrenceHighlightCard>
  );
}
