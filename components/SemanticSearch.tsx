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
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <p className="text-sm text-slate-500">{copy.hint}</p>
      </div>
      <form onSubmit={handleSearch} className="card flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="input flex-1"
          placeholder={copy.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="btn btn-secondary" type="submit" disabled={loading}>
          {loading ? copy.loading : copy.button}
        </button>
      </form>
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
            <Link key={item.id} href={`/app/reminders/${item.id}`} className="card hover:border-sky-200 hover:shadow-md">
              <div className="text-sm text-slate-500">
                {item.dueAt ? new Date(item.dueAt).toLocaleString(localeTag) : null}
              </div>
              <div className="text-sm font-semibold">{item.title}</div>
              {item.notes ? <div className="text-xs text-slate-400">{item.notes}</div> : null}
              {typeof item.similarity === 'number' ? (
                <div className="mt-2 text-xs text-slate-400">
                  {copy.scoreLabel}: {(item.similarity * 100).toFixed(0)}%
                </div>
              ) : null}
            </Link>
          )) : !loading ? <div className="text-sm text-slate-500">{copy.empty}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
