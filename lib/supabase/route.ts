import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { Database } from './types';
import { getEnvStatus, getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

export function createRouteClient() {
  const envStatus = getEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }

  const cookieStore = cookies();
  return createSupabaseServerClient<Database>(
    getSupabaseServerUrl(),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey: getSupabaseStorageKey()
      },
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        }
      }
    }
  );
}
