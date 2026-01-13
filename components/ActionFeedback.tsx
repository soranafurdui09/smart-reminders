'use client';

import { useEffect, useState } from 'react';

type StoredFeedback = {
  message: string;
  ts: number;
};

const STORAGE_KEY = 'action-feedback';
const DISPLAY_MS = 3200;
const MAX_AGE_MS = 15000;

function readStoredFeedback() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredFeedback;
    if (!parsed?.message || !parsed?.ts) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeFeedback(message: string) {
  if (typeof window === 'undefined') return;
  const payload: StoredFeedback = { message, ts: Date.now() };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function closeRelatedDetails(element: HTMLElement | null) {
  if (!element) return;
  const details = element.closest('details');
  if (details) {
    details.open = false;
    return;
  }
  const form = element.closest('form');
  if (!form) return;
  form.querySelectorAll('details[open]').forEach((openDetails) => {
    if (openDetails instanceof HTMLDetailsElement) {
      openDetails.open = false;
    }
  });
}

export default function ActionFeedback() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredFeedback();
    if (stored && Date.now() - stored.ts <= MAX_AGE_MS) {
      setMessage(stored.message);
    }
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), DISPLAY_MS);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    const handleAction = (element: HTMLElement | null) => {
      if (!element) return;
      const feedback = element.getAttribute('data-action-feedback');
      if (feedback) {
        storeFeedback(feedback);
      }
      closeRelatedDetails(element);
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const element = target.closest<HTMLElement>('[data-action-feedback], [data-action-close]');
      if (!element) return;
      handleAction(element);
    };

    const handleSubmit = (event: Event) => {
      const submitter = (event as SubmitEvent).submitter as HTMLElement | null;
      if (!submitter) return;
      const element = submitter.closest<HTMLElement>('[data-action-feedback], [data-action-close]') || submitter;
      handleAction(element);
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('submit', handleSubmit, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[min(92vw,360px)] toast-pop" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-white/95 p-4 text-sm font-semibold text-ink shadow-xl backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primaryStrong via-primary to-accent text-white shadow-md">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="1.5" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}
