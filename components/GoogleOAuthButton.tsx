'use client';

// OAuth invariant: native Android uses native Google Sign-In + server session cookies.
// Web uses standard Supabase OAuth PKCE redirects.

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getBrowserClient } from '@/lib/supabase/client';
import { nativeGoogleSignIn } from '@/lib/auth/nativeGoogle';

const DEFAULT_NEXT = '/app';

const normalizeNext = (value?: string) => {
  if (!value) return DEFAULT_NEXT;
  return value.startsWith('/') ? value : DEFAULT_NEXT;
};

const logWebStorageState = (label: string) => {
  if (typeof window === 'undefined') return;
  try {
    const lsKeys = Object.keys(localStorage).filter((k) => /sb-|supabase|pkce|oauth/i.test(k));
    const lsInfo = lsKeys.map((k) => ({ k, len: (localStorage.getItem(k) || '').length }));
    const codeVerifierKeys = Object.keys(localStorage).filter((k) => /code-verifier/i.test(k));
    const codeVerifierInfo = codeVerifierKeys.map((k) => ({ k, len: (localStorage.getItem(k) || '').length }));
    const codeVerifierPresent = codeVerifierKeys.length > 0;
    const cookieNames = document.cookie
      .split(';')
      .map((c) => c.trim().split('=')[0])
      .filter((n) => /sb-|supabase/i.test(n));
    console.log(label, JSON.stringify({ lsInfo, codeVerifierInfo, codeVerifierPresent, cookieNames }));
  } catch (error) {
    console.warn(label, 'storage dump failed', error);
  }
};

export default function GoogleOAuthButton({
  next,
  label,
  loading,
  errorNotConfigured,
  errorGeneric
}: {
  next: string;
  label: string;
  loading: string;
  errorNotConfigured: string;
  errorGeneric: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (pending) {
      console.log('[oauth] click ignored, pending');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { protocol, hostname, port } = window.location;
      const safeHost = hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
        ? 'localhost'
        : hostname;
      const origin = `${protocol}//${safeHost}${port ? `:${port}` : ''}`;
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const userAgent = navigator.userAgent || '';
      const webViewHint = userAgent.includes('SmartReminderWebView') || (userAgent.includes('Android') && userAgent.includes('wv'));
      const useNativeFlow = isNative && platform === 'android';
      console.log('[oauth] native=', isNative, 'platform=', platform, 'webviewHint=', webViewHint);
      if (useNativeFlow) {
        const normalizedNext = normalizeNext(next);
        let idToken: string | null = null;
        let accessToken: string | null = null;
        try {
          const tokens = await nativeGoogleSignIn();
          idToken = tokens.idToken;
          accessToken = tokens.accessToken ?? null;
        } catch (error) {
          console.warn('[native-google] signIn failed', error);
          setError(errorGeneric);
          setPending(false);
          return;
        }

        console.log('[native-google]', JSON.stringify({
          hasIdToken: Boolean(idToken),
          idTokenLen: idToken?.length ?? 0,
          hasAccessToken: Boolean(accessToken),
          accessTokenLen: accessToken?.length ?? 0,
          next: normalizedNext
        }));

        if (!idToken) {
          setError(errorGeneric);
          setPending(false);
          return;
        }

        try {
          const response = await fetch(`${origin}/auth/native-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              idToken,
              accessToken,
              next: normalizedNext
            })
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.ok) {
            setError(errorGeneric);
            setPending(false);
            return;
          }
          setPending(false);
          window.location.assign(normalizedNext);
          return;
        } catch (error) {
          console.warn('[native-google] native-session failed', error);
          setError(errorGeneric);
          setPending(false);
          return;
        }
      }

      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
      console.log('[oauth] redirectTo=', redirectTo, 'skipBrowserRedirect=', false);
      logWebStorageState('[oauth][storage] before signIn');
      const supabase = getBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false
        }
      });
      logWebStorageState('[oauth][storage] after signIn');
      if (signInError) {
        const message = signInError.message?.toLowerCase() ?? '';
        setError(message.includes('provider') || message.includes('oauth') ? errorNotConfigured : errorGeneric);
        setPending(false);
        return;
      }
      if (data?.url) {
        console.log('[oauth] auth url=', data.url);
        window.location.assign(data.url);
      } else {
        setError(errorGeneric);
        setPending(false);
      }
    } catch (err) {
      console.error('[auth] signInWithOAuth exception', err);
      setError(errorGeneric);
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <button className="btn btn-secondary w-full" type="button" onClick={handleClick} disabled={pending}>
        {pending ? loading : label}
      </button>
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
