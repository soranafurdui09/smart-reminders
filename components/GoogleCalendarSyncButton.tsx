"use client";

import Link from 'next/link';
import { useState } from 'react';

type Copy = {
  syncLabel: string;
  syncLoading: string;
  syncSuccess: string;
  syncError: string;
  connectFirst: string;
  connectLink: string;
};

type Props = {
  reminderId: string;
  connected: boolean;
  copy: Copy;
};

export default function GoogleCalendarSyncButton({ reminderId, connected, copy }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSync = async () => {
    if (!connected || status === 'loading') return;
    setStatus('loading');
    try {
      const response = await fetch('/api/integrations/google/calendar/sync-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId })
      });
      if (!response.ok) {
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  if (!connected) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{copy.connectFirst}</span>
        <Link href="/app/settings" className="text-primaryStrong hover:underline">
          {copy.connectLink}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="btn btn-secondary"
        type="button"
        onClick={handleSync}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? copy.syncLoading : copy.syncLabel}
      </button>
      {status === 'success' ? (
        <span className="text-xs text-emerald-700">{copy.syncSuccess}</span>
      ) : null}
      {status === 'error' ? (
        <span className="text-xs text-rose-600">{copy.syncError}</span>
      ) : null}
    </div>
  );
}
