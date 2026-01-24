"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Mic, Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type SearchResult = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  similarity?: number | null;
};

type QuickChip = {
  id: string;
  label: string;
  text?: string;
  mode?: 'medication';
};

export default function QuickSearchBar({
  householdId,
  localeTag,
  copy,
  summaryLabel
}: {
  householdId: string;
  localeTag: string;
  copy: {
    placeholder: string;
    button: string;
    loading: string;
    empty: string;
    error: string;
    scoreLabel: string;
    example: string;
  };
  summaryLabel: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const trimmed = query.trim();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (householdId) {
      window.localStorage.setItem('smart-reminder-household', householdId);
    }
  }, [householdId]);
  const quickChips: QuickChip[] = [
    { id: 'today', label: 'Azi', text: 'Azi la' },
    { id: 'tomorrow', label: 'Mâine', text: 'Mâine la' },
    { id: 'in1h', label: 'În 1h', text: 'Peste o oră' },
    { id: 'weekly', label: 'Săptămânal', text: 'În fiecare săptămână' },
    { id: 'meds', label: 'Medicamente', text: 'Medicament' }
  ];

  const handleSearch = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!trimmed) {
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/ai/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed, householdId, limit: 12 })
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          setError(payload.error || copy.error);
          setResults([]);
          return;
        }
        const payload = await response.json();
        setResults((payload?.results ?? []) as SearchResult[]);
      } catch (err) {
        console.error('[ai] semantic search failed', err);
        setError(copy.error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [copy.error, householdId, trimmed]
  );

  const handleAdd = useCallback(() => {
    if (!trimmed) {
      router.push('/app/reminders/new');
      return;
    }
    router.push(`/app/reminders/new?quick=${encodeURIComponent(trimmed)}`);
  }, [router, trimmed]);

  return (
    <div className="sticky top-[72px] z-20 space-y-3 rounded-[var(--radius-card)] border border-white/10 bg-surface/85 p-3 shadow-sm md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            className="premium-input w-full pl-9 pr-12 text-sm placeholder:text-[color:var(--text-3)]"
            placeholder={`Adaugă sau caută… ${copy.example}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="premium-icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"
            aria-label="Dictează"
            onClick={() => router.push('/app/reminders/new?voice=1')}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="premium-btn-primary inline-flex items-center justify-center gap-1 px-3 text-xs"
          onClick={handleAdd}
          disabled={!trimmed}
        >
          <Plus className="h-4 w-4" />
          Adaugă
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-semibold text-secondary">
        {quickChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="premium-chip whitespace-nowrap"
            onClick={() => {
              const text = chip.text;
              if (!text) return;
              setQuery((current) => (current ? `${current} ${text}` : text));
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-tertiary">{summaryLabel}</div>

      {loading ? (
        <div className="text-xs text-tertiary">{copy.loading}</div>
      ) : null}
      {error ? (
        <div className="text-xs text-rose-300">{error}</div>
      ) : null}
      {trimmed ? (
        results.length ? (
          <div className="grid gap-2">
            {results.map((item) => (
              <Link
                key={item.id}
                href={`/app/reminders/${item.id}`}
                className="rounded-2xl border border-white/10 bg-surface px-3 py-2 text-xs text-secondary shadow-sm"
              >
                <div className="text-[11px] text-tertiary">
                  {item.dueAt ? new Date(item.dueAt).toLocaleString(localeTag) : null}
                </div>
                <div className="font-semibold text-primary">{item.title}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-xs text-tertiary">{copy.empty}</div>
        )
      ) : null}
    </div>
  );
}
