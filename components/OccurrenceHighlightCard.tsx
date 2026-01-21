"use client";

import { ReactNode, useEffect, useState } from 'react';
import type { HTMLAttributes } from 'react';
import type { CSSProperties } from 'react';

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

export default function OccurrenceHighlightCard({
  occurrenceId,
  className,
  children,
  highlightKey,
  style,
  ...rest
}: {
  occurrenceId: string;
  className?: string;
  children: ReactNode;
  highlightKey?: string;
  style?: CSSProperties;
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'>) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // Highlight the card when snoozed_until updates the effective due time.
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
  }, [occurrenceId, highlightKey]);

  return (
    <div
      {...rest}
      className={`${className ?? ''} ${flash ? 'flash-outline flash-bg' : ''}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
