import { cookies } from 'next/headers';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import type { Database } from './types';
import { getEnvStatus, getRequiredEnv, getSupabaseServerUrl, getSupabaseStorageKey } from '@/lib/env';

export function createServerClient() {
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
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Parameters<typeof cookieStore.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          cookieStore.set({ name, value, ...cookieOptions });
        },
        remove(name: string, options: Parameters<typeof cookieStore.set>[0]) {
          const cookieOptions = typeof options === 'object' && options ? options : {};
          cookieStore.set({ name, value: '', ...cookieOptions, maxAge: 0 });
        }
      }
    }
  );
}
