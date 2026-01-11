'use client';

import { useState } from 'react';
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

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      const { protocol, hostname, port } = window.location;
      const safeHost = hostname === '0.0.0.0' || hostname === '::' || hostname === '[::]'
        ? 'localhost'
        : hostname;
      const origin = `${protocol}//${safeHost}${port ? `:${port}` : ''}`;
      const supabase = createBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
      });
      if (signInError) {
        const message = signInError.message?.toLowerCase() ?? '';
        setError(message.includes('provider') || message.includes('oauth') ? errorNotConfigured : errorGeneric);
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
