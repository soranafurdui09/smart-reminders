"use client";

import { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';

export default function QuickAddBar() {
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  const openQuickAdd = (payload: { text?: string; voice?: boolean }) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('quickadd:open', { detail: { mode: 'ai', ...payload } }));
  };

  return (
    <div className="home-glass-panel rounded-[var(--radius-lg)] px-1.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <div className="home-input-pill flex h-9 flex-1 items-center px-2.5">
          <input
            className="h-full w-full bg-transparent text-sm text-[color:var(--text-0)] placeholder:text-[color:var(--text-2)] focus:outline-none"
            placeholder="Adaugă rapid…"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (trimmed) openQuickAdd({ text: trimmed });
              }
            }}
          />
        </div>
        <button
          type="button"
          className="home-icon-btn h-9 w-9 text-[color:var(--brand-blue)]"
          aria-label="Dictează"
          onClick={() => openQuickAdd({ voice: true })}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="home-icon-btn h-9 w-9 text-[color:var(--brand-blue)]"
          aria-label="AI"
          onClick={() => openQuickAdd({ text: trimmed || undefined })}
        >
          <Sparkles className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
