"use client";

import Link from 'next/link';
import { useState } from 'react';

type Copy = {
  label: string;
  loading: string;
  success: string;
  error: string;
  connectHint: string;
  missingDueDate: string;
  connectLink: string;
};

type Props = {
  reminderId: string;
  connected: boolean;
  hasDueDate: boolean;
  copy: Copy;
};

export default function GoogleCalendarAutoBlockButton({ reminderId, connected, hasDueDate, copy }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const formatStart = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const handleAutoBlock = async () => {
    if (!connected || !hasDueDate || status === 'loading') return;
    setStatus('loading');
    setMessage(null);
    try {
      const response = await fetch('/api/integrations/google/calendar/auto-block-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const errorText = payload?.error || copy.error;
        throw new Error(errorText);
      }
      const formatted = formatStart(payload.start);
      setStatus('success');
      setMessage(`${copy.success} ${formatted}`);
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message || copy.error);
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{copy.connectHint}</span>
        <Link href="/app/settings" className="text-primaryStrong hover:underline">
          {copy.connectLink}
        </Link>
      </div>
    );
  }

  if (!hasDueDate) {
    return <div className="text-xs text-muted">{copy.missingDueDate}</div>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        className="btn btn-secondary"
        type="button"
        onClick={handleAutoBlock}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? copy.loading : copy.label}
      </button>
      {message ? (
        <span
          className={status === 'success' ? 'text-xs text-emerald-700' : 'text-xs text-rose-600'}
        >
          {message}
        </span>
      ) : null}
    </div>
  );
}
