'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from '@/lib/supabase';

export default function MagicLinkForm({
  next,
  className,
  copy
}: {
  next: string;
  className?: string;
  copy: {
    placeholder: string;
    sending: string;
    button: string;
    invalidEmail: string;
    emailSent: string;
    failedSend: string;
    errorGeneric: string;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isNativeAndroid, setIsNativeAndroid] = useState(false);
  const [isAndroidWebView, setIsAndroidWebView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsNativeAndroid(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
    const userAgent = navigator.userAgent || '';
    const webViewHint = userAgent.includes('SmartReminderWebView') || (userAgent.includes('Android') && userAgent.includes('wv'));
    setIsAndroidWebView(webViewHint);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSent(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') || '').trim();
    if (!email) {
      setError(copy.invalidEmail);
      return;
    }

    setPending(true);
    try {
      const { protocol, hostname, port } = window.location;
      const safeHost = hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
        ? 'localhost'
        : hostname;
      const origin = `${protocol}//${safeHost}${port ? `:${port}` : ''}`;
      const useCustomScheme = isNativeAndroid || isAndroidWebView;
      const emailRedirectTo = useCustomScheme
        ? `com.smartreminder.app://auth/callback?next=${encodeURIComponent(next)}`
        : `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo
        }
      });
      if (signInError) {
        console.error('[auth] signInWithOtp failed', signInError);
        setError(signInError.message || copy.errorGeneric);
        return;
      }
      setSent(true);
    } catch (err) {
      console.error('[auth] signInWithOtp exception', err);
      setError(copy.failedSend);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`${className ?? ''} space-y-4`}>
      <input className="input" name="email" type="email" placeholder={copy.placeholder} required />
      {sent ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {copy.emailSent}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <button className="btn btn-primary w-full" type="submit" disabled={pending}>
        {pending ? copy.sending : copy.button}
      </button>
    </form>
  );
}
