'use client';

// Auth invariant: use the environment-appropriate Supabase client to avoid PKCE state mismatches.

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { getNativeSupabase } from '@/lib/supabase';
import {
  bridgeSessionToCookies,
  clearNativeBridgeAttempted,
  getNativeBridgeAttempted,
  setNativeBridgeAttempted
} from '@/lib/auth/nativeGoogleSupabase';

export default function AuthRedirect({ next }: { next: string }) {
  const router = useRouter();
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();

      if (isNative && platform === 'android') {
        const attempted = await getNativeBridgeAttempted();
        if (attempted) {
          if (active) {
            setBridgeError('Native session bridge already attempted. Please retry login.');
          }
          return;
        }

        const nativeSupabase = getNativeSupabase();
        const { data } = await nativeSupabase.auth.getSession();
        const session = data?.session;
        if (!session) {
          return;
        }

        await setNativeBridgeAttempted();
        try {
          await bridgeSessionToCookies(session);
          await clearNativeBridgeAttempted();
          if (active) {
            router.replace(next);
          }
        } catch (error) {
          if (active) {
            setBridgeError(error instanceof Error ? error.message : 'Native session bridge failed.');
          }
        }
        return;
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (active && data.user) {
        router.replace(next);
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [next, router]);

  if (!bridgeError) return null;

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {bridgeError}
    </div>
  );
}
