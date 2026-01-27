"use client";

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/browserClient';

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
      const native = url.searchParams.get('native');
      const hasCode = Boolean(code);

      console.log('[auth/callback] page', JSON.stringify({
        hasCode,
        codeLen: code?.length ?? 0,
        native,
        next
      }));
      logStorageState('[auth/callback][storage] before exchange');

      if (!code) {
        setStatus('Lipsește codul de autentificare.');
        window.location.replace('/auth?error=callback-missing-code');
        return;
      }

      const supabase = getBrowserClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.warn('[auth/callback] exchangeCodeForSession failed', error);
        setStatus('Autentificarea a eșuat.');
        window.location.replace('/auth?error=callback-failed');
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data?.session ?? null;
      const hasSession = Boolean(session?.access_token && session?.refresh_token);
      console.log('[auth/callback] session', JSON.stringify({ hasSession }));

      if (native === '1' && hasSession) {
        const deepLink = new URL('com.smartreminder.app://auth/callback');
        deepLink.searchParams.set('access_token', session!.access_token);
        deepLink.searchParams.set('refresh_token', session!.refresh_token);
        deepLink.searchParams.set('next', next);
        deepLink.searchParams.set('native', '1');
        window.location.replace(deepLink.toString());
        return;
      }

      window.location.replace(next);
    };

    void run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm">
        {status}
      </div>
    </div>
  );
}
