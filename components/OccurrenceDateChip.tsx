"use client";

import { useEffect, useState } from 'react';

type HighlightPayload = {
  id: string;
  kind?: string;
  ts: number;
};

const HIGHLIGHT_KEY = 'action-highlight';
const MAX_AGE_MS = 12000;

function readHighlight() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(HIGHLIGHT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HighlightPayload;
  } catch {
    return null;
  }
}

export default function OccurrenceDateChip({
  occurrenceId,
  label,
  className,
  highlightKey
}: {
  occurrenceId: string;
  label: string;
  className?: string;
  highlightKey?: string;
}) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const payload = readHighlight();
    if (!payload) return;
    if (payload.id !== occurrenceId) return;
    if (payload.kind && payload.kind !== 'snooze') return;
    if (Date.now() - payload.ts > MAX_AGE_MS) {
      return;
    }
    setFlash(true);
    const timer = window.setTimeout(() => setFlash(false), 2000);
    return () => window.clearTimeout(timer);
  }, [occurrenceId, highlightKey, label]);

  return (
    <span className={`chip ${flash ? 'flash-outline-strong' : ''} ${className ?? ''}`.trim()}>
      {label}
    </span>
  );
}
