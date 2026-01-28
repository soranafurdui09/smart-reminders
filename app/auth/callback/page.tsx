"use client";

// OAuth invariant: native Android must use the Preferences-backed client for PKCE.
// This web callback only handles browser redirects and must not deep-link tokens.

import { useEffect, useState } from 'react';
import { getWebSupabase } from '@/lib/supabase/web';

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

  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const next = url.searchParams.get('next') ?? '/app';
      const hasCode = Boolean(code);

      console.log('[auth/callback] page', JSON.stringify({
        hasCode,
        codeLen: code?.length ?? 0,
        next
      }));
      logStorageState('[auth/callback][storage] before exchange');

      if (!code) {
        setStatus('Lipsește codul de autentificare.');
        window.location.replace('/auth?error=callback-missing-code');
        return;
      }

      console.log('[auth/callback] client=web');
      const supabase = getWebSupabase();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn('[auth/callback] exchangeCodeForSession failed', error);
        setStatus('Autentificarea a eșuat.');
        window.location.replace('/auth?error=callback-failed');
        return;
      }
      logStorageState('[auth/callback][storage] after exchange');

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
      </div>
    </div>
  );
}
