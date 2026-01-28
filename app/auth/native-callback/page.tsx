"use client";

import { useEffect, useState } from 'react';
import { listSbCookieNames } from '@/lib/auth/oauthDebug';

type DebugSummary = {
  hasCode: boolean;
  codeLen: number;
  hasState: boolean;
  stateLen: number;
  paramKeys: string[];
  error: string | null;
  errorDesc: string | null;
  next: string | null;
};

type DebugPayload = {
  summary: DebugSummary;
  cookieNames: string[];
  localStorageKeys: string[];
};

const DEFAULT_NEXT = '/app';

const normalizeNext = (value?: string | null) => {
  if (!value) return DEFAULT_NEXT;
  return value.startsWith('/') ? value : DEFAULT_NEXT;
};

export default function AuthNativeCallbackPage() {
  const [status, setStatus] = useState('Procesăm autentificarea...');
  const [debugPayload, setDebugPayload] = useState<DebugPayload | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [showOpenApp, setShowOpenApp] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const code = params.get('code')?.replace(/#$/, '');
    const state = params.get('state');
    const error = params.get('error');
    const errorDesc = params.get('error_description');
    const rawNext = params.get('next') ?? DEFAULT_NEXT;
    const next = normalizeNext(rawNext);
    const paramKeys = Array.from(params.keys());
    const summary: DebugSummary = {
      hasCode: Boolean(code),
      codeLen: code?.length ?? 0,
      hasState: Boolean(state),
      stateLen: state?.length ?? 0,
      paramKeys,
      error,
      errorDesc,
      next
    };
    const cookieNames = listSbCookieNames();
    const localStorageKeys = Object.keys(localStorage).filter((key) =>
      /sb-|supabase|pkce|oauth|code-verifier/i.test(key)
    );
    const payload: DebugPayload = { summary, cookieNames, localStorageKeys };
    setDebugPayload(payload);

    if (error) {
      setStatus(`Eroare autentificare: ${error}`);
      return;
    }
    if (!code || !state) {
      setStatus('Lipsește codul sau starea OAuth.');
      return;
    }

    const link = `com.smartreminder.app://auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&next=${encodeURIComponent(next)}`;
    setDeepLink(link);
    setStatus('Redirecționăm către aplicație…');
    window.location.replace(link);
    const timer = window.setTimeout(() => {
      setShowOpenApp(true);
    }, 800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="max-w-md space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm">
        <div>{status}</div>
        {debugPayload ? (
          <div className="space-y-2 text-left text-xs">
            <div className="font-semibold text-white/80">Debug</div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px]">
              {JSON.stringify(debugPayload, null, 2)}
            </pre>
            <button
              type="button"
              className="w-full rounded-lg bg-white/10 px-4 py-2 text-xs text-white"
              onClick={() => {
                const payload = JSON.stringify(debugPayload, null, 2);
                void navigator.clipboard?.writeText(payload);
              }}
            >
              Copy debug JSON
            </button>
          </div>
        ) : null}
        {showOpenApp && deepLink ? (
          <button
            type="button"
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
            onClick={() => window.location.assign(deepLink)}
          >
            Open app
          </button>
        ) : null}
      </div>
    </div>
  );
}
