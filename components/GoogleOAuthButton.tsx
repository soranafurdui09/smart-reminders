'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { createBrowserClient } from '@/lib/supabase/client';

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
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);
  const [isAndroidWebView, setIsAndroidWebView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNativeAndroid(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
    const userAgent = navigator.userAgent || '';
    const webViewHint = userAgent.includes('SmartReminderWebView') || (userAgent.includes('Android') && userAgent.includes('wv'));
    setIsAndroidWebView(webViewHint);
  }, []);

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      const { protocol, hostname, port } = window.location;
      const safeHost = hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
        ? 'localhost'
        : hostname;
      const origin = `${protocol}//${safeHost}${port ? `:${port}` : ''}`;
      const useCustomScheme = isNativeAndroid || isAndroidWebView;
      const redirectTo = useCustomScheme
        ? `com.smartreminder.app://auth/callback?next=${encodeURIComponent(next)}`
        : `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const supabase = createBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: useCustomScheme
        }
      });
      if (signInError) {
        const message = signInError.message?.toLowerCase() ?? '';
        setError(message.includes('provider') || message.includes('oauth') ? errorNotConfigured : errorGeneric);
        setPending(false);
        return;
      }
      if (data?.url) {
        if (isNativeAndroid) {
          await Browser.open({ url: data.url });
        } else if (isAndroidWebView) {
          window.location.assign(data.url);
        } else {
          window.location.assign(data.url);
        }
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
