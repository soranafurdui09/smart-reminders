'use client';

import { useCallback, useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createBrowserClient } from '@/lib/supabase/client';

export default function TimeZoneSync() {
  const synced = useRef(false);
  const lastSyncRef = useRef(0);
  const isNativeAndroid =
    typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  const COOLDOWN_MS = 10 * 60 * 1000;

  const syncTimeZone = useCallback(
    async (reason: 'mount' | 'resume') => {
      if (isNativeAndroid) {
        const now = Date.now();
        if (now - lastSyncRef.current < COOLDOWN_MS) {
          return;
        }
        lastSyncRef.current = now;
      }
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const supabase = createBrowserClient();
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        let user = sessionData.session?.user ?? null;
        if (!user) {
          const { data } = await supabase.auth.getUser();
          user = data.user ?? null;
        }
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('time_zone')
          .eq('user_id', user.id)
          .maybeSingle();
        if (profile?.time_zone === timeZone) return;
        await supabase.from('profiles').update({ time_zone: timeZone }).eq('user_id', user.id);
      } catch (error) {
        console.error('[profile] time zone sync failed', error);
      }
    },
    [isNativeAndroid]
  );

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    void syncTimeZone('mount');
  }, [syncTimeZone]);

  useEffect(() => {
    if (!isNativeAndroid) return;
    const handler = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      void syncTimeZone('resume');
    });
    return () => {
      handler.then((sub) => sub.remove());
    };
  }, [isNativeAndroid, syncTimeZone]);

  return null;
}
