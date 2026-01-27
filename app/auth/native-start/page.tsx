"use client";

import { useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

export default function AuthNativeStartPage({
  searchParams
}: {
  searchParams?: { next?: string };
}) {
  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const next = url.searchParams.get('next') ?? '/app';
      const origin = url.origin;
      const redirectTo = `${origin}/auth/callback?native=1&next=${encodeURIComponent(next)}`;
      console.log('[oauth][native-start] starting', JSON.stringify({ redirectTo, next }));
      const supabase = getBrowserClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: false
        }
      });
      if (error) {
        console.warn('[oauth][native-start] signInWithOAuth failed', error);
        window.location.replace(`/auth?error=oauth-start&next=${encodeURIComponent(next)}`);
        return;
      }
      if (data?.url) {
        console.log('[oauth][native-start] redirecting to oauth url');
        window.location.assign(data.url);
      }
    };

    void run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm">
        Deschidem autentificarea…
      </div>
    </div>
  );
}
