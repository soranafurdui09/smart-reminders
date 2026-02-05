"use client";

import Link from 'next/link';
import { memo, useMemo, useRef, useState } from 'react';
import { Check, MoreHorizontal, User } from 'lucide-react';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';
import { useSwipeActions } from '@/lib/hooks/useSwipeActions';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import ReminderActionsSheet from '@/components/ReminderActionsSheet';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';

type Props = {
  occurrence: any;
  locale?: Locale;
  googleConnected?: boolean;
  userTimeZone?: string;
};

const ReminderRowMobile = memo(function ReminderRowMobile({
  occurrence,
  locale = defaultLocale,
  googleConnected = false,
  userTimeZone
}: Props) {
  const copy = messages[locale];
  const reminder = occurrence.reminder;
  const reminderId = reminder?.id;
  const [actionsOpen, setActionsOpen] = useState(false);
  const swipeLockRef = useRef(false);
  const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
  const resolvedTimeZone = resolveReminderTimeZone(reminder?.tz ?? null, userTimeZone ?? null);
  const displayLabel = occurrence.snoozed_until
    ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
    : formatReminderDateTime(displayAt, reminder?.tz ?? null, userTimeZone ?? null);
  const assigneeLabel = reminder?.assigned_member_label?.trim() ?? '';
  const performedByLabel = occurrence.performed_by_label?.trim() ?? '';
  const categoryId = inferReminderCategoryId({
    title: reminder?.title,
    notes: reminder?.notes,
    kind: reminder?.kind,
    category: reminder?.category,
    medicationDetails: reminder?.medication_details
  });
  const category = getReminderCategory(categoryId);
  const categoryChipStyle = getCategoryChipStyle(category.color, true);

  const statusTone = useMemo(() => {
    const now = new Date();
    const compareDate = new Date(displayAt);
    if (Number.isNaN(compareDate.getTime())) return { bar: 'bg-sky-400/70', text: 'text-sky-200' };
    const dayDiff = diffDaysInTimeZone(compareDate, now, resolvedTimeZone || userTimeZone || 'UTC');
    if (occurrence.status === 'done') return { bar: 'bg-slate-300/60', text: 'text-muted' };
    if (dayDiff < 0 || (dayDiff === 0 && compareDate.getTime() < now.getTime())) return { bar: 'bg-red-500/80', text: 'text-red-300' };
    if (dayDiff === 0) return { bar: 'bg-amber-400/80', text: 'text-amber-200' };
    return { bar: 'bg-blue-400/80', text: 'text-blue-200' };
  }, [displayAt, occurrence.status, resolvedTimeZone, userTimeZone]);

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
  const doneByLabel = occurrence.status === 'done' && performedByLabel ? `Rezolvat de ${performedByLabel}` : null;

  const notifySwipeChange = (kind?: 'snooze' | 'done') => {
    if (typeof window === 'undefined') return;
    const payload = { id: occurrence.id, kind, ts: Date.now() };
    window.sessionStorage.setItem('action-highlight', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('reminder:changed'));
  };

  const handleSwipeAction = async (action: 'done' | 'snooze') => {
    if (swipeLockRef.current) return;
    if (occurrence.status === 'done') return;
    swipeLockRef.current = true;
    try {
      if (action === 'done') {
        if (!reminderId) return;
        const occurAtValue = String(occurrence.occur_at ?? displayAt ?? '');
        if (!occurAtValue) return;
        const formData = new FormData();
        formData.set('occurrenceId', occurrence.id);
        formData.set('reminderId', reminderId);
        formData.set('occurAt', occurAtValue);
        formData.set('done_comment', '');
        await markDone(formData);
        notifySwipeChange('done');
        return;
      }
      const formData = new FormData();
      formData.set('occurrenceId', occurrence.id);
      formData.set('mode', '30');
      await snoozeOccurrence(formData);
      notifySwipeChange('snooze');
    } finally {
      window.setTimeout(() => {
        swipeLockRef.current = false;
      }, 800);
    }
  };

  const swipeHandlers = useSwipeActions({
    enabled: !actionsOpen && occurrence.status !== 'done',
    onSwipeLeft: () => void handleSwipeAction('snooze'),
    onSwipeRight: () => void handleSwipeAction('done')
  });

  return (
    <>
      <div
        className="premium-card relative flex items-center gap-3 px-4 py-3 touch-pan-y"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchMove={swipeHandlers.onTouchMove}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${statusTone.bar}`} aria-hidden="true" />
        <form action={markDone}>
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="reminderId" value={reminderId ?? ''} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at ?? ''} />
          <input type="hidden" name="done_comment" value="" />
          <ActionSubmitButton
            className="premium-icon-btn flex h-11 w-11 items-center justify-center text-primary shadow-sm"
            type="submit"
            aria-label={copy.common.doneAction}
            data-action-feedback={copy.common.actionDone}
          >
            <Check className="h-4 w-4" />
          </ActionSubmitButton>
        </form>

        <div className="min-w-0 flex-1 space-y-1 pl-1">
          <div className="text-sm font-semibold text-text line-clamp-2">{reminder?.title}</div>
          <div className={`text-xs ${statusTone.text}`}>
            {displayLabel}
            {relativeLabel ? <span className="text-muted"> · {relativeLabel}</span> : null}
            {doneByLabel ? <span className="text-muted"> · {doneByLabel}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase text-secondary">
            <span className="badge badge-blue" style={categoryChipStyle}>
              {category.label}
            </span>
            {assigneeLabel ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-tertiary normal-case">
                <User className="h-3.5 w-3.5" />
                Asignat: {assigneeLabel}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="icon-btn flex h-10 w-10 items-center justify-center text-secondary"
          aria-label={copy.common.moreActions}
          onClick={() => setActionsOpen(true)}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <ReminderActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={reminder?.title ?? copy.reminderDetail.title}
        categoryLabel={category.label}
        categoryClassName="badge badge-blue"
        categoryStyle={categoryChipStyle}
      >
        <div className="space-y-2">
          <Link
            className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 whitespace-normal break-words"
            href={`/app/reminders/${reminderId}`}
            onClick={() => setActionsOpen(false)}
          >
            {copy.common.details}
          </Link>
          <Link
            className="block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 whitespace-normal break-words"
            href={`/app/reminders/${reminderId}/edit`}
            onClick={() => setActionsOpen(false)}
          >
            {copy.common.edit}
          </Link>
          <form action={cloneReminder}>
            <input type="hidden" name="reminderId" value={reminderId} />
            <ActionSubmitButton
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10 whitespace-normal break-words"
              type="submit"
              onClick={() => setActionsOpen(false)}
              data-action-feedback={copy.common.actionCloned}
            >
              {copy.reminderDetail.clone}
            </ActionSubmitButton>
          </form>
          <button
            type="button"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-slate-100 shadow-sm transition hover:bg-white/10"
            onClick={() => {
              setActionsOpen(false);
              void handleSwipeAction('snooze');
            }}
          >
            {copy.common.snooze} 30m
          </button>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-slate-400">
            {copy.actions.calendar}
            <div className="mt-2 space-y-2 text-sm font-semibold text-slate-100">
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
                  hasDueDate={Boolean(reminder?.due_at)}
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
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 shadow-sm transition hover:bg-white/10"
            onClick={() => setActionsOpen(false)}
          >
            {copy.common.back}
          </button>
        </div>
      </ReminderActionsSheet>
    </>
  );
});

export default ReminderRowMobile;
