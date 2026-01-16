'use client';

import Link from 'next/link';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import { formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import OccurrenceDateChip from '@/components/OccurrenceDateChip';
import OccurrenceHighlightCard from '@/components/OccurrenceHighlightCard';
import SmartSnoozeMenu from '@/components/SmartSnoozeMenu';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';

type UrgencyBadge = {
  label: string;
  className: string;
};

export default function OccurrenceCard({
  occurrence,
  locale = defaultLocale,
  googleConnected = false,
  userTimeZone,
  urgency
}: {
  occurrence: any;
  locale?: Locale;
  googleConnected?: boolean;
  userTimeZone?: string;
  urgency?: UrgencyBadge | null;
}) {
  const copy = messages[locale];
  const reminder = occurrence.reminder;
  const reminderId = reminder?.id;
  // Next due time comes from the occurrence, with snoozed_until overriding it when present.
  const displayAt = occurrence.snoozed_until ?? occurrence.occur_at;
  const resolvedTimeZone = resolveReminderTimeZone(reminder?.tz ?? null, userTimeZone ?? null);
  const displayLabel = occurrence.snoozed_until
    ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
    : formatReminderDateTime(displayAt, reminder?.tz ?? null, userTimeZone ?? null);
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
  const hasDueDate = Boolean(reminder?.due_at);
  const categoryId = inferReminderCategoryId({
    title: reminder?.title,
    notes: reminder?.notes,
    kind: reminder?.kind,
    category: reminder?.category,
    medicationDetails: reminder?.medication_details
  });
  const category = getReminderCategory(categoryId);
  const categoryChipStyle = getCategoryChipStyle(category.color, true);

  return (
    <OccurrenceHighlightCard
      className="rounded-2xl border border-borderSubtle bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md border-l-4"
      occurrenceId={occurrence.id}
      highlightKey={displayAt}
      style={{ borderLeftColor: category.color }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip" style={categoryChipStyle}>
            {category.label}
          </span>
          {urgency ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${urgency.className}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              {urgency.label}
            </span>
          ) : null}
        </div>
        {assigneeLabel ? (
          <details className="relative">
            <summary className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-borderSubtle bg-surfaceMuted text-ink shadow-sm transition hover:bg-surface dropdown-summary">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z"
                />
              </svg>
            </summary>
            <div className="absolute left-0 z-20 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-xl border border-borderSubtle bg-surface px-3 py-2 text-xs font-semibold text-ink shadow-soft sm:left-auto sm:right-0">
              {assigneeLabel}
            </div>
          </details>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-base font-semibold text-ink line-clamp-2">{reminder?.title}</div>
        <div className="flex flex-wrap items-center gap-2">
          <OccurrenceDateChip
            occurrenceId={occurrence.id}
            label={displayLabel}
            highlightKey={displayAt}
            className="text-[11px]"
          />
          <span className={`pill border ${statusClass}`}>{statusLabel}</span>
        </div>
        {commentText ? (
          <div className="text-xs text-muted line-clamp-2">{commentText}</div>
        ) : null}
        {snoozedByLabel ? (
          <div className="text-xs text-muted">
            {copy.common.snoozedBy} {snoozedByLabel}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary
              className="btn btn-secondary dropdown-summary h-9 w-9 p-0 text-lg leading-none"
              aria-label={copy.common.moreActions}
            >
              <span aria-hidden="true">...</span>
            </summary>
            <div className="absolute left-0 z-20 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-borderSubtle bg-surface p-2 shadow-soft sm:left-auto sm:right-0">
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
                  <details className="mt-2 rounded-lg border border-dashed border-slate-200 p-2 text-xs font-semibold text-slate-700">
                    <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-slate-400">
                      {copy.actions.calendar}
                    </summary>
                    <div className="mt-2 space-y-1">
                      <GoogleCalendarSyncButton
                        reminderId={reminderId}
                        connected={googleConnected}
                        variant="menu"
                        copy={{
                          syncLabel: copy.actions.sendDirect,
                          syncLoading: copy.reminderDetail.googleCalendarSyncing,
                          syncSuccess: copy.reminderDetail.googleCalendarSyncSuccess,
                          syncError: copy.reminderDetail.googleCalendarSyncError,
                          connectFirst: copy.reminderDetail.googleCalendarConnectFirst,
                          connectLink: copy.reminderDetail.googleCalendarConnectLink
                        }}
                      />
                      <GoogleCalendarAutoBlockButton
                        reminderId={reminderId}
                        connected={googleConnected}
                        hasDueDate={hasDueDate}
                        variant="menu"
                        copy={{
                          label: copy.actions.schedule,
                          loading: copy.reminderDetail.googleCalendarAutoBlocking,
                          success: copy.reminderDetail.googleCalendarAutoBlockSuccess,
                          error: copy.reminderDetail.googleCalendarAutoBlockError,
                          connectHint: copy.reminderDetail.googleCalendarConnectFirst,
                          connectLink: copy.reminderDetail.googleCalendarConnectLink,
                          missingDueDate: copy.reminderDetail.googleCalendarAutoBlockMissingDueDate,
                          confirmIfBusy: copy.reminderDetail.googleCalendarAutoBlockConfirmBusy
                        }}
                      />
                    </div>
                  </details>
                  <GoogleCalendarDeleteDialog
                    reminderId={reminderId}
                    hasGoogleEvent={Boolean(reminder?.google_event_id)}
                    copy={{
                      label: copy.common.delete,
                      dialogTitle: copy.reminderDetail.googleCalendarDeleteTitle,
                      dialogHint: copy.reminderDetail.googleCalendarDeleteHint,
                      justReminder: copy.reminderDetail.googleCalendarDeleteOnly,
                      reminderAndCalendar: copy.reminderDetail.googleCalendarDeleteBoth,
                      cancel: copy.reminderDetail.googleCalendarDeleteCancel
                    }}
                  />
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
          <summary className="btn btn-primary dropdown-summary h-9 w-full sm:w-auto">
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
