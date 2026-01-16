'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Check, Clock, MoreHorizontal, UserRound } from 'lucide-react';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import { formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';
import { inferReminderCategoryId, type ReminderCategoryId } from '@/lib/categories';
import { getCategoryClasses, getUrgencyClasses, type ReminderCategory, type ReminderUrgency } from '@/lib/ui/reminderStyles';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import OccurrenceDateChip from '@/components/OccurrenceDateChip';
import OccurrenceHighlightCard from '@/components/OccurrenceHighlightCard';
import SmartSnoozeMenu from '@/components/SmartSnoozeMenu';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';

type UrgencyStyles = {
  key: ReminderUrgency;
  label: string;
};

type Props = {
  occurrence: any;
  locale?: Locale;
  googleConnected?: boolean;
  userTimeZone?: string;
  urgency?: UrgencyStyles | null;
  urgencyLabel?: string;
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
  urgencyLabel,
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
  const assigneeLabel = reminder?.assigned_member_label;
  const hasDueDate = Boolean(reminder?.due_at);

  const categoryId = inferReminderCategoryId({
    title: reminder?.title,
    notes: reminder?.notes,
    kind: reminder?.kind,
    category: reminder?.category,
    medicationDetails: reminder?.medication_details
  });
  const categoryKey = mapCategoryId(categoryId);
  const categoryStyles = getCategoryClasses(categoryKey);
  const urgencyKey: ReminderUrgency = occurrence.status === 'done'
    ? 'completed'
    : urgency?.key ?? 'upcoming';
  const urgencyClasses = getUrgencyClasses(urgencyKey);
  const statusPillLabel = occurrence.status === 'done'
    ? copy.common.done
    : occurrence.status === 'snoozed'
      ? copy.common.statusSnoozed
      : urgencyLabel ?? urgency?.label ?? statusLabel;
  const isRow = variant === 'row';

  useCloseOnOutside(actionMenuRef);
  useCloseOnOutside(doneMenuRef);

  return (
    <OccurrenceHighlightCard
      className={`relative flex flex-col gap-3 rounded-xl border border-slate-100 bg-white py-4 pl-5 pr-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${isRow ? 'md:flex-row md:items-center md:gap-4' : ''}`}
      occurrenceId={occurrence.id}
      highlightKey={displayAt}
    >
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${urgencyClasses.strip}`} />

      <div className={`flex-1 ${isRow ? 'space-y-1' : 'space-y-2'}`}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyles.badgeBg} ${categoryStyles.badgeText}`}
          >
            {categoryStyles.label}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${urgencyClasses.status}`}>
            {statusPillLabel}
          </span>
        </div>

        <h3 className={`text-slate-900 ${isRow ? 'text-sm' : 'text-base'} font-semibold leading-snug line-clamp-2`}>
          {reminder?.title}
        </h3>

        <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Clock className={`h-3.5 w-3.5 ${urgencyKey === 'overdue' ? 'text-red-500' : urgencyKey === 'today' ? 'text-amber-500' : 'text-slate-500'}`} />
            <OccurrenceDateChip
              occurrenceId={occurrence.id}
              label={displayLabel}
              highlightKey={displayAt}
              className="border-0 bg-transparent px-0 py-0 text-xs text-slate-600"
            />
          </div>
          {assigneeLabel ? (
            <div className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-slate-500" />
              <span>{assigneeLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 ${isRow ? 'md:ml-auto md:min-w-[280px]' : ''}`}>
        <details ref={actionMenuRef} className="relative">
          <summary
            className="dropdown-summary inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            aria-label={copy.common.moreActions}
          >
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="absolute left-0 z-50 mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg sm:left-auto sm:right-0">
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

        <details ref={doneMenuRef} className="group flex-1">
          <summary className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600">
            <Check className="h-3.5 w-3.5" />
            {copy.common.doneAction}
          </summary>
          <form
            action={markDone}
            className="mt-3 space-y-2 rounded-2xl border border-slate-100 bg-white p-3 sm:w-72"
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
            <ActionSubmitButton className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600" type="submit" data-action-feedback={copy.common.actionDone}>
              {copy.common.doneConfirm}
            </ActionSubmitButton>
          </form>
        </details>
      </div>
    </OccurrenceHighlightCard>
  );
}

function mapCategoryId(categoryId: ReminderCategoryId): ReminderCategory {
  switch (categoryId) {
    case 'health':
      return 'health_medication';
    case 'car':
      return 'car_auto';
    case 'home':
      return 'home_maintenance';
    case 'family':
      return 'family_kids';
    case 'shopping':
      return 'shopping_groceries';
    case 'personal':
      return 'personal_admin';
    default:
      return 'general';
  }
}
