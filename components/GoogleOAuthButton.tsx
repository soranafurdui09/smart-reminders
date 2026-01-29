'use client';

// OAuth invariant: native Android uses native Google Sign-In + Supabase signInWithIdToken.
// Web uses standard Supabase OAuth PKCE redirects.

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getBrowserClient } from '@/lib/supabase/client';
import { nativeGoogleSupabaseSignIn, nativeGoogleSupabaseSignOut } from '@/lib/auth/nativeGoogleSupabase';

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
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const [nativeMeta, setNativeMeta] = useState<{ isNative: boolean; platform: string; hasPlugin: boolean } | null>(null);
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const hasPlugin = Capacitor.isPluginAvailable('SocialLogin');
    setNativeMeta({ isNative, platform, hasPlugin });
    setIsNativeAndroid(isNative && platform === 'android');
    if (isNative && platform === 'android') {
      console.log('[native-google] init', JSON.stringify({ isNative, platform, hasPlugin }));
    }
  }, []);

  const handleClick = async () => {
    if (pending) {
      console.log('[oauth] click ignored, pending');
      return;
    }
    setPending(true);
    setError(null);
    setNativeError(null);
    try {
      if (isNativeAndroid) {
        const normalizedNext = normalizeNext(next);
        await nativeGoogleSupabaseSignIn(normalizedNext);
        setLastSuccessAt(new Date().toISOString());
        setPending(false);
        return;
      }

      const { protocol, hostname, port } = window.location;
      const safeHost = hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
        ? 'localhost'
        : hostname;
      const origin = `${protocol}//${safeHost}${port ? `:${port}` : ''}`;
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      const userAgent = navigator.userAgent || '';
      const webViewHint = userAgent.includes('SmartReminderWebView') || (userAgent.includes('Android') && userAgent.includes('wv'));
      console.log('[oauth] native=', isNative, 'platform=', platform, 'webviewHint=', webViewHint);
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
      setNativeError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  };

  const handleNativeReset = async () => {
    if (pending) return;
    setPending(true);
    setNativeError(null);
    try {
      await nativeGoogleSupabaseSignOut();
      setPending(false);
    } catch (error) {
      setNativeError(error instanceof Error ? error.message : String(error));
      setPending(false);
    }
  };

  const pluginMissing = isNativeAndroid && nativeMeta && !nativeMeta.hasPlugin;

  return (
    <div className="space-y-3">
      <button
        className="btn btn-secondary w-full"
        type="button"
        onClick={handleClick}
        disabled={pending || Boolean(pluginMissing)}
      >
        {pending ? loading : isNativeAndroid ? 'Continue with Google (Native)' : label}
      </button>
      {isNativeAndroid ? (
        <button className="btn btn-outline w-full" type="button" onClick={handleNativeReset} disabled={pending}>
          Reset Google session
        </button>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {pluginMissing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Native Google plugin missing. Did you run: npx cap sync android ?
        </div>
      ) : null}
      {nativeError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {nativeError}
        </div>
      ) : null}
      {process.env.NODE_ENV === 'development' && isNativeAndroid ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <div className="font-semibold">Native Google debug</div>
          <pre className="mt-2 whitespace-pre-wrap">
            {JSON.stringify(
              {
                isNative: nativeMeta?.isNative ?? false,
                platform: nativeMeta?.platform ?? 'unknown',
                hasPlugin: nativeMeta?.hasPlugin ?? false,
                lastError: nativeError,
                lastSuccessAt
              },
              null,
              2
            )}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
