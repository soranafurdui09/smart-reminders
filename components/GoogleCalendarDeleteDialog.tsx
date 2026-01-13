"use client";

import { useState } from 'react';
import ActionSubmitButton from '@/components/ActionSubmitButton';
import { deleteReminder } from '@/app/app/reminders/[id]/actions';

type Copy = {
  label: string;
  dialogTitle: string;
  dialogHint: string;
  justReminder: string;
  reminderAndCalendar: string;
  cancel: string;
};

type Props = {
  reminderId: string;
  hasGoogleEvent: boolean;
  copy: Copy;
};

export default function GoogleCalendarDeleteDialog({ reminderId, hasGoogleEvent, copy }: Props) {
  const [open, setOpen] = useState(false);

  const baseForm = (deleteFromCalendar: '0' | '1') => (
    <form action={deleteReminder} className="flex-1" method="post">
      <input type="hidden" name="reminderId" value={reminderId} />
      <input type="hidden" name="deleteFromCalendar" value={deleteFromCalendar} />
      <ActionSubmitButton
        className="btn btn-secondary w-full"
        type="submit"
        data-action-feedback={copy.label}
      >
        {deleteFromCalendar === '1' ? copy.reminderAndCalendar : copy.justReminder}
      </ActionSubmitButton>
    </form>
  );

  if (!hasGoogleEvent) {
    return baseForm('0');
  }

  return (
    <>
      <button
        className="btn btn-secondary"
        type="button"
        onClick={() => setOpen(true)}
      >
        {copy.label}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-ink">{copy.dialogTitle}</h3>
              <p className="text-sm text-muted">{copy.dialogHint}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {baseForm('0')}
              {baseForm('1')}
            </div>
            <button
              className="mt-4 w-full rounded-2xl border border-borderSubtle bg-surface px-4 py-2 text-sm text-muted transition hover:border-ink/30"
              type="button"
              onClick={() => setOpen(false)}
            >
              {copy.cancel}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
