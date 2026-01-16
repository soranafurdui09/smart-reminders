"use client";

import Link from 'next/link';
import { useState } from 'react';

type SearchResult = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  similarity?: number | null;
};

export default function SemanticSearch({
  householdId,
  localeTag,
  copy
}: {
  householdId: string;
  localeTag: string;
  copy: {
    title: string;
    placeholder: string;
    button: string;
    loading: string;
    empty: string;
    error: string;
    hint: string;
    scoreLabel: string;
    fallbackLabel: string;
    example: string;
  };
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isFallback, setIsFallback] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setIsFallback(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, householdId, limit: 20 })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || copy.error);
        setResults([]);
        setIsFallback(false);
        return;
      }
      const payload = await response.json();
      setResults((payload?.results ?? []) as SearchResult[]);
      setIsFallback(Boolean(payload?.isKeywordFallback));
    } catch (err) {
      console.error('[ai] semantic search failed', err);
      setError(copy.error);
      setIsFallback(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
        <p className="text-xs text-slate-500">{copy.hint}</p>
      </div>
      <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-sky-200"
            placeholder={copy.placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="inline-flex h-10 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 md:shrink-0" type="submit" disabled={loading}>
          {loading ? copy.loading : copy.button}
        </button>
      </form>
      <p className="text-xs text-slate-400">{copy.example}</p>
      {isFallback && results.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {copy.fallbackLabel}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {query.trim() ? (
        <div className="grid gap-3 md:grid-cols-2">
          {results.length ? results.map((item) => (
            <Link key={item.id} href={`/app/reminders/${item.id}`} className="rounded-2xl border border-slate-100 bg-white/80 p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="text-xs text-slate-500">
                {item.dueAt ? new Date(item.dueAt).toLocaleString(localeTag) : null}
              </div>
              <div className="text-sm font-semibold text-slate-900">{item.title}</div>
              {item.notes ? <div className="text-xs text-slate-500">{item.notes}</div> : null}
              {typeof item.similarity === 'number' ? (
                <div className="mt-2 text-xs text-slate-500">
                  {copy.scoreLabel}: {(item.similarity * 100).toFixed(0)}%
                </div>
              ) : null}
            </Link>
          )) : !loading ? <div className="text-sm text-slate-500">{copy.empty}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
