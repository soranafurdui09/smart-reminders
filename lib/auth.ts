import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from './supabase/server';

const requireUserCached = cache(async (nextPath?: string) => {
  const supabase = createServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[auth] requireUser redirect', JSON.stringify({
        ts: new Date().toISOString(),
        nextPath: nextPath ?? null
      }));
    }
    const redirectTo = nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : '/auth';
    redirect(redirectTo);
  }
  return data.user;
});

export const requireUser = requireUserCached;
