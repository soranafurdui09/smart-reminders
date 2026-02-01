 'use client';

import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';

const DEV = process.env.NODE_ENV !== 'production';

function nowTs() {
  return new Date().toISOString();
}

export default function AuthStateDebug() {
  useEffect(() => {
    if (!DEV) return;
    let active = true;
    const supabase = getSupabaseClient();
    const logSession = async (label: string) => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const hasSession = Boolean(data?.session?.access_token);
      console.log('[auth-debug]', JSON.stringify({ ts: nowTs(), label, hasSession }));
    };
    void logSession('mount');
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const hasSession = Boolean(session?.access_token);
      console.log('[auth-debug]', JSON.stringify({ ts: nowTs(), event, hasSession }));
    });
    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return null;
}
