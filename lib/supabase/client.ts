import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { getPublicEnvStatus, getRequiredPublicEnv, getSupabaseStorageKey } from '@/lib/env';

export function createBrowserClient() {
  const envStatus = getPublicEnvStatus();
  if (!envStatus.ok) {
    throw new Error(`Missing env vars: ${envStatus.missing.join(', ')}`);
  }

  return createSupabaseBrowserClient<Database>(
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        storageKey: getSupabaseStorageKey()
      }
    }
  );
}
