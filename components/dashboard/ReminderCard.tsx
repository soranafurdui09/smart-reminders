'use client';

/**
 * Mobile UI audit targets:
 * - components/AppNavigation.tsx (bottom nav + FAB)
 * - components/dashboard/ReminderCard.tsx (actions sheet)
 * - components/OccurrenceCard.tsx (actions sheet)
 * - app/reminders/ReminderDashboardSection.tsx (AI search placement)
 * - app/app/history/page.tsx (stats overflow)
 * - components/SemanticSearch.tsx (AI search)
 */

import Link from 'next/link';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calendar, Check, Clock, MoreVertical, User } from 'lucide-react';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import { formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';
import { inferReminderCategoryId, type ReminderCategoryId } from '@/lib/categories';
import {
  getReminderCategoryStyle,
  getUrgencyClasses,
  type ReminderCategory,
  type ReminderUrgency
} from '@/lib/ui/reminderStyles';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import OccurrenceDateChip from '@/components/OccurrenceDateChip';
import OccurrenceHighlightCard from '@/components/OccurrenceHighlightCard';
import ReminderActionsSheet from '@/components/ReminderActionsSheet';
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

// Main reminder card component used across dashboard sections.
function ReminderCard({
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
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
  const categoryStyles = getReminderCategoryStyle(categoryKey);
  const urgencyKey: ReminderUrgency = occurrence.status === 'done'
    ? 'completed'
    : urgency?.key ?? 'upcoming';
  const urgencyClasses = getUrgencyClasses(urgencyKey);
  const statusPillLabel = occurrence.status === 'done'
    ? copy.common.done
    : occurrence.status === 'snoozed'
      ? copy.common.statusSnoozed
      : urgencyLabel ?? urgency?.label ?? statusLabel;
  const StatusIcon = urgencyKey === 'overdue'
    ? AlertTriangle
    : urgencyKey === 'today'
      ? Clock
    : urgencyKey === 'soon'
      ? Clock
      : urgencyKey === 'completed'
        ? Check
        : Calendar;
  const isPrimary = variant === 'row';
  const cardClass = isPrimary
    ? 'rounded-2xl border border-slate-100 bg-white text-gray-900 shadow-card transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0b0d14] dark:text-gray-200 dark:hover:bg-[#111523]'
    : 'rounded-2xl border border-slate-100 bg-white text-gray-700 shadow-card transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0b0d14] dark:text-gray-200 dark:hover:bg-[#111523]';
  const statusTextClass = urgencyKey === 'overdue'
    ? 'text-red-600'
    : urgencyKey === 'today'
      ? 'text-blue-600'
      : urgencyKey === 'soon'
        ? 'text-amber-600'
        : urgencyKey === 'completed'
          ? 'text-gray-500'
          : 'text-blue-600';
  const relativeLabel = useMemo(() => {
    const parsed = new Date(displayAt);
    if (Number.isNaN(parsed.getTime())) return null;
    const diffMinutes = Math.round((parsed.getTime() - Date.now()) / 60000);
    const absMinutes = Math.abs(diffMinutes);
    const rtf = new Intl.RelativeTimeFormat(locale === 'ro' ? 'ro-RO' : locale, { numeric: 'auto' });
    if (absMinutes < 60) {
      return rtf.format(diffMinutes, 'minute');
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    }
    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, 'day');
  }, [displayAt, locale]);

  useCloseOnOutside(actionMenuRef);
  useCloseOnOutside(doneMenuRef);

  useEffect(() => {
    if (!isMobile) {
      setActionsOpen(false);
    }
  }, [isMobile]);

  return (
    <OccurrenceHighlightCard
      className={`relative flex flex-col gap-3 p-4 ${cardClass} ${isPrimary ? 'md:flex-row md:items-center md:gap-4' : ''}`}
      occurrenceId={occurrence.id}
      highlightKey={displayAt}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl ${urgencyClasses.strip}`} />

      <div className={`flex-1 ${isPrimary ? 'space-y-2' : 'space-y-1.5'}`}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex max-w-[65%] items-center rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${categoryStyles.pillBg} ${categoryStyles.pillText} truncate whitespace-nowrap`}
            title={categoryStyles.label}
          >
            {categoryStyles.label}
          </span>
          <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${urgencyClasses.status} ${statusTextClass}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusPillLabel}
          </span>
        </div>

        <h3 className={`text-sm font-semibold text-gray-900 leading-snug line-clamp-2 ${isPrimary ? 'md:text-base' : ''} dark:text-gray-200`}>
          {reminder?.title}
        </h3>

        <div className={`flex flex-wrap items-center gap-2 text-xs ${isPrimary ? 'text-gray-600' : 'text-gray-500'} dark:text-gray-300`}>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <OccurrenceDateChip
              occurrenceId={occurrence.id}
              label={displayLabel}
              highlightKey={displayAt}
              className="border-0 bg-transparent px-0 py-0 text-xs"
            />
            {relativeLabel ? (
              <span className="text-[11px] text-slate-400">• {relativeLabel}</span>
            ) : null}
          </div>
          {isPrimary && assigneeLabel ? (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{assigneeLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {assigneeLabel && !isPrimary ? (
          <div className={`flex items-center gap-1.5 text-xs ${isPrimary ? 'text-gray-600' : 'text-gray-500'} dark:text-gray-300`}>
            <User className="h-3.5 w-3.5" />
            <span>{assigneeLabel}</span>
          </div>
        ) : null}

        <div className={`flex flex-wrap items-center gap-2 ${isPrimary ? 'ml-auto' : 'w-full justify-end'}`}>
          {isMobile ? (
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200"
              aria-label={copy.common.moreActions}
              onClick={() => setActionsOpen(true)}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          ) : (
            <details ref={actionMenuRef} className="relative">
              <summary
                className="dropdown-summary inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-slate-600 dark:text-gray-200"
                aria-label={copy.common.moreActions}
              >
                <MoreVertical className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 z-[1000] mt-3 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg max-h-[60vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
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
          )}

          <SmartSnoozeMenu
            occurrenceId={occurrence.id}
            dueAt={displayAt}
            title={reminder?.title}
            notes={reminder?.notes}
            category={reminder?.category}
            copy={copy}
            snoozeAction={snoozeOccurrence}
            compact
          />

          <details ref={doneMenuRef} className="relative">
            <summary
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition ${categoryStyles.buttonBg} ${categoryStyles.buttonHover}`}
              aria-label={copy.common.doneAction}
            >
              <Check className="h-4 w-4" />
            </summary>
            <form
              action={markDone}
              className="mt-3 space-y-2 rounded-2xl border border-slate-100 bg-white p-3 sm:w-72 dark:border-slate-700 dark:bg-slate-900"
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
              <ActionSubmitButton
                className={`w-full rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${categoryStyles.buttonBg} ${categoryStyles.buttonHover}`}
                type="submit"
                data-action-feedback={copy.common.actionDone}
              >
                {copy.common.doneConfirm}
              </ActionSubmitButton>
            </form>
          </details>
        </div>
      </div>

      <ReminderActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={reminder?.title ?? copy.reminderDetail.title}
        categoryLabel={categoryStyles.label}
        categoryClassName={`${categoryStyles.pillBg} ${categoryStyles.pillText}`}
      >
        <div className="space-y-2">
          <Link
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 whitespace-normal break-words"
            href={`/app/reminders/${reminderId}`}
            onClick={() => setActionsOpen(false)}
          >
            {copy.common.details}
          </Link>
          <Link
            className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 whitespace-normal break-words"
            href={`/app/reminders/${reminderId}/edit`}
            onClick={() => setActionsOpen(false)}
          >
            {copy.common.edit}
          </Link>
          <form action={cloneReminder}>
            <input type="hidden" name="reminderId" value={reminderId} />
            <ActionSubmitButton
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 whitespace-normal break-words"
              type="submit"
              onClick={() => setActionsOpen(false)}
              data-action-feedback={copy.common.actionCloned}
            >
              {copy.reminderDetail.clone}
            </ActionSubmitButton>
          </form>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
            {copy.actions.calendar}
            <div className="mt-2 space-y-2 text-sm font-semibold text-slate-900">
              <div onClickCapture={() => setActionsOpen(false)}>
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
              </div>
              <div onClickCapture={() => setActionsOpen(false)}>
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
            </div>
          </div>
          <div onClickCapture={() => setActionsOpen(false)}>
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
          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => setActionsOpen(false)}
          >
            {copy.common.back}
          </button>
        </div>
      </ReminderActionsSheet>
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

export default memo(ReminderCard);
