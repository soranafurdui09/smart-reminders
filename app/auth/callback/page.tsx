"use client";

// OAuth invariant: native Android must use the browser client in the WebView for PKCE.
// This web callback only handles browser redirects and must not deep-link tokens.

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
  const [showOpenApp, setShowOpenApp] = useState(false);
  const [openAppUrl, setOpenAppUrl] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next') ?? '/app';
      const native = url.searchParams.get('native');
      const summary = summarizeUrl(window.location.href);
      const hasCode = Boolean(code);

      console.log('[callback]', JSON.stringify({
        hasCode,
        codeLen: code?.length ?? 0,
        native,
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

      console.log('[auth/callback] client=web');
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code.replace(/#$/, ''));
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

      if (native === '1') {
        const deepLink = `com.smartreminder.app://auth/complete?next=${encodeURIComponent(next)}`;
        setOpenAppUrl(deepLink);
        window.location.replace(deepLink);
        window.setTimeout(() => {
          setShowOpenApp(true);
        }, 600);
        return;
      }

      window.location.replace(next);
    };

    void run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="max-w-sm space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm">
        <div>{status}</div>
        {showOpenApp && openAppUrl ? (
          <button
            type="button"
            className="w-full rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
            onClick={() => window.location.assign(openAppUrl)}
          >
            Deschide aplicația
          </button>
        ) : null}
      </div>
    </div>
  );
}
