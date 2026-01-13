"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type StoredSummary = {
  title: string;
  dueAt: string | null;
  source?: 'voice' | 'manual';
  ts?: number;
};

const STORAGE_KEY = 'voice-create-summary';
const MAX_AGE_MS = 2 * 60 * 1000;
const DISPLAY_MS = 8500;

function readStoredSummary() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredSummary;
    if (!parsed?.title && !parsed?.dueAt) return null;
    if (parsed.ts && Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatDueAt(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  return formatter.format(date);
}

type Props = {
  copy: any;
  locale: string;
  undoAction: (formData: FormData) => void | Promise<void>;
};

export default function VoiceCreateToast({ copy, locale, undoAction }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const reminderId = params.get('voice_created');
  const [summary, setSummary] = useState<StoredSummary | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!reminderId) return;
    setVisible(true);
    const stored = readStoredSummary();
    setSummary(stored?.source === 'voice' ? stored : null);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete('voice_created');
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
  }, [reminderId, router]);

  useEffect(() => {
    if (!reminderId) return;
    const timeout = window.setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => window.clearTimeout(timeout);
  }, [reminderId]);

  const formattedDueAt = summary?.dueAt ? formatDueAt(summary.dueAt, locale) : '';

  if (!reminderId || !visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(92vw,420px)] toast-pop" role="status" aria-live="polite">
      <div className="rounded-2xl border border-primary/30 bg-white/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-white shadow-md">
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeWidth="1.5" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">{copy.remindersNew.voiceToastTitle}</div>
              {summary?.title ? (
                <div className="text-sm text-ink">{summary.title}</div>
              ) : null}
              {formattedDueAt ? (
                <div className="text-xs text-muted">
                  {copy.remindersNew.voiceToastSchedule} {formattedDueAt}
                </div>
              ) : null}
            </div>
          </div>
          <button
            className="text-xs text-muted hover:text-ink"
            type="button"
            onClick={() => setVisible(false)}
            aria-label={copy.remindersNew.voiceToastClose}
            title={copy.remindersNew.voiceToastClose}
          >
            {copy.remindersNew.voiceToastClose}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form action={undoAction}>
            <input type="hidden" name="reminderId" value={reminderId} />
            <button
              className="btn btn-secondary h-8 px-3 text-xs"
              type="submit"
              data-action-feedback={copy.common.actionDeleted}
            >
              {copy.remindersNew.voiceToastUndo}
            </button>
          </form>
          <Link href={`/app/reminders/${reminderId}`} className="btn btn-primary h-8 px-3 text-xs">
            {copy.remindersNew.voiceToastEdit}
          </Link>
        </div>
      </div>
    </div>
  );
}
