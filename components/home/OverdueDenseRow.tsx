"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Check, MoreHorizontal } from 'lucide-react';
import { markDone, snoozeOccurrence } from '@/app/app/actions';
import { cloneReminder } from '@/app/app/reminders/[id]/actions';
import { defaultLocale, messages, type Locale } from '@/lib/i18n';
import { diffDaysInTimeZone, formatDateTimeWithTimeZone, formatReminderDateTime, resolveReminderTimeZone } from '@/lib/dates';
import { getCategoryChipStyle, getReminderCategory, inferReminderCategoryId } from '@/lib/categories';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import ReminderActionsSheet from '@/components/ReminderActionsSheet';
import SmartSnoozeSheet from '@/components/SmartSnoozeSheet';
import GoogleCalendarDeleteDialog from '@/components/GoogleCalendarDeleteDialog';
import GoogleCalendarSyncButton from '@/components/GoogleCalendarSyncButton';
import GoogleCalendarAutoBlockButton from '@/components/GoogleCalendarAutoBlockButton';

type Props = {
  occurrence: any;
  locale?: Locale;
  googleConnected?: boolean;
  userTimeZone?: string;
  variant?: 'dense' | 'priority';
  primaryLabel?: string;
  secondaryLabel?: string;
};

export default function OverdueDenseRow({
  occurrence,
  locale = defaultLocale,
  googleConnected = false,
  userTimeZone,
  variant = 'dense',
  primaryLabel,
  secondaryLabel
}: Props) {
  const copy = messages[locale];
  const reminder = occurrence.reminder;
  const reminderId = reminder?.id;
  const [actionsOpen, setActionsOpen] = useState(false);
  const displayAt = occurrence.snoozed_until ?? occurrence.effective_at ?? occurrence.occur_at;
  const resolvedTimeZone = resolveReminderTimeZone(reminder?.tz ?? null, userTimeZone ?? null);
  const displayLabel = occurrence.snoozed_until
    ? formatDateTimeWithTimeZone(displayAt, resolvedTimeZone)
    : formatReminderDateTime(displayAt, reminder?.tz ?? null, userTimeZone ?? null);
  const relativeLabel = useMemo(() => {
    const parsed = new Date(displayAt);
    if (Number.isNaN(parsed.getTime())) return null;
    const now = new Date();
    const dayDiff = diffDaysInTimeZone(parsed, now, resolvedTimeZone || userTimeZone || 'UTC');
    const rtf = new Intl.RelativeTimeFormat(locale === 'ro' ? 'ro-RO' : locale, { numeric: 'auto' });
    if (dayDiff !== 0) {
      return rtf.format(dayDiff, 'day');
    }
    const diffMinutes = Math.round((parsed.getTime() - now.getTime()) / 60000);
    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) >= 1) {
      return rtf.format(diffHours, 'hour');
    }
    return rtf.format(diffMinutes, 'minute');
  }, [displayAt, locale, resolvedTimeZone, userTimeZone]);

  const categoryId = inferReminderCategoryId({
    title: reminder?.title,
    notes: reminder?.notes,
    kind: reminder?.kind,
    category: reminder?.category,
    medicationDetails: reminder?.medication_details
  });
  const category = getReminderCategory(categoryId);
  const categoryChipStyle = getCategoryChipStyle(category.color, true);

  if (variant === 'priority') {
    return (
      <div className="home-priority-row">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="home-priority-title line-clamp-2">{reminder?.title}</div>
          <div className="home-priority-meta">
            {displayLabel}
            {relativeLabel ? <span className="text-[rgba(255,255,255,0.56)]"> · {relativeLabel}</span> : null}
          </div>
          <span className="home-category-pill" style={{ borderColor: category.color }}>
            {category.label}
          </span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <form action={markDone}>
            <input type="hidden" name="occurrenceId" value={occurrence.id} />
            <input type="hidden" name="reminderId" value={reminderId ?? ''} />
            <input type="hidden" name="occurAt" value={occurrence.occur_at ?? ''} />
            <input type="hidden" name="done_comment" value="" />
            <ActionSubmitButton
              className="home-priority-primary"
              type="submit"
              data-action-feedback={copy.common.actionDone}
            >
              {primaryLabel ?? copy.dashboard.nextUpAction}
            </ActionSubmitButton>
          </form>
          <form action={snoozeOccurrence}>
            <input type="hidden" name="occurrenceId" value={occurrence.id} />
            <input type="hidden" name="mode" value="30" />
            <ActionSubmitButton
              className="home-priority-secondary"
              type="submit"
              data-action-feedback={copy.common.actionSnoozed}
            >
              {secondaryLabel ?? copy.common.snooze}
            </ActionSubmitButton>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface2 px-3 py-2 text-text shadow-[0_10px_24px_rgba(0,0,0,0.32)] segment-overdue">
        <form action={markDone}>
          <input type="hidden" name="occurrenceId" value={occurrence.id} />
          <input type="hidden" name="reminderId" value={reminderId ?? ''} />
          <input type="hidden" name="occurAt" value={occurrence.occur_at ?? ''} />
          <input type="hidden" name="done_comment" value="" />
          <ActionSubmitButton
            className="icon-btn flex h-11 w-11 items-center justify-center text-primary"
            type="submit"
            aria-label={copy.common.doneAction}
            data-action-feedback={copy.common.actionDone}
          >
            <Check className="h-4 w-4" />
          </ActionSubmitButton>
        </form>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-semibold text-text line-clamp-2">{reminder?.title}</div>
          <div className="text-xs text-muted">
            {displayLabel}
            {relativeLabel ? <span className="text-muted"> · {relativeLabel}</span> : null}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-secondary">
            <span className="badge badge-blue" style={categoryChipStyle}>
              {category.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <SmartSnoozeSheet
            occurrenceId={occurrence.id}
            labels={{
              title: copy.common.snooze,
              laterToday: copy.dashboard.smartSnoozeLaterToday,
              tomorrowMorning: copy.dashboard.smartSnoozeTomorrowMorning,
              inOneHour: copy.dashboard.smartSnoozeInOneHour,
              pick: copy.dashboard.smartSnoozePick
            }}
          />
          <button
            type="button"
            className="icon-btn flex h-11 w-11 items-center justify-center text-secondary"
            aria-label={copy.common.moreActions}
            onClick={() => setActionsOpen(true)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
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
}
