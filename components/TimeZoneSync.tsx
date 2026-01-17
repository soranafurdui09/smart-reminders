'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function TimeZoneSync() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const supabase = createBrowserClient();

    const syncTimeZone = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
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
    };

    void syncTimeZone();
  }, []);

  return null;
}
