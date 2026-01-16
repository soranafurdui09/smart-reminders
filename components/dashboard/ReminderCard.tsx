'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
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

type UrgencyStyles = {
  label: string;
  stripClass: string;
  badgeClass: string;
};

type Props = {
  occurrence: any;
  locale?: Locale;
  googleConnected?: boolean;
  userTimeZone?: string;
  urgency?: UrgencyStyles | null;
  variant?: 'card' | 'row';
};

const useCloseOnOutside = (ref: React.RefObject<HTMLDetailsElement>) => {
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const details = ref.current;
      if (!details || !details.open) return;
      const target = event.target as Node | null;
      if (target && details.contains(target)) return;
      details.open = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && ref.current?.open) {
        ref.current.open = false;
      }
    };
    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [ref]);
};

export default function ReminderCard({
  occurrence,
  locale = defaultLocale,
  googleConnected = false,
  userTimeZone,
  urgency,
  variant = 'card'
}: Props) {
  const actionMenuRef = useRef<HTMLDetailsElement | null>(null);
  const doneMenuRef = useRef<HTMLDetailsElement | null>(null);
  const copy = messages[locale];
  const reminder = occurrence.reminder;
  const reminderId = reminder?.id;
  const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
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
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : occurrence.status === 'snoozed'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-slate-200 bg-slate-100 text-slate-600';
  const assigneeLabel = reminder?.assigned_member_label;
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
  const isRow = variant === 'row';

  useCloseOnOutside(actionMenuRef);
  useCloseOnOutside(doneMenuRef);

  return (
    <OccurrenceHighlightCard
      className={`relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isRow ? 'md:flex-row md:items-center md:gap-4' : ''}`}
      occurrenceId={occurrence.id}
      highlightKey={displayAt}
    >
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl ${urgency?.stripClass ?? 'bg-slate-300'}`} />

      <div className={`flex-1 ${isRow ? 'space-y-1' : 'space-y-2'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
            style={categoryChipStyle}
          >
            {category.label}
          </span>
          {urgency ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${urgency.badgeClass}`}>
              {urgency.label}
            </span>
          ) : null}
        </div>

        <div className={`font-semibold text-slate-900 ${isRow ? 'text-sm' : 'text-base'} line-clamp-2`}>
          {reminder?.title}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <path
                d="M8 2v4M16 2v4M3 10h18"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <OccurrenceDateChip
              occurrenceId={occurrence.id}
              label={displayLabel}
              highlightKey={displayAt}
              className="border-0 bg-transparent px-0 py-0 text-xs text-slate-500"
            />
          </span>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-2 ${isRow ? 'md:ml-auto md:min-w-[280px]' : ''}`}>
        {assigneeLabel ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            {assigneeLabel}
          </span>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
        <details ref={actionMenuRef} className="relative">
          <summary
            className="btn btn-secondary dropdown-summary h-9 w-9 p-0 text-lg leading-none"
            aria-label={copy.common.moreActions}
          >
            <span aria-hidden="true">...</span>
          </summary>
          <div className="absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
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

        <details ref={doneMenuRef} className="group">
          <summary className="btn btn-primary dropdown-summary h-9 rounded-full px-3.5 text-xs font-semibold">
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
      </div>
    </OccurrenceHighlightCard>
  );
}
