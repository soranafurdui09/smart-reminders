"use client";

// OAuth invariant: native Android uses native Google sign-in + signInWithIdToken.
// This web callback only handles browser redirects and must not deep-link tokens.
// Debug cookies on localhost: add &debug=1 to the callback URL.

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { listSbCookieNames, summarizeUrl } from '@/lib/auth/oauthDebug';

const logStorageState = (label: string) => {
  if (typeof window === 'undefined') return;
  try {
    const lsKeys = Object.keys(localStorage).filter((k) => /sb-|supabase|pkce|code-verifier|oauth/i.test(k));
    const lsInfo = lsKeys.map((k) => ({ k, len: (localStorage.getItem(k) || '').length }));
    console.log(label, JSON.stringify({ lsInfo }));
  } catch (error) {
    console.warn(label, 'storage dump failed', error);
  }
};

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Procesăm autentificarea...');
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [cookieDump, setCookieDump] = useState<unknown | null>(null);

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next') ?? '/app';
      const debug = url.searchParams.get('debug') === '1';
      const summary = summarizeUrl(window.location.href);
      const hasCode = Boolean(code);
      setDebugEnabled(debug);

      console.log('[callback]', JSON.stringify({
        hasCode,
        codeLen: code?.length ?? 0,
        next
      }));
      console.log('[callback][summary]', JSON.stringify(summary));
      console.log('[callback][cookies]', JSON.stringify(listSbCookieNames()));
      logStorageState('[auth/callback][storage] before exchange');

      if (!code) {
        setStatus('Lipsește codul de autentificare.');
        window.location.replace('/auth?error=callback-missing-code');
        return;
      }

      const fetchCookieDump = async () => {
        if (!debug) return;
        try {
          const isLocalhost = window.location.hostname.startsWith('localhost');
          const response = await fetch('/api/debug/cookies?debug=1', {
            cache: 'no-store',
            headers: isLocalhost ? {} : {}
          });
          if (!response.ok) {
            setCookieDump({ ok: false, status: response.status });
            return;
          }
          const json = await response.json();
          setCookieDump(json);
        } catch (error) {
          setCookieDump({ ok: false, error: error instanceof Error ? error.message : String(error) });
        }
      };

      console.log('[auth/callback] client=web');
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code.replace(/#$/, ''));
      await fetchCookieDump();
      if (error) {
        console.warn('[auth/callback] exchangeCodeForSession failed', error);
        setStatus('Autentificarea a eșuat.');
        window.location.replace('/auth?error=callback-failed');
        return;
      }
      logStorageState('[auth/callback][storage] after exchange');
      console.log('[callback][cookies][after]', JSON.stringify(listSbCookieNames()));

      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;
      const hasSession = Boolean(session?.access_token && session?.refresh_token);
      console.log('[auth/callback] session', JSON.stringify({ hasSession }));

      window.location.replace(next);
    };

    void run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="max-w-sm space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm">
        <div>{status}</div>
        {debugEnabled ? (
          <div className="space-y-2 text-left text-xs">
            <div className="font-semibold text-white/80">Debug cookies</div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px]">
              {JSON.stringify(cookieDump ?? { ok: false, status: 'loading' }, null, 2)}
            </pre>
            <button
              type="button"
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-xs text-white"
              onClick={() => {
                const payload = JSON.stringify(cookieDump ?? {}, null, 2);
                void navigator.clipboard?.writeText(payload);
              }}
            >
              Copy
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
